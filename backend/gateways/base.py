from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class GatewayResponse:
    def __init__(
        self,
        success: bool,
        status_code: str,
        latency_ms: int,
        gateway_tx_id: str,
        message: str,
        raw_response: Optional[Dict[str, Any]] = None,
        is_timeout: bool = False,
        is_hard_failure: bool = False
    ):
        self.success = success
        self.status_code = status_code
        self.latency_ms = latency_ms
        self.gateway_tx_id = gateway_tx_id
        self.message = message
        self.raw_response = raw_response or {}
        self.is_timeout = is_timeout
        self.is_hard_failure = is_hard_failure

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status_code": self.status_code,
            "latency_ms": self.latency_ms,
            "gateway_tx_id": self.gateway_tx_id,
            "message": self.message,
            "is_timeout": self.is_timeout,
            "is_hard_failure": self.is_hard_failure
        }


class BaseGatewayAdapter(ABC):
    def __init__(self, gateway_id: str, name: str, processor: str):
        self.gateway_id = gateway_id
        self.name = name
        self.processor = processor

    @abstractmethod
    def process_payment(
        self,
        amount: float,
        currency: str,
        payment_method: str,
        idempotency_key: str,
        customer_vpa: Optional[str] = None,
        simulate_behavior: Optional[str] = None
    ) -> GatewayResponse:
        """
        Execute payment transaction through the gateway adapter.
        """
        pass

    @abstractmethod
    def verify_payment_state(self, gateway_tx_id: str, idempotency_key: str) -> Dict[str, Any]:
        """
        Query gateway to verify if transaction reached the processor
        to guarantee duplicate-debit protection before safe fallback.
        """
        pass
