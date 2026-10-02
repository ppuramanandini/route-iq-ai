from typing import Dict
from .base import BaseGatewayAdapter
from .razorpay_adapter import RazorpayAdapter
from .stripe_adapter import StripeAdapter
from .payu_adapter import PayUAdapter

_adapters: Dict[str, BaseGatewayAdapter] = {
    "A": RazorpayAdapter(),
    "B": StripeAdapter(),
    "C": PayUAdapter()
}

def get_gateway_adapter(gateway_id: str) -> BaseGatewayAdapter:
    if not isinstance(gateway_id, str):
        raise ValueError(f"Unsupported gateway ID: {gateway_id}")
    gid = gateway_id.strip().upper()
    if gid in _adapters:
        return _adapters[gid]
    raise ValueError(f"Unsupported gateway ID: {gateway_id}")
