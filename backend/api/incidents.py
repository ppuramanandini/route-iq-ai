import json
import time
import uuid
from fastapi import APIRouter
from database import get_connection
from agents.telemetry_agent import TelemetryAgent
from cache.gateway_state import invalidate_cached_gateway_state

router = APIRouter(tags=["Incidents"])

@router.get("/api/v1/incidents")
def list_incidents_v1():
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

@router.post("/api/v1/incidents/trigger")
def trigger_incident_v1():
    now = int(time.time() * 1000)
    conn = get_connection()
    c = conn.cursor()

    # Degrade Gateway A
    health = TelemetryAgent.compute_health_score(90.8, 780, 7.1, 6.1)
    c.execute("""
    UPDATE gateways
    SET health = ?, risk_level = 'HIGH', success_rate = 90.8, latency_ms = 780,
        p95_ms = 1482, p99_ms = 2418, errors_pct = 7.1, timeouts_pct = 6.1
    WHERE id = 'A'
    """, (health,))

    timeline = [
        {"ts": now, "label": "Gateway degradation detected from observed telemetry"},
        {"ts": now + 2000, "label": "Root cause diagnosed: timeout + latency anomaly (GW_504)"},
        {"ts": now + 4000, "label": "What-If Simulation: 40% shift to Gateway B selected (98.1% simulated target)"},
        {"ts": now + 6000, "label": "Guardrail PASSED · Idempotency check PASSED"},
        {"ts": now + 8000, "label": "Autonomous shift executed: 40% Gateway A traffic shifted to Gateway B"},
        {"ts": now + 12000, "label": "Recovery verified: 90.8% → 97.8% · Status RECOVERED"}
    ]

    c.execute("""
    INSERT OR REPLACE INTO incidents (id, title, detected_at, gateway, success_rate, predicted_risk, root_cause, mitigation_action, status, timeline_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "INC-2048",
        "Gateway A degradation & autonomous self-healing",
        now,
        "A",
        90.8,
        "HIGH",
        "Acquirer upstream timeout (GW_504)",
        "40% traffic shift → Gateway B",
        "IN PROGRESS",
        json.dumps(timeline)
    ))

    c.execute("""
    INSERT INTO audit_trail (id, timestamp, action, from_gw, to_gw, amount, reason, confidence, simulation_evidence, guardrail, verification, agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"AUD-{uuid.uuid4().hex[:12].upper()}",
        now,
        "Traffic shifted",
        "Gateway A",
        "Gateway B",
        "40%",
        "Observed gateway degradation (success rate dropped to 90.8%)",
        94,
        "40% shift verified to restore target SLA (98.1%)",
        "PASSED",
        "RECOVERED",
        "Audit, Incident & Continuous Learning Agent"
    ))

    conn.commit()
    conn.close()
    invalidate_cached_gateway_state("A")
    return {"status": "INCIDENT_TRIGGERED", "incident_id": "INC-2048"}
