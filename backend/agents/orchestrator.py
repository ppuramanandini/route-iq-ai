import time
import logging
import uuid
from typing import Dict, Any, List, Optional
from monitoring.metrics import metrics
from cache.idempotency import (
    acquire_idempotency_lock,
    get_idempotent_transaction,
    release_idempotency_lock,
    store_idempotent_transaction
)

from .telemetry_agent import TelemetryAgent
from .route_selection_agent import RouteSelectionAgent
from .route_validation_agent import RouteValidationAgent
from .execution_agent import ExecutionAgent
from .audit_agent import AuditAgent

logger = logging.getLogger("switchrouteiq.orchestrator")

class SwitchRouteIQOrchestrator:
    """
    SWITCHROUTEIQ AI ORCHESTRATOR
    Coordinates the exact 5-agent autonomous payment routing pipeline:
      Agent 1: Gateway Health & Telemetry Agent
      Agent 2: Route Eligibility & Selection Agent
      Agent 3: Zero-Trust Route Validation Agent (with 1-time Structured Feedback loop)
      Agent 4: Intelligent Routing & Safe Fallback Agent
      Agent 5: Audit, Incident & Continuous Learning Agent
    """
    def __init__(self):
        self.agent_1 = TelemetryAgent()
        self.agent_2 = RouteSelectionAgent()
        self.agent_3 = RouteValidationAgent()
        self.agent_4 = ExecutionAgent()
        self.agent_5 = AuditAgent()

    def route_payment(
        self,
        payment_request: Dict[str, Any],
        simulate_behavior: Optional[str] = None
    ) -> Dict[str, Any]:
        idempotency_key = payment_request.get("idempotency_key")
        if not idempotency_key:
            idempotency_key = f"key_{int(time.time() * 1000)}"
            payment_request["idempotency_key"] = idempotency_key

        request_lock_key = f"orchestrator:{idempotency_key}"
        if not acquire_idempotency_lock(request_lock_key, ttl=60):
            metrics.inc_requests()
            metrics.inc_duplicate_prevented()
            existing_tx = get_idempotent_transaction(idempotency_key)
            return self._duplicate_response(existing_tx, in_progress=existing_tx is None)

        try:
            return self._route_payment_locked(payment_request, simulate_behavior)
        finally:
            release_idempotency_lock(request_lock_key)

    @staticmethod
    def _duplicate_response(
        existing_tx: Optional[Dict[str, Any]],
        in_progress: bool = False
    ) -> Dict[str, Any]:
        return {
            "transaction_id": existing_tx.get("transaction_id") if existing_tx else None,
            "status": "DUPLICATE_PREVENTED",
            "duplicate_detected": True,
            "message": (
                "Payment is already processing for this idempotency key"
                if in_progress
                else "Payment already processed for this idempotency key"
            ),
            "final_status": existing_tx.get("final_status", "DUPLICATE_PREVENTED") if existing_tx else "DUPLICATE_PREVENTED",
            "primary_gateway": existing_tx.get("primary_gateway", "A") if existing_tx else None,
            "fallback_gateway": existing_tx.get("fallback_gateway", "B") if existing_tx else None,
            "final_gateway": existing_tx.get("final_gateway") if existing_tx else None,
            "validation_status": "PASS" if existing_tx else "IN_PROGRESS",
            "revision_count": existing_tx.get("revision_count", 0) if existing_tx else 0,
            "fallback_triggered": existing_tx.get("fallback_triggered", False) if existing_tx else False,
            "routing_reason": "Idempotent response retrieved from fast cache" if existing_tx else "Concurrent duplicate request blocked",
            "agent_trace": existing_tx.get("agent_trace", []) if existing_tx else [],
            "cached": existing_tx is not None
        }

    def _route_payment_locked(
        self,
        payment_request: Dict[str, Any],
        simulate_behavior: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        metrics.inc_requests()

        idempotency_key = payment_request.get("idempotency_key")
        if not idempotency_key:
            idempotency_key = f"key_{int(time.time()*1000)}"
            payment_request["idempotency_key"] = idempotency_key

        # Fast Idempotency Cache Check
        existing_tx = get_idempotent_transaction(idempotency_key)
        if existing_tx:
            metrics.inc_duplicate_prevented()
            return {
                "transaction_id": existing_tx.get("transaction_id", f"TX-{uuid.uuid4().hex[:10].upper()}"),
                "status": "DUPLICATE_PREVENTED",
                "duplicate_detected": True,
                "message": "Payment already processed and verified for this idempotency key",
                "final_status": existing_tx.get("final_status", "SUCCESS"),
                "primary_gateway": existing_tx.get("primary_gateway", "A"),
                "fallback_gateway": existing_tx.get("fallback_gateway", "B"),
                "final_gateway": existing_tx.get("final_gateway", "A"),
                "validation_status": "PASS",
                "revision_count": 0,
                "fallback_triggered": existing_tx.get("fallback_triggered", False),
                "routing_reason": "Idempotent response retrieved from fast cache",
                "agent_trace": existing_tx.get("agent_trace", []),
                "cached": True
            }

        tx_id = f"TX-{uuid.uuid4().hex[:10].upper()}"
        agent_trace: List[Dict[str, Any]] = []

        # =====================================================================
        # AGENT 1: Gateway Health & Telemetry Agent
        # =====================================================================
        health_matrix = self.agent_1.get_health_matrix()
        agent_trace.append({
            "agent": "Agent 1",
            "name": self.agent_1.name,
            "verb": self.agent_1.verb,
            "status": "COMPLETED",
            "summary": f"Telemetry matrix active: {len(health_matrix)} gateways monitored",
            "details": {
                gid: {
                    "health": g.get("health"),
                    "success_rate": g.get("success_rate"),
                    "latency_ms": g.get("latency_ms"),
                    "status": g.get("status")
                }
                for gid, g in health_matrix.items()
            }
        })

        # =====================================================================
        # AGENT 2: Route Eligibility & Selection Agent (Pass 1)
        # =====================================================================
        selection_1 = self.agent_2.select_routes(
            transaction_context=payment_request,
            health_matrix=health_matrix
        )
        current_primary = selection_1["primary_gateway"]
        current_fallback = selection_1["fallback_gateway"]

        agent_trace.append({
            "agent": "Agent 2",
            "name": self.agent_2.name,
            "verb": self.agent_2.verb,
            "status": "COMPLETED",
            "primary": current_primary,
            "fallback": current_fallback,
            "reason": selection_1["routing_reason"],
            "scoring": selection_1["scoring_table"]
        })

        # =====================================================================
        # AGENT 3: Zero-Trust Route Validation Agent
        # =====================================================================
        val_result = self.agent_3.validate_routes(
            primary_gw=current_primary,
            fallback_gw=current_fallback,
            transaction_context=payment_request,
            health_matrix=health_matrix,
            revision_count=0
        )

        revision_count = 0
        final_selection = selection_1

        # Check for REVISE (One-time Revision Loop)
        if val_result.get("validation_status") == "REVISE":
            revision_count = 1
            feedback = val_result
            agent_trace.append({
                "agent": "Agent 3",
                "name": self.agent_3.name,
                "verb": self.agent_3.verb,
                "status": "REVISE",
                "feedback": feedback,
                "reason": feedback.get("reason"),
                "failed_checks": feedback.get("failed_checks")
            })

            # AGENT 2 (One-Time Revision with Structured Feedback)
            selection_2 = self.agent_2.select_routes(
                transaction_context=payment_request,
                health_matrix=health_matrix,
                exclusions=feedback.get("suggested_exclusion", []),
                feedback=feedback
            )
            current_primary = selection_2["primary_gateway"]
            current_fallback = selection_2["fallback_gateway"]
            final_selection = selection_2

            agent_trace.append({
                "agent": "Agent 2 [Revision 1]",
                "name": self.agent_2.name,
                "verb": "REVISING",
                "status": "COMPLETED",
                "revised_primary": current_primary,
                "revised_fallback": current_fallback,
                "reason": selection_2["routing_reason"]
            })

            # Re-validate with Agent 3 (revision_count = 1)
            val_result = self.agent_3.validate_routes(
                primary_gw=current_primary,
                fallback_gw=current_fallback,
                transaction_context=payment_request,
                health_matrix=health_matrix,
                revision_count=1
            )

        # Record Agent 3's final outcome in trace
        agent_trace.append({
            "agent": "Agent 3",
            "name": self.agent_3.name,
            "verb": self.agent_3.verb,
            "status": val_result.get("validation_status"),
            "reason": val_result.get("reason"),
            "checks_passed": val_result.get("checks_passed", [])
        })

        # =====================================================================
        # AGENT 4: Intelligent Routing & Safe Fallback Agent
        # =====================================================================
        if val_result.get("validation_status") == "SAFE_FAILURE":
            # Validation completely rejected even after revision
            exec_result = {
                "final_status": "SAFE_FAILURE",
                "final_gateway": None,
                "latency_ms": 20,
                "fallback_triggered": False,
                "fallback_reason": val_result.get("reason"),
                "message": "Safe failure triggered: All eligible routes failed zero-trust validation."
            }
        else:
            exec_result = self.agent_4.execute_and_fallback(
                primary_gw=current_primary,
                fallback_gw=current_fallback,
                transaction_context=payment_request,
                simulate_behavior=simulate_behavior
            )

        agent_trace.append({
            "agent": "Agent 4",
            "name": self.agent_4.name,
            "verb": self.agent_4.verb,
            "status": "COMPLETED",
            "final_status": exec_result.get("final_status"),
            "final_gateway": exec_result.get("final_gateway"),
            "fallback_triggered": exec_result.get("fallback_triggered", False),
            "fallback_reason": exec_result.get("fallback_reason"),
            "latency_ms": exec_result.get("latency_ms")
        })

        # =====================================================================
        # AGENT 5: Audit, Incident & Continuous Learning Agent
        # =====================================================================
        audit_result = self.agent_5.record_and_learn(
            transaction_id=tx_id,
            transaction_context=payment_request,
            selection_result=final_selection,
            validation_result=val_result,
            execution_result=exec_result,
            revision_count=revision_count
        )

        agent_trace.append({
            "agent": "Agent 5",
            "name": self.agent_5.name,
            "verb": self.agent_5.verb,
            "status": "COMPLETED",
            "audit_id": audit_result.get("audit_id"),
            "learning": audit_result.get("continuous_learning_summary")
        })

        # =====================================================================
        # LIVE HEALTH UPDATE LOOP (Telemetry feedback to Agent 1)
        # =====================================================================
        final_gw = str(exec_result.get("final_gateway") or current_primary)
        self.agent_1.record_outcome(
            gateway_id=final_gw,
            latency_ms=int(exec_result.get("latency_ms") or 180),
            status_code=str(exec_result.get("final_status") or "SUCCESS"),
            is_success=(exec_result.get("final_status") in ["SUCCESS", "FALLBACK_SUCCESS"]),
            is_timeout=("timeout" in str(exec_result.get("fallback_reason", "")).lower())
        )

        total_elapsed_ms = round((time.time() - start_time) * 1000)
        metrics.record_latency(total_elapsed_ms)

        response_payload = {
            "status": "ROUTED" if exec_result.get("final_status") in ["SUCCESS", "FALLBACK_SUCCESS"] else "FAILED",
            "transaction_id": tx_id,
            "primary_gateway": f"Gateway {current_primary}",
            "fallback_gateway": f"Gateway {current_fallback}",
            "final_gateway": f"Gateway {exec_result.get('final_gateway')}" if exec_result.get("final_gateway") else None,
            "final_status": exec_result.get("final_status"),
            "validation_status": val_result.get("validation_status"),
            "revision_count": revision_count,
            "fallback_triggered": exec_result.get("fallback_triggered", False),
            "fallback_reason": exec_result.get("fallback_reason"),
            "routing_reason": final_selection.get("routing_reason"),
            "latency_p50_ms": exec_result.get("latency_ms", 180),
            "total_latency_ms": total_elapsed_ms,
            "trace_id": f"tr_{tx_id.lower()}_{idempotency_key[:8]}",
            "guardrails_evaluated": val_result.get("checks_passed", ["SLA_PASSED", "POLICY_OK"]),
            "audit_id": audit_result.get("audit_id"),
            "agent_trace": agent_trace,
            "agent_execution_trace": agent_trace,
            "timestamp": int(time.time() * 1000)
        }

        # Store in idempotency cache
        store_idempotent_transaction(idempotency_key, response_payload)

        return response_payload


# Global orchestrator instance
orchestrator = SwitchRouteIQOrchestrator()
