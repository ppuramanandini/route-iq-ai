from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from agents.route_validation_agent import RouteValidationAgent
from agents.telemetry_agent import TelemetryAgent
from agents.fallback_agent import FallbackAgent
from gateways.base import GatewayResponse
from database import get_connection

router = APIRouter(prefix="/api/v1/routing", tags=["Routing"])

class ValidateRouteRequest(BaseModel):
    primary_gateway: str
    fallback_gateway: str
    amount: float = 500.0
    idempotency_key: Optional[str] = None
    merchant_id: Optional[str] = "merch_foodapp_in"

class TriggerFallbackRequest(BaseModel):
    primary_gateway: str = "A"
    fallback_gateway: str = "B"
    amount: float = 500.0
    idempotency_key: Optional[str] = None

@router.post("/validate")
def validate_route_endpoint(req: ValidateRouteRequest):
    telemetry = TelemetryAgent()
    matrix = telemetry.get_health_matrix()
    validator = RouteValidationAgent()
    return validator.validate_routes(
        primary_gw=req.primary_gateway,
        fallback_gw=req.fallback_gateway,
        transaction_context=req.model_dump(),
        health_matrix=matrix,
        revision_count=0
    )

@router.post("/fallback")
def trigger_fallback_endpoint(req: TriggerFallbackRequest):
    coordinator = FallbackAgent()
    fake_primary_response = GatewayResponse(
        success=False,
        status_code="GW_504_TIMEOUT",
        latency_ms=750,
        gateway_tx_id=f"sim_to_{req.primary_gateway.lower()}",
        message=f"Primary gateway {req.primary_gateway} timed out",
        is_timeout=True,
        raw_response={"gateway": req.primary_gateway}
    )
    return coordinator.execute_safe_fallback(
        fallback_gw=req.fallback_gateway,
        primary_response=fake_primary_response,
        transaction_context=req.model_dump(),
        fallback_reason="Manual test trigger of safe fallback"
    )

@router.get("/rules")
def get_learned_routing_rules():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM routing_rules")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows
