import time
import json
import logging
import uuid
from typing import Dict, Any, List, Optional
from database import get_connection
from monitoring.metrics import metrics

logger = logging.getLogger("switchrouteiq.agent.audit")

class AuditAgent:
    """
    AGENT 5 — Audit, Incident & Continuous Learning Agent
    1. Records immutable audit log entries for all routing decisions,
       validations, and fallbacks.
    2. Tracks and manages incident lifecycles if degradation or failure is diagnosed.
    3. Persists historical routing data for transaction telemetry.
    4. Continuous Learning (NO ML): Performs rule & threshold analysis on recent
       routing outcomes to generate refined routing configurations (e.g. temporary
       deprioritizations or penalty adjustments) to guide future Agent 2 decisions.
    """
    def __init__(self):
        self.agent_id = 5
        self.name = "Audit, Incident & Continuous Learning Agent"
        self.verb = "AUDITING & LEARNING"

    def record_and_learn(
        self,
        transaction_id: str,
        transaction_context: Dict[str, Any],
        selection_result: Dict[str, Any],
        validation_result: Dict[str, Any],
        execution_result: Dict[str, Any],
        revision_count: int
    ) -> Dict[str, Any]:
        metrics.inc_agent_execution("agent_5_audit")
        now = int(time.time() * 1000)
        primary_gw = selection_result.get("primary_gateway", "A")
        fallback_gw = selection_result.get("fallback_gateway", "B")
        final_status = execution_result.get("final_status", "SUCCESS")
        final_gw = execution_result.get("final_gateway", primary_gw)
        latency = execution_result.get("latency_ms", 180)
        fallback_triggered = 1 if execution_result.get("fallback_triggered") else 0
        fallback_reason = execution_result.get("fallback_reason")

        conn = get_connection()
        c = conn.cursor()

        # 1. Record Routing History
        c.execute("""
        INSERT OR REPLACE INTO routing_history (
            transaction_id, primary_gateway, fallback_gateway, decision_reason,
            validation_result, revision_count, final_status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            transaction_id,
            primary_gw,
            fallback_gw,
            selection_result.get("routing_reason", "Deterministic autonomous policy"),
            validation_result.get("validation_status", "PASS"),
            revision_count,
            final_status,
            now
        ))

        # 2. Record Transaction in main transactions table
        trace_id = f"tr_{transaction_id.lower()}_{str(transaction_context.get('idempotency_key', 'id'))[:8]}"
        merchant_name = transaction_context.get("merchant_id", "foodapp_in").replace("merch_", "").capitalize()
        amount = transaction_context.get("amount", 500.0)
        method = transaction_context.get("payment_method", "UPI")

        c.execute("""
        INSERT OR REPLACE INTO transactions (
            id, timestamp, merchant, amount, method, gateway, status, latency,
            retry, risk, decision, trace_id, primary_gateway, fallback_gateway,
            final_gateway, retry_count, fallback_triggered, fallback_reason,
            idempotency_key, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            transaction_id,
            now,
            merchant_name,
            amount,
            method,
            final_gw or primary_gw,
            final_status,
            latency,
            fallback_triggered,
            "LOW" if final_status in ["SUCCESS", "FALLBACK_SUCCESS"] else "HIGH",
            f"Autonomous Policy: Primary {primary_gw} → Final {final_gw} ({final_status})",
            trace_id,
            primary_gw,
            fallback_gw,
            final_gw,
            fallback_triggered,
            fallback_triggered,
            fallback_reason,
            transaction_context.get("idempotency_key"),
            now
        ))

        # 3. Record Audit Trail
        audit_id = f"AUD-{uuid.uuid4().hex[:12].upper()}"
        audit_action = "Fallback Executed" if fallback_triggered else "Autonomous Route"
        audit_reason = (
            fallback_reason if fallback_triggered
            else f"Zero-trust verified {validation_result.get('validation_status')} · Routed to {final_gw}"
        )

        c.execute("""
        INSERT INTO audit_trail (
            id, timestamp, action, from_gw, to_gw, amount, reason, confidence,
            simulation_evidence, guardrail, verification, agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_id,
            now,
            audit_action,
            primary_gw if fallback_triggered else None,
            final_gw if fallback_triggered else primary_gw,
            f"₹{amount:,.2f}",
            audit_reason,
            99 if final_status == "SUCCESS" else 95,
            f"Revision count: {revision_count} · Latency: {latency}ms",
            "PASSED" if validation_result.get("validation_status") == "PASS" else "REVISED",
            "SAFE",
            self.name
        ))

        # 4. Continuous Learning: Rule Refinement (NO ML)
        learning_summary = self._refine_routing_rules(c, primary_gw, final_status, bool(fallback_triggered), latency)

        conn.commit()
        conn.close()

        return {
            "audit_id": audit_id,
            "recorded_at": now,
            "continuous_learning_summary": learning_summary
        }

    def _refine_routing_rules(
        self,
        cursor,
        primary_gw: str,
        final_status: str,
        fallback_triggered: bool,
        latency_ms: int
    ) -> Dict[str, Any]:
        """
        Rule / Threshold Analysis on recent historical routing data.
        Generates Updated Routing Configuration without any ML models.
        """
        now = int(time.time() * 1000)
        cursor.execute("""
        SELECT status, fallback_triggered, latency
        FROM transactions
        WHERE primary_gateway = ?
        ORDER BY timestamp DESC
        LIMIT 20
        """, (primary_gw,))
        recent = cursor.fetchall()

        if len(recent) >= 5:
            timeouts_or_fallbacks = sum(1 for r in recent if (r["fallback_triggered"] or 0) == 1 or r["status"] != "SUCCESS")
            avg_lat = sum(r["latency"] for r in recent) / len(recent)

            if timeouts_or_fallbacks >= 3 or avg_lat > 500:
                # Gateway repeatedly violates SLA or triggers fallbacks -> apply continuous learning penalty
                penalty = min(25.0, timeouts_or_fallbacks * 4.0)
                reason = f"Continuous Learning: Gateway {primary_gw} exhibited {timeouts_or_fallbacks} recent fallbacks (avg lat {int(avg_lat)}ms). Routing preference reduced by -{penalty}pts."
                cursor.execute("""
                INSERT OR REPLACE INTO routing_rules (gateway_id, priority_offset, penalty_score, is_deprioritized, reason, updated_at)
                VALUES (?, 0.0, ?, 1, ?, ?)
                """, (primary_gw, penalty, reason, now))
                return {
                    "rule_updated": True,
                    "gateway": primary_gw,
                    "action": "PENALTY_APPLIED",
                    "penalty_score": penalty,
                    "reason": reason
                }

        # Otherwise keep nominal baseline
        return {
            "rule_updated": False,
            "gateway": primary_gw,
            "action": "BASELINE_MAINTAINED",
            "reason": f"Gateway {primary_gw} within normal operating parameters."
        }
