import time
import logging
from typing import Dict, Any, Optional
from gateways import get_gateway_adapter
from gateways.base import GatewayResponse
from cache.idempotency import acquire_idempotency_lock, release_idempotency_lock
from monitoring.metrics import metrics
from .fallback_agent import FallbackAgent

logger = logging.getLogger("switchrouteiq.agent.execution")

class ExecutionAgent:
    """
    AGENT 4 — Intelligent Routing & Safe Fallback Agent
    Executes payment over the validated Primary Route, monitors response,
    detects timeouts or failures, enforces duplicate-debit protection,
    and seamlessly triggers safe fallback if required.
    """
    def __init__(self):
        self.agent_id = 4
        self.name = "Intelligent Routing & Safe Fallback Agent"
        self.verb = "EXECUTING"
        self.fallback_coordinator = FallbackAgent()

    def execute_and_fallback(
        self,
        primary_gw: str,
        fallback_gw: str,
        transaction_context: Dict[str, Any],
        simulate_behavior: Optional[str] = None
    ) -> Dict[str, Any]:
        metrics.inc_agent_execution("agent_4_execution")
        idempotency_key = transaction_context.get("idempotency_key", f"idemp_{int(time.time()*1000)}")

        # Concurrency Lock Check
        if not acquire_idempotency_lock(idempotency_key, ttl=30):
            metrics.inc_duplicate_prevented()
            return {
                "final_status": "DUPLICATE_PREVENTED",
                "final_gateway": primary_gw,
                "latency_ms": 10,
                "fallback_triggered": False,
                "fallback_reason": None,
                "message": "Duplicate concurrent request blocked by idempotency lock.",
                "details": {}
            }

        try:
            # Step 1: Execute payment via Primary Gateway adapter
            primary_adapter = get_gateway_adapter(primary_gw)
            primary_resp: GatewayResponse = primary_adapter.process_payment(
                amount=transaction_context.get("amount", 0.0),
                currency=transaction_context.get("currency", "INR"),
                payment_method=transaction_context.get("payment_method", "UPI"),
                idempotency_key=idempotency_key,
                customer_vpa=transaction_context.get("customer_vpa"),
                simulate_behavior=simulate_behavior
            )
            # Annotate gateway ID in raw response for fallback verification
            primary_resp.raw_response["gateway"] = primary_gw

            # Step 2: Primary Success
            if primary_resp.success:
                metrics.inc_success()
                return {
                    "final_status": "SUCCESS",
                    "final_gateway": primary_gw.upper(),
                    "latency_ms": primary_resp.latency_ms,
                    "fallback_triggered": False,
                    "fallback_reason": None,
                    "primary_response": primary_resp.to_dict(),
                    "fallback_response": None,
                    "message": f"Payment successfully captured via Primary Gateway {primary_gw.upper()}"
                }

            # Step 3: Primary Failed or Timed Out -> Trigger Safe Fallback
            fallback_reason = (
                f"Primary Gateway {primary_gw} timed out (GW_504)"
                if primary_resp.is_timeout
                else f"Primary Gateway {primary_gw} returned failure: {primary_resp.message}"
            )

            fb_result = self.fallback_coordinator.execute_safe_fallback(
                fallback_gw=fallback_gw,
                primary_response=primary_resp,
                transaction_context=transaction_context,
                fallback_reason=fallback_reason,
                simulate_behavior=None  # Fallback should succeed normally
            )

            return {
                "final_status": fb_result["outcome"],
                "final_gateway": fb_result.get("final_gateway"),
                "latency_ms": fb_result.get("total_latency_ms", primary_resp.latency_ms),
                "fallback_triggered": fb_result.get("fallback_triggered", True),
                "fallback_reason": fb_result.get("fallback_reason"),
                "primary_response": primary_resp.to_dict(),
                "fallback_response": fb_result.get("response"),
                "duplicate_prevented": fb_result.get("duplicate_prevented", False),
                "message": fb_result.get("message")
            }

        finally:
            release_idempotency_lock(idempotency_key)
