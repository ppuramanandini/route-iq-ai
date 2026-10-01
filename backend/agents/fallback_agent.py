import time
import logging
from typing import Dict, Any, Optional
from gateways import get_gateway_adapter
from gateways.base import GatewayResponse
from cache.idempotency import acquire_idempotency_lock, release_idempotency_lock
from monitoring.metrics import metrics

logger = logging.getLogger("switchrouteiq.agent.fallback")

class FallbackAgent:
    """
    Sub-component of Agent 4:
    Executes Safe Fallback with strict duplicate-debit protection.
    Verifies that the primary timeout/failure did not charge the customer
    before dispatching to the fallback gateway.
    """
    def __init__(self):
        self.name = "Safe Fallback Coordinator"

    def execute_safe_fallback(
        self,
        fallback_gw: str,
        primary_response: GatewayResponse,
        transaction_context: Dict[str, Any],
        fallback_reason: str,
        simulate_behavior: Optional[str] = None
    ) -> Dict[str, Any]:
        metrics.inc_fallback()
        idempotency_key = transaction_context.get("idempotency_key", f"idemp_{int(time.time()*1000)}")
        primary_gw = primary_response.raw_response.get("gateway", "A")

        # 1. Verify primary state to prevent duplicate debit
        primary_adapter = get_gateway_adapter(primary_gw)
        verification = primary_adapter.verify_payment_state(
            gateway_tx_id=primary_response.gateway_tx_id,
            idempotency_key=idempotency_key
        )

        if not verification.get("can_safely_fallback", False) or verification.get("charged", False):
            # Duplicate debit hazard detected! Abort fallback immediately
            metrics.inc_duplicate_prevented()
            return {
                "outcome": "SAFE_FAILURE",
                "final_gateway": None,
                "fallback_triggered": True,
                "fallback_reason": fallback_reason,
                "duplicate_prevented": True,
                "message": "Fallback aborted: Primary gateway reported indeterminate state. Double debit prevented.",
                "verification": verification,
                "latency_ms": primary_response.latency_ms
            }

        # 2. Acquire lock for fallback path
        fallback_lock_key = f"fb_{idempotency_key}"
        if not acquire_idempotency_lock(fallback_lock_key, ttl=15):
            metrics.inc_duplicate_prevented()
            return {
                "outcome": "SAFE_FAILURE",
                "final_gateway": None,
                "fallback_triggered": True,
                "fallback_reason": fallback_reason,
                "duplicate_prevented": True,
                "message": "Fallback execution lock collision. Retrying avoided.",
                "latency_ms": primary_response.latency_ms
            }

        try:
            # 3. Execute Fallback Gateway
            fb_adapter = get_gateway_adapter(fallback_gw)
            fb_response = fb_adapter.process_payment(
                amount=transaction_context.get("amount", 0.0),
                currency=transaction_context.get("currency", "INR"),
                payment_method=transaction_context.get("payment_method", "UPI"),
                idempotency_key=f"{idempotency_key}_fb",
                customer_vpa=transaction_context.get("customer_vpa"),
                simulate_behavior=simulate_behavior
            )

            total_latency = primary_response.latency_ms + fb_response.latency_ms

            if fb_response.success:
                metrics.inc_success()
                return {
                    "outcome": "FALLBACK_SUCCESS",
                    "final_gateway": fallback_gw.upper(),
                    "fallback_triggered": True,
                    "fallback_reason": fallback_reason,
                    "response": fb_response.to_dict(),
                    "total_latency_ms": total_latency,
                    "duplicate_prevented": False,
                    "message": f"Autonomous Fallback executed successfully via Gateway {fallback_gw.upper()}"
                }
            else:
                metrics.inc_failures()
                return {
                    "outcome": "SAFE_FAILURE",
                    "final_gateway": None,
                    "fallback_triggered": True,
                    "fallback_reason": f"{fallback_reason} -> Fallback also failed: {fb_response.message}",
                    "response": fb_response.to_dict(),
                    "total_latency_ms": total_latency,
                    "duplicate_prevented": False,
                    "message": "Primary and Fallback routes both failed."
                }
        finally:
            release_idempotency_lock(fallback_lock_key)
