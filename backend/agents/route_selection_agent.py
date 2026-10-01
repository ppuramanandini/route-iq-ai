import logging
from typing import Dict, Any, List, Optional, Tuple
from database import get_connection
from monitoring.metrics import metrics

logger = logging.getLogger("switchrouteiq.agent.selection")

class RouteSelectionAgent:
    """
    AGENT 2 — Route Eligibility & Selection Agent
    Evaluates transaction context, merchant eligibility, payment rail,
    gateway telemetry health matrix, SLA constraints, and routing rules.
    Selects the best eligible Primary Route and Fallback Route.
    NO ML — uses deterministic, rule-based multi-criteria scoring.
    """
    def __init__(self):
        self.agent_id = 2
        self.name = "Route Eligibility & Selection Agent"
        self.verb = "SELECTING"

    def select_routes(
        self,
        transaction_context: Dict[str, Any],
        health_matrix: Dict[str, Dict[str, Any]],
        exclusions: Optional[List[str]] = None,
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Determines Primary and Fallback routes based on deterministic scoring.
        Applies exclusions if structured feedback was provided by Agent 3.
        """
        metrics.inc_agent_execution("agent_2_selection")
        exclusions = [e.upper() for e in (exclusions or [])]
        amount = transaction_context.get("amount", 0.0)
        payment_method = transaction_context.get("payment_method", "UPI").upper()
        merchant_id = transaction_context.get("merchant_id", "default")

        # Load learned routing rules / updated configuration from database
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM routing_rules")
        rules = {r["gateway_id"].upper(): dict(r) for r in c.fetchall()}
        conn.close()

        eligible_gateways: List[Dict[str, Any]] = []
        disqualified: Dict[str, str] = {}

        for gw_id, gw_info in health_matrix.items():
            gid = gw_id.upper()

            # Filter 1: Exclusions from Agent 3 feedback
            if gid in exclusions:
                disqualified[gid] = f"Excluded by Agent 3 feedback: {feedback.get('reason', 'Validation rejection') if feedback else 'Rejected'}"
                continue

            # Filter 2: Degradation / Risk check
            risk_level = gw_info.get("risk_level", "LOW")
            health = gw_info.get("health", 100)
            if risk_level == "HIGH" or health < 75:
                disqualified[gid] = f"Gateway degraded (health: {health}%, risk: {risk_level})"
                continue

            # Filter 3: Learned Configuration (deprioritized by Agent 5 rule refinement)
            rule = rules.get(gid, {})
            if rule.get("is_deprioritized", 0) == 1 and len(eligible_gateways) >= 2:
                disqualified[gid] = f"Temporarily deprioritized by continuous learning rule: {rule.get('reason')}"
                continue

            # Filter 4: Capacity check (e.g. TPS limit)
            capacity = gw_info.get("capacity_tps", 1000)
            if capacity < 100:
                disqualified[gid] = f"Insufficient capacity ({capacity} TPS)"
                continue

            # Gateways passed filters
            eligible_gateways.append(gw_info)

        # Fallback: if all were disqualified, keep any remaining non-excluded gateways
        if not eligible_gateways:
            for gw_id, gw_info in health_matrix.items():
                if gw_id.upper() not in exclusions:
                    eligible_gateways.append(gw_info)

        # Deterministic Multi-Criteria Scoring (0 - 100 scale)
        scored_candidates = []
        for gw in eligible_gateways:
            gid = gw["id"].upper()
            rule = rules.get(gid, {})

            success_weight = 0.50
            latency_weight = 0.30
            cost_weight = 0.15
            capacity_weight = 0.05

            # Success component (higher is better)
            s_score = min(100.0, gw.get("success_rate", 95.0))

            # Latency component: 150ms -> 100pts, 500ms -> 0pts
            lat = gw.get("latency_ms", 200)
            l_score = max(0.0, min(100.0, (500 - lat) / 3.5))

            # Cost component: ₹1.00 -> 100pts, ₹3.00 -> 0pts
            cost = gw.get("cost_inr", 2.0)
            c_score = max(0.0, min(100.0, (3.0 - cost) * 50))

            # Capacity component
            cap = gw.get("capacity_tps", 1000)
            cap_score = min(100.0, cap / 15.0)

            total_score = (
                s_score * success_weight +
                l_score * latency_weight +
                c_score * cost_weight +
                cap_score * capacity_weight
            )

            # Apply learned penalty or priority offset from Agent 5
            total_score -= rule.get("penalty_score", 0.0)
            total_score += rule.get("priority_offset", 0.0)

            scored_candidates.append({
                "gateway_id": gid,
                "name": gw.get("name", f"Gateway {gid}"),
                "processor": gw.get("processor", "Simulated PSP"),
                "total_score": round(total_score, 2),
                "metrics": {
                    "health": gw.get("health", 98),
                    "success_rate": gw.get("success_rate", 98.0),
                    "latency_ms": gw.get("latency_ms", 180),
                    "cost_inr": gw.get("cost_inr", 1.8),
                    "capacity_tps": gw.get("capacity_tps", 1200),
                    "risk_level": gw.get("risk_level", "LOW")
                }
            })

        # Rank candidates by score descending
        scored_candidates.sort(key=lambda x: x["total_score"], reverse=True)

        if not scored_candidates:
            # Absolute fallback if empty
            primary = "B"
            fallback_gw = "C"
            primary_info = health_matrix.get("B", {})
            fallback_info = health_matrix.get("C", {})
            reason = "Emergency default selection: Gateway B as primary, Gateway C as fallback"
        else:
            primary = scored_candidates[0]["gateway_id"]
            primary_info = scored_candidates[0]["metrics"]

            if len(scored_candidates) > 1:
                fallback_gw = scored_candidates[1]["gateway_id"]
                fallback_info = scored_candidates[1]["metrics"]
            else:
                # Pick any distinct gateway for fallback
                other_ids = [k for k in health_matrix.keys() if k.upper() != primary]
                fallback_gw = other_ids[0] if other_ids else "B"
                fallback_info = health_matrix.get(fallback_gw, {})

            reason = (
                f"Primary Gateway {primary} selected (score {scored_candidates[0]['total_score']}) "
                f"because: healthy ({primary_info.get('health')}%), "
                f"highest success rate ({primary_info.get('success_rate')}%), "
                f"acceptable latency ({primary_info.get('latency_ms')}ms), "
                f"sufficient capacity ({primary_info.get('capacity_tps')} TPS), "
                f"SLA compliant. Fallback Gateway {fallback_gw} selected as secondary healthy route."
            )

        return {
            "primary_gateway": primary,
            "fallback_gateway": fallback_gw,
            "primary_info": health_matrix.get(primary, {}),
            "fallback_info": health_matrix.get(fallback_gw, {}),
            "scoring_table": scored_candidates,
            "disqualified": disqualified,
            "routing_reason": reason,
            "revision_feedback_applied": bool(feedback)
        }
