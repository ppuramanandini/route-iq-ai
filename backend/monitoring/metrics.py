import threading
import time
from typing import Dict

class MetricsRegistry:
    """Thread-safe Prometheus metrics collector and exposition formatter."""
    def __init__(self):
        self._lock = threading.Lock()
        self.payment_requests_total = 0
        self.payment_success_total = 0
        self.payment_failures_total = 0
        self.fallback_total = 0
        self.route_revision_total = 0
        self.validation_failure_total = 0
        self.duplicate_debit_prevented = 0
        
        # Histograms / Gauges
        self.payment_latencies = []
        self.gateway_success_rate: Dict[str, float] = {"A": 98.4, "B": 98.7, "C": 96.1}
        self.gateway_latency: Dict[str, float] = {"A": 180.0, "B": 182.0, "C": 310.0}
        self.agent_execution_total: Dict[str, int] = {
            "agent_1_telemetry": 0,
            "agent_2_selection": 0,
            "agent_3_validation": 0,
            "agent_4_execution": 0,
            "agent_5_audit": 0
        }

    def inc_requests(self):
        with self._lock:
            self.payment_requests_total += 1

    def inc_success(self):
        with self._lock:
            self.payment_success_total += 1

    def inc_failures(self):
        with self._lock:
            self.payment_failures_total += 1

    def inc_fallback(self):
        with self._lock:
            self.fallback_total += 1

    def inc_revision(self):
        with self._lock:
            self.route_revision_total += 1

    def inc_validation_failure(self):
        with self._lock:
            self.validation_failure_total += 1

    def inc_duplicate_prevented(self):
        with self._lock:
            self.duplicate_debit_prevented += 1

    def record_latency(self, ms: float):
        with self._lock:
            self.payment_latencies.append(ms)
            if len(self.payment_latencies) > 500:
                self.payment_latencies.pop(0)

    def inc_agent_execution(self, agent_key: str):
        with self._lock:
            self.agent_execution_total[agent_key] = self.agent_execution_total.get(agent_key, 0) + 1

    def set_gateway_metrics(self, gw_id: str, success_rate: float, latency_ms: float):
        with self._lock:
            self.gateway_success_rate[gw_id] = success_rate
            self.gateway_latency[gw_id] = latency_ms

    def export_prometheus(self) -> str:
        with self._lock:
            lines = [
                "# HELP payment_requests_total Total number of incoming payment requests",
                "# TYPE payment_requests_total counter",
                f"payment_requests_total {self.payment_requests_total}",
                "",
                "# HELP payment_success_total Total successful payments",
                "# TYPE payment_success_total counter",
                f"payment_success_total {self.payment_success_total}",
                "",
                "# HELP payment_failures_total Total failed payments",
                "# TYPE payment_failures_total counter",
                f"payment_failures_total {self.payment_failures_total}",
                "",
                "# HELP fallback_total Total payments routed via fallback gateway",
                "# TYPE fallback_total counter",
                f"fallback_total {self.fallback_total}",
                "",
                "# HELP route_revision_total Total route revisions requested by validation agent",
                "# TYPE route_revision_total counter",
                f"route_revision_total {self.route_revision_total}",
                "",
                "# HELP validation_failure_total Total zero-trust validation failures",
                "# TYPE validation_failure_total counter",
                f"validation_failure_total {self.validation_failure_total}",
                "",
                "# HELP duplicate_debit_prevented Total duplicate debits prevented by idempotency",
                "# TYPE duplicate_debit_prevented counter",
                f"duplicate_debit_prevented {self.duplicate_debit_prevented}",
                "",
                "# HELP payment_latency Average payment latency in milliseconds",
                "# TYPE payment_latency gauge",
                f"payment_latency {round(sum(self.payment_latencies) / len(self.payment_latencies), 2) if self.payment_latencies else 184.0}",
                "",
                "# HELP gateway_success_rate Current success rate percentage per gateway",
                "# TYPE gateway_success_rate gauge"
            ]
            for gw, rate in self.gateway_success_rate.items():
                lines.append(f'gateway_success_rate{{gateway="{gw}"}} {rate}')

            lines.extend([
                "",
                "# HELP gateway_latency Current p95 latency in milliseconds per gateway",
                "# TYPE gateway_latency gauge"
            ])
            for gw, lat in self.gateway_latency.items():
                lines.append(f'gateway_latency{{gateway="{gw}"}} {lat}')

            lines.extend([
                "",
                "# HELP agent_execution_total Total executions per agent in the orchestrator pipeline",
                "# TYPE agent_execution_total counter"
            ])
            for ag, cnt in self.agent_execution_total.items():
                lines.append(f'agent_execution_total{{agent="{ag}"}} {cnt}')

            lines.append("")
            return "\n".join(lines)


metrics = MetricsRegistry()
