from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from agents.orchestrator import orchestrator

router = APIRouter(prefix="/api/v1/orchestrator", tags=["Orchestrator"])

class RoutePaymentV1Request(BaseModel):
    merchant_id: str
    amount: float
    currency: str = "INR"
    payment_method: str = "UPI"
    idempotency_key: str
    customer_vpa: Optional[str] = None
    simulate_behavior: Optional[str] = None  # e.g. "a_timeout", "a_fail" for testing

@router.post("/route")
def route_payment_v1(req: RoutePaymentV1Request):
    """
    Executes the exact 5-agent payment routing and safe fallback pipeline:
    Agent 1 -> Agent 2 -> Agent 3 -> (Agent 2 Revision if REVISE) -> Agent 4 -> Agent 5
    """
    result = orchestrator.route_payment(
        payment_request=req.model_dump(),
        simulate_behavior=req.simulate_behavior
    )
    return result
