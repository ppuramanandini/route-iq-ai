import time
import random
from typing import Dict, Any, Optional
from .base import BaseGatewayAdapter, GatewayResponse

class MockGatewayAdapter(BaseGatewayAdapter):
    def __init__(
        self,
        gateway_id: str,
        name: str,
        processor: str,
        baseline_latency: int = 180,
        baseline_success_rate: float = 98.5
    ):
        super().__init__(gateway_id, name, processor)
        self.baseline_latency = baseline_latency
        self.baseline_success_rate = baseline_success_rate

    def process_payment(
        self,
        amount: float,
        currency: str,
        payment_method: str,
        idempotency_key: str,
        customer_vpa: Optional[str] = None,
        simulate_behavior: Optional[str] = None
    ) -> GatewayResponse:
        # Check simulation overrides
        gw_prefix = self.gateway_id.lower()
        if simulate_behavior == f"{gw_prefix}_timeout" or simulate_behavior == "timeout":
            # Primary timeout scenario
            return GatewayResponse(
                success=False,
                status_code="GW_504_GATEWAY_TIMEOUT",
                latency_ms=self.baseline_latency + 600,
                gateway_tx_id=f"sim_{gw_prefix}_to_{int(time.time()*1000)}",
                message=f"{self.name} upstream response timeout after SLA breach",
                is_timeout=True,
                is_hard_failure=False
            )

        if simulate_behavior == f"{gw_prefix}_fail" or simulate_behavior == "fail":
            return GatewayResponse(
                success=False,
                status_code="GW_502_BAD_GATEWAY",
                latency_ms=self.baseline_latency + 150,
                gateway_tx_id=f"sim_{gw_prefix}_err_{int(time.time()*1000)}",
                message=f"{self.name} downstream processor error (connection reset)",
                is_timeout=False,
                is_hard_failure=True
            )

        # Realistic normal jitter
        jitter = random.randint(-15, 25)
        latency = max(50, self.baseline_latency + jitter)
        gw_tx_id = f"{gw_prefix}_ch_{int(time.time())}_{random.randint(1000, 9999)}"

        return GatewayResponse(
            success=True,
            status_code="PAYMENT_CAPTURED_200",
            latency_ms=latency,
            gateway_tx_id=gw_tx_id,
            message=f"Transaction authorized and settled via {self.name}",
            raw_response={
                "acquirer": self.processor,
                "amount": amount,
                "currency": currency,
                "method": payment_method,
                "idempotency_key": idempotency_key,
                "settlement_status": "captured"
            }
        )

    def verify_payment_state(self, gateway_tx_id: str, idempotency_key: str) -> Dict[str, Any]:
        """
        Verify transaction state at issuer/gateway before executing fallback.
        Ensures customer was not charged before fallback is triggered.
        """
        # In sandbox, verified that timeout did not produce a debit
        return {
            "gateway_tx_id": gateway_tx_id,
            "status": "VOIDED_UNCONFIRMED",
            "charged": False,
            "can_safely_fallback": True,
            "verification_evidence": f"Issuer ledger confirmed 0 charge for key {idempotency_key}"
        }
