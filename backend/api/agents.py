from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(tags=["Agents"])

def get_five_agents_definition() -> List[Dict[str, Any]]:
    return [
        {
            "id": 1,
            "key": "telemetry",
            "name": "Gateway Health & Telemetry Agent",
            "verb": "OBSERVING",
            "purpose": "Monitor connected payment gateways/PSPs in real-time, aggregating success rate, p95 latency, timeouts, errors, and availability.",
            "status": "running",
            "confidence": 99,
            "output": "Streaming 3 gateway telemetry streams · ~1,842 events/s ingested with clock skew < 4ms",
            "evidence": [
                "Gateway A: 98.4% success · 180ms p50",
                "Gateway B: 98.7% success · 182ms p50",
                "Gateway C: 96.1% success · 310ms p50"
            ],
            "action": "Publish live health matrix frames",
            "inputs": ["Transactions", "Latency", "Errors", "Timeouts", "Capacity", "Throughput"]
        },
        {
            "id": 2,
            "key": "selection",
            "name": "Route Eligibility & Selection Agent",
            "verb": "SELECTING",
            "purpose": "Evaluate transaction context, merchant eligibility, payment rail, SLA, cost, and routing rules to select Primary and Fallback routes.",
            "status": "running",
            "confidence": 96,
            "output": "Deterministic routing active: Primary Gateway A (highest score) · Fallback Gateway B selected",
            "evidence": [
                "Primary Gateway A score 98.2 / 100",
                "Fallback Gateway B score 97.9 / 100",
                "Merchant SLA 500ms compliant"
            ],
            "action": "Emit route candidate pair",
            "inputs": ["Transaction context", "Health matrix", "Merchant SLA", "Payment rail", "Cost model", "Learned rules"]
        },
        {
            "id": 3,
            "key": "validation",
            "name": "Zero-Trust Route Validation Agent",
            "verb": "VALIDATING",
            "purpose": "Independently validate candidate routes against SLA, policy guardrails, duplicate-debit hazard, and active incidents. Emits PASS or REVISE.",
            "status": "running",
            "confidence": 100,
            "output": "Zero-trust policy verified: Primary Gateway A PASS · SLA 500ms PASSED · Idempotency check PASSED",
            "evidence": [
                "SLA latency check < 500ms limit",
                "Minimum health > 90% threshold",
                "Zero double-debit exposure confirmed",
                "1-time revision feedback loop armed"
            ],
            "action": "Approve execution pipeline",
            "inputs": ["Primary candidate", "Fallback candidate", "SLA limits", "Idempotency store", "Active incidents"]
        },
        {
            "id": 4,
            "key": "execution",
            "name": "Intelligent Routing & Safe Fallback Agent",
            "verb": "EXECUTING",
            "purpose": "Execute primary payment, monitor response, detect timeouts or errors, verify state, and coordinate autonomous safe fallback.",
            "status": "running",
            "confidence": 98,
            "output": "Payment execution engine nominal · Safe fallback coordinator ready with 0 duplicate debits",
            "evidence": [
                "Primary adapter ready",
                "Safe fallback state verifier armed",
                "Idempotency lock active (TTL 30s)"
            ],
            "action": "Execute and monitor transaction",
            "inputs": ["Validated primary route", "Validated fallback route", "Timeout detector", "State verifier"]
        },
        {
            "id": 5,
            "key": "audit",
            "name": "Audit, Incident & Continuous Learning Agent",
            "verb": "AUDITING & LEARNING",
            "purpose": "Persist immutable audit logs, record routing history, manage incident lifecycles, and refine routing rules via historical analysis without ML.",
            "status": "running",
            "confidence": 99,
            "output": "Audit ledger immutable · Continuous rule refinement active on recent routing history",
            "evidence": [
                "Audit trail synchronized",
                "Continuous rule analysis: 0 penalties active",
                "Historical routing data updating live"
            ],
            "action": "Commit audit and update routing rules",
            "inputs": ["Transaction outcomes", "Routing history", "Audit records", "Incident events", "Rule refinement engine"]
        }
    ]

@router.get("/api/v1/agents")
def get_agents_v1():
    return get_five_agents_definition()

@router.get("/api/agents")
def get_agents_legacy():
    return get_five_agents_definition()
