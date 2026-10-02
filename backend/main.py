import time
import math
import json
import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_connection, init_db
from monitoring.metrics import metrics
from agents.orchestrator import orchestrator
from api.orchestrator_router import router as orchestrator_router
from api.gateways import router as gateways_router
from api.transactions import router as transactions_router
from api.agents import router as agents_router
from api.routing import router as routing_router
from api.incidents import router as incidents_router, trigger_incident_v1
from api.audit import router as audit_router
from api.analytics import router as analytics_router
from api.simulator import router as simulator_router, compute_simulation_evaluation

app = FastAPI(
    title="SwitchRouteIQ API",
    description="Autonomous Payment Routing Infrastructure Engine & Telemetry Service",
    version="1.0.0"
)

default_cors_origins = [
    f"http://{host}:{port}"
    for port in (5173, 5174, 5175)
    for host in ("localhost", "127.0.0.1")
]
cors_origins = [
    origin.strip()
    for origin in os.getenv("SWITCHROUTEIQ_CORS_ORIGINS", ",".join(default_cors_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 modular routers
app.include_router(orchestrator_router)
app.include_router(gateways_router)
app.include_router(transactions_router)
app.include_router(agents_router)
app.include_router(routing_router)
app.include_router(incidents_router)
app.include_router(audit_router)
app.include_router(analytics_router)
app.include_router(simulator_router)

@app.on_event("startup")
def on_startup():
    init_db()

# --- Pydantic Request/Response Models ---
class RoutePaymentRequest(BaseModel):
    merchant_id: str
    amount: float
    currency: str = "INR"
    payment_method: str = "UPI"
    idempotency_key: str
    customer_vpa: Optional[str] = None

class EvaluateSimulationRequest(BaseModel):
    degrade_a_pct: int = 20
    shift_b_pct: int = 40
    max_shift_guardrail: int = 40

class SettingsUpdateRequest(BaseModel):
    min_health_threshold: int
    max_traffic_shift: int
    sla_latency_limit: int
    canary_ramp: str
    rollback_window_sec: int
    auto_healing_enabled: bool
    idempotency_enabled: bool

# --- Endpoints ---

@app.get("/api/health")
def get_health():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, health, success_rate, latency_ms, risk_level FROM gateways")
    rows = c.fetchall()
    conn.close()

    gateways = [dict(r) for r in rows]
    is_degraded = any(g["risk_level"] == "HIGH" for g in gateways)

    return {
        "status": "DEGRADED · SELF-HEALING" if is_degraded else "OPERATIONAL",
        "environment": "SANDBOX",
        "timestamp": int(time.time() * 1000),
        "gateways": gateways
    }

@app.get("/api/kpis")
def get_kpis():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM gateways")
    gateways = [dict(r) for r in c.fetchall()]
    conn.close()

    total_traffic = sum(g.get("traffic_pct", 0) for g in gateways) or 100
    overall_success = round(sum(g.get("success_rate", 98) * g.get("traffic_pct", 0) for g in gateways) / total_traffic, 2)
    overall_latency = round(sum(g.get("latency_ms", 180) * g.get("traffic_pct", 0) for g in gateways) / total_traffic)
    is_degraded = any(g.get("risk_level") == "HIGH" for g in gateways)

    return {
        "overall_success_rate": overall_success,
        "routing_latency_ms": overall_latency,
        "system_state": "DEGRADED · SELF-HEALING" if is_degraded else "OPERATIONAL",
        "auto_recovered_24h": 12481,
        "duplicate_debits_prevented": 37,
        "active_route_split": {g["id"]: round(g.get("traffic_pct", 0)) for g in gateways},
        "tps": 1842
    }

@app.get("/api/gateways")
def list_gateways():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM gateways ORDER BY id ASC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/gateways/{gw_id}")
def get_gateway(gw_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM gateways WHERE id = ?", (gw_id.upper(),))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Gateway not found")
    return dict(row)

@app.get("/api/transactions")
def list_transactions(
    gateway: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=250),
    offset: int = 0
):
    conn = get_connection()
    c = conn.cursor()

    query = "SELECT * FROM transactions WHERE 1=1"
    params = []

    if gateway and gateway.upper() != "ALL":
        query += " AND gateway = ?"
        params.append(gateway.upper())

    if search:
        query += " AND (id LIKE ? OR merchant LIKE ? OR method LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.post("/api/transactions/route")
def route_transaction(req: RoutePaymentRequest):
    """
    Routes payment through the exact 5-agent architecture.
    Maintains 100% backward compatibility for existing frontend caller.
    """
    res = orchestrator.route_payment(payment_request=req.model_dump())
    selected_gw = res.get("final_gateway") or res.get("primary_gateway", "Gateway A")
    gw_success = 98.4
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT success_rate FROM gateways WHERE id = ?", (selected_gw[-1] if selected_gw else "A",))
        row = c.fetchone()
        if row:
            gw_success = float(row["success_rate"])
        conn.close()
    except Exception:
        pass

    return {
        "status": res.get("status", "ROUTED"),
        "transaction_id": res.get("transaction_id"),
        "selected_gateway": selected_gw,
        "primary_gateway": res.get("primary_gateway"),
        "fallback_gateway": res.get("fallback_gateway"),
        "final_gateway": res.get("final_gateway"),
        "final_status": res.get("final_status"),
        "processor_reference": f"Processor: {selected_gw}-sim",
        "observed_success_rate": gw_success,
        "success_rate": gw_success,
        "predicted_success_rate": gw_success,  # legacy compatibility alias
        "latency_p50_ms": res.get("latency_p50_ms", 180),
        "total_latency_ms": res.get("total_latency_ms", 180),
        "fallback_triggered": res.get("fallback_triggered", False),
        "fallback_reason": res.get("fallback_reason"),
        "routing_reason": res.get("routing_reason"),
        "trace_id": res.get("trace_id"),
        "guardrails_evaluated": res.get("guardrails_evaluated", ["SLA_500MS_PASSED", "IDEMPOTENCY_LOCKED"]),
        "agent_trace": res.get("agent_trace", []),
        "timestamp": res.get("timestamp", int(time.time() * 1000))
    }

@app.get("/metrics")
def get_prometheus_metrics():
    """Exposes Prometheus format metrics for scraper."""
    return Response(content=metrics.export_prometheus(), media_type="text/plain")

@app.get("/api/incidents")
def list_incidents():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents ORDER BY detected_at DESC")
    rows = []
    for r in c.fetchall():
        d = dict(r)
        d["timeline"] = json.loads(d["timeline_json"]) if d.get("timeline_json") else []
        rows.append(d)
    conn.close()
    return rows

@app.post("/api/incidents/trigger")
def trigger_incident():
    return trigger_incident_v1()

@app.get("/api/audit")
def list_audit():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM audit_trail ORDER BY timestamp DESC LIMIT 100")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.post("/api/simulator/evaluate")
def evaluate_simulator(req: EvaluateSimulationRequest):
    return compute_simulation_evaluation(req)

@app.get("/api/settings")
def get_settings():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM settings WHERE id = 1")
    row = c.fetchone()
    conn.close()
    if not row:
        return {
            "min_health_threshold": 92,
            "max_traffic_shift": 40,
            "sla_latency_limit": 500,
            "canary_ramp": "5% → 20% → 40%",
            "rollback_window_sec": 180,
            "auto_healing_enabled": True,
            "idempotency_enabled": True
        }
    d = dict(row)
    d["auto_healing_enabled"] = bool(d["auto_healing_enabled"])
    d["idempotency_enabled"] = bool(d["idempotency_enabled"])
    return d

@app.put("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    UPDATE settings
    SET min_health_threshold = ?, max_traffic_shift = ?, sla_latency_limit = ?, canary_ramp = ?, rollback_window_sec = ?, auto_healing_enabled = ?, idempotency_enabled = ?
    WHERE id = 1
    """, (
        req.min_health_threshold,
        req.max_traffic_shift,
        req.sla_latency_limit,
        req.canary_ramp,
        req.rollback_window_sec,
        1 if req.auto_healing_enabled else 0,
        1 if req.idempotency_enabled else 0
    ))
    conn.commit()
    conn.close()
    return {"status": "SETTINGS_SAVED"}

@app.get("/api/analytics")
def get_analytics():
    thirty_day = []
    for i in range(30):
        sin_val = math.sin(i / 3)
        thirty_day.append({
            "d": f"D{i+1}",
            "success": round(97.9 + sin_val * 0.4 + i * 0.02, 2),
            "decision_success_rate": round(98.2 + i * 0.04 + sin_val * 0.1, 1),
            "accuracy": round(98.2 + i * 0.04 + sin_val * 0.1, 1),  # legacy compatibility alias
            "recoveries": round(320 + sin_val * 80 + (260 if i % 7 == 3 else 0)),
            "decisions": round(4200 + i * 40 + sin_val * 300),
            "saved": round(18000 + i * 400 + sin_val * 2500),
            "volume": round(1400000 + i * 12000 + sin_val * 90000),
            "events": max(0, round(2 + sin_val * 2 + (3 if i % 7 == 3 else 0)))
        })
    return {"thirty_day": thirty_day}
