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
    gid = gateway_id.upper()
    if gid in _adapters:
        return _adapters[gid]
    # Default to Razorpay adapter if unknown
    return _adapters["A"]
