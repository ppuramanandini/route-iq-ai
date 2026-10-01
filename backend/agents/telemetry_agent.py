import time
import logging
from typing import Dict, Any, List, Optional
from database import get_connection
from cache.gateway_state import (
    get_cached_gateway_state,
    set_cached_gateway_state,
    get_cached_gateway_health,
    set_cached_gateway_health
)
from monitoring.metrics import metrics

logger = logging.getLogger("switchrouteiq.agent.telemetry")

class TelemetryAgent:
    """
    AGENT 1 — Gateway Health & Telemetry Agent
    Monitors connected payment gateways/PSPs in real-time.
    Aggregates success rates, p95 latency, timeout rate, error rate,
    availability, load, traffic %, capacity, cost, and calculates
    dynamic health matrix scores.
    """
    def __init__(self):
        self.agent_id = 1
        self.name = "Gateway Health & Telemetry Agent"
        self.verb = "OBSERVING"

    def get_health_matrix(self) -> Dict[str, Dict[str, Any]]:
        """
        Retrieves real-time telemetry and health matrix for all connected gateways.
        Reads from Redis cache or SQLite database.
        """
        metrics.inc_agent_execution("agent_1_telemetry")
        matrix: Dict[str, Dict[str, Any]] = {}
        gateway_ids = ["A", "B", "C"]

        # First check cache for each gateway
        missing = []
        for gid in gateway_ids:
            cached = get_cached_gateway_state(gid)
            if cached:
                matrix[gid] = cached
            else:
                missing.append(gid)

        # If any missing from cache, query database
        if missing:
            conn = get_connection()
            c = conn.cursor()
            placeholders = ",".join("?" * len(missing))
            c.execute(f"SELECT * FROM gateways WHERE id IN ({placeholders})", missing)
            rows = [dict(r) for r in c.fetchall()]
            conn.close()

            for r in rows:
                gid = r["id"]
                # Compute composite health score (0-100) based on deterministic metrics
                health_score = self.compute_health_score(
                    success_rate=r["success_rate"],
                    latency_ms=r["latency_ms"],
                    errors_pct=r["errors_pct"],
                    timeouts_pct=r["timeouts_pct"]
                )
                r["health"] = health_score
                r["status"] = "HEALTHY" if health_score >= 85 and r["risk_level"] != "HIGH" else "DEGRADED"

                set_cached_gateway_state(gid, r)
                set_cached_gateway_health(gid, health_score)
                metrics.set_gateway_metrics(gid, r["success_rate"], r["latency_ms"])
                matrix[gid] = r

        return matrix

    @staticmethod
    def compute_health_score(
        success_rate: float,
        latency_ms: int,
        errors_pct: float,
        timeouts_pct: float
    ) -> int:
        """
        Deterministic formula for gateway health scoring (0-100).
        Evaluates success rate, latency penalty, and timeout severity.
        """
        # Base starts from success rate (0-100)
        score = success_rate
        # Latency penalty: penalize latencies above 250ms
        if latency_ms > 250:
            latency_penalty = min(30, (latency_ms - 250) / 15.0)
            score -= latency_penalty
        # Timeout penalty: timeouts are severe (2x weight)
        score -= (timeouts_pct * 2.0)
        # Error penalty
        score -= (errors_pct * 1.0)

        return max(0, min(100, round(score)))

    def record_outcome(
        self,
        gateway_id: str,
        latency_ms: int,
        status_code: str,
        is_success: bool,
        is_timeout: bool
    ) -> Dict[str, Any]:
        """
        Live Health Update Loop:
        Updates gateway telemetry in database and cache following actual gateway responses.
        Calculates moving window updates to maintain real-time health telemetry.
        """
        gid = gateway_id.upper()
        now = int(time.time() * 1000)

        conn = get_connection()
        c = conn.cursor()

        # Insert telemetry event log
        c.execute("""
        INSERT INTO gateway_telemetry (gateway_id, timestamp, latency_ms, status_code, outcome, error_code)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            gid,
            now,
            latency_ms,
            status_code,
            "SUCCESS" if is_success else "TIMEOUT" if is_timeout else "FAILURE",
            status_code if not is_success else None
        ))

        # Fetch current gateway record
        c.execute("SELECT * FROM gateways WHERE id = ?", (gid,))
        row = c.fetchone()
        if not row:
            conn.close()
            return {}

        current = dict(row)

        # Smooth moving-average updates
        alpha = 0.05  # Exponential smoothing factor
        new_latency = int((1 - alpha) * current["latency_ms"] + alpha * latency_ms)
        
        target_success = 100.0 if is_success else 0.0
        new_success = round((1 - alpha) * current["success_rate"] + alpha * target_success, 1)

        target_timeout = 10.0 if is_timeout else 0.0
        new_timeouts = round((1 - alpha) * current["timeouts_pct"] + alpha * target_timeout, 1)

        target_error = 10.0 if (not is_success and not is_timeout) else 0.0
        new_errors = round((1 - alpha) * current["errors_pct"] + alpha * target_error, 1)

        new_health = self.compute_health_score(new_success, new_latency, new_errors, new_timeouts)
        risk = "HIGH" if new_health < 80 or new_latency > 600 else "MEDIUM" if new_health < 92 else "LOW"

        c.execute("""
        UPDATE gateways
        SET health = ?, success_rate = ?, latency_ms = ?, p95_ms = ?, timeouts_pct = ?, errors_pct = ?, risk_level = ?
        WHERE id = ?
        """, (
            new_health,
            new_success,
            new_latency,
            round(new_latency * 1.9),
            new_timeouts,
            new_errors,
            risk,
            gid
        ))

        conn.commit()
        conn.close()

        updated_state = {
            **current,
            "health": new_health,
            "success_rate": new_success,
            "latency_ms": new_latency,
            "timeouts_pct": new_timeouts,
            "errors_pct": new_errors,
            "risk_level": risk,
            "status": "HEALTHY" if risk == "LOW" else "DEGRADED"
        }

        # Update cache & metrics
        set_cached_gateway_state(gid, updated_state)
        set_cached_gateway_health(gid, new_health)
        metrics.set_gateway_metrics(gid, new_success, new_latency)

        return updated_state
