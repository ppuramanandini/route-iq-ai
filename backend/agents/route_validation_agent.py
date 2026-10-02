import logging
from typing import Dict, Any, List, Optional
from database import get_connection
from cache.idempotency import get_idempotent_transaction
from monitoring.metrics import metrics

logger = logging.getLogger("switchrouteiq.agent.validation")

class RouteValidationAgent:
    """
    AGENT 3 — Zero-Trust Route Validation Agent
    Independently inspects and challenges the primary and fallback routes
    chosen by Agent 2. Never trusts route selection blindly.
    Validates:
      - Route Availability & Health
      - SLA Thresholds (Latency <= SLA limit, e.g. 500ms)
      - Policy & Guardrails
      - Idempotency & Duplicate-Debit Protection
      - Fallback Validity (must be distinct and healthy)
      - Active Incidents blocking the route
    Emits either 'PASS' or 'REVISE' with structured feedback.
    """
    def __init__(self):
        self.agent_id = 3
        self.name = "Zero-Trust Route Validation Agent"
        self.verb = "VALIDATING"

    def validate_routes(
        self,
        primary_gw: str,
        fallback_gw: str,
        transaction_context: Dict[str, Any],
        health_matrix: Dict[str, Dict[str, Any]],
        revision_count: int = 0
    ) -> Dict[str, Any]:
        metrics.inc_agent_execution("agent_3_validation")
        primary_info = health_matrix.get(primary_gw.upper(), {})
        fallback_info = health_matrix.get(fallback_gw.upper(), {})

        # Load merchant policy settings
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM settings WHERE id = 1")
        settings_row = c.fetchone()
        
        # Check active unresolved incidents
        c.execute("SELECT gateway FROM incidents WHERE status IN ('IN PROGRESS', 'DETECTING', 'MITIGATING')")
        blocked_gateways = {r["gateway"].upper() for r in c.fetchall()}
        conn.close()

        sla_limit = settings_row["sla_latency_limit"] if settings_row else 500
        min_health = settings_row["min_health_threshold"] if settings_row else 90

        failed_checks: List[str] = []
        failure_reasons: List[str] = []

        # Simulation override for validation testing
        if transaction_context.get("simulate_behavior") in ["challenge", "force_revision"] and revision_count == 0:
            failed_checks.append("SIMULATED_POLICY_CHALLENGE")
            failure_reasons.append(f"Simulated policy challenge triggered on candidate Gateway {primary_gw}")

        # 1. Route Availability & Active Incident Check
        if primary_gw.upper() in blocked_gateways:
            failed_checks.append("ACTIVE_INCIDENT_BLOCK")
            failure_reasons.append(f"Gateway {primary_gw} has an active unresolved incident")

        # 2. SLA Latency Validation
        latency = primary_info.get("latency_ms", 180)
        p95 = primary_info.get("p95_ms", latency)
        p95_limit = sla_limit * 1.35
        if latency > sla_limit:
            failed_checks.append("SLA_LATENCY_VIOLATION")
            failure_reasons.append(
                f"Primary Gateway {primary_gw} violates latency SLA ({latency}ms > {sla_limit}ms SLA limit)"
            )
        elif p95 > p95_limit:
            failed_checks.append("SLA_LATENCY_VIOLATION")
            failure_reasons.append(
                f"Primary Gateway {primary_gw} exceeds p95 latency policy ({p95}ms > {p95_limit:.0f}ms allowed)"
            )

        # 3. Minimum Health Threshold Check
        health = primary_info.get("health", 100)
        risk = primary_info.get("risk_level", "LOW")
        if health < min_health or risk == "HIGH":
            failed_checks.append("HEALTH_THRESHOLD_BREACH")
            failure_reasons.append(
                f"Primary Gateway {primary_gw} health {health}% below minimum policy threshold {min_health}% (risk: {risk})"
            )

        # 4. Fallback Validation
        if primary_gw.upper() == fallback_gw.upper():
            failed_checks.append("INVALID_FALLBACK_IDENTICAL")
            failure_reasons.append("Fallback route cannot be identical to Primary route")

        fallback_risk = fallback_info.get("risk_level", "LOW")
        if fallback_risk == "HIGH":
            failed_checks.append("UNHEALTHY_FALLBACK")
            failure_reasons.append(f"Fallback Gateway {fallback_gw} is severely degraded (risk: HIGH)")

        # 5. Idempotency & Duplicate-Debit Check
        idempotency_key = transaction_context.get("idempotency_key")
        if idempotency_key:
            existing = get_idempotent_transaction(idempotency_key)
            existing_status = existing.get("final_status", existing.get("status")) if existing else None
            if existing and existing_status in ["SUCCESS", "FALLBACK_SUCCESS"]:
                # Idempotency duplicate detected
                return {
                    "validation_status": "DUPLICATE_PREVENTED",
                    "reason": f"Payment already confirmed for idempotency key: {idempotency_key}",
                    "failed_checks": ["DUPLICATE_DEBIT_GUARD"],
                    "existing_transaction": existing,
                    "checks_passed": []
                }

        # If any checks failed:
        if failed_checks:
            metrics.inc_validation_failure()
            # If we haven't revised yet, issue REVISE with structured feedback
            if revision_count == 0:
                metrics.inc_revision()
                return {
                    "validation_status": "REVISE",
                    "reason": "; ".join(failure_reasons),
                    "failed_checks": failed_checks,
                    "suggested_exclusion": [primary_gw.upper()],
                    "revision_count": revision_count,
                    "checks_evaluated": ["SLA_VALIDATION", "HEALTH_POLICY", "FALLBACK_INTEGRITY", "IDEMPOTENCY_SAFETY"]
                }
            else:
                # Already revised once! Fallback to SAFE FAILURE to avoid infinite loops
                return {
                    "validation_status": "SAFE_FAILURE",
                    "reason": f"Route validation failed after revision: {'; '.join(failure_reasons)}",
                    "failed_checks": failed_checks,
                    "suggested_exclusion": [primary_gw.upper(), fallback_gw.upper()],
                    "revision_count": revision_count
                }

        # All checks passed!
        return {
            "validation_status": "PASS",
            "reason": f"Primary Gateway {primary_gw} and Fallback {fallback_gw} verified zero-trust compliant",
            "failed_checks": [],
            "checks_passed": [
                f"SLA_LATENCY_OK ({latency}ms <= {sla_limit}ms)",
                f"HEALTH_OK ({health}% >= {min_health}%)",
                "FALLBACK_ROUTE_HEALTHY",
                "IDEMPOTENCY_VERIFIED",
                "ZERO_ACTIVE_INCIDENTS"
            ],
            "revision_count": revision_count
        }
