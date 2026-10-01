from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Simulator"])

class EvaluateSimulationRequest(BaseModel):
    degrade_a_pct: int = 20
    shift_b_pct: int = 40
    max_shift_guardrail: int = 40

def compute_simulation_evaluation(req: EvaluateSimulationRequest):
    shift_b = req.shift_b_pct
    degrade_a = req.degrade_a_pct
    max_shift = req.max_shift_guardrail

    a_traffic = max(0, 90 - shift_b)
    b_traffic = min(100, 5 + shift_b)
    c_traffic = 5

    a_success = max(0.0, 98.5 - degrade_a * 0.45)
    b_success = max(0.0, 98.8 - max(0, b_traffic - 45) * 0.25)
    c_success = 96.1

    overall_success = (a_traffic * a_success + b_traffic * b_success + c_traffic * c_success) / 100.0
    a_latency = 180 + degrade_a * 20
    b_latency = 182 + max(0, b_traffic - 45) * 9
    overall_latency = (a_traffic * a_latency + b_traffic * b_latency + 1550) / 100.0
    overall_cost = (a_traffic * 1.8 + b_traffic * 2.1 + 7) / 100.0

    tps = 1842
    failures = round(((100.0 - overall_success) / 100.0) * tps * 60)
    b_load = round((b_traffic / 100.0) * tps * 1 / 15)

    within_sla = overall_latency <= 500
    within_policy = shift_b <= max_shift

    return {
        "shift_pct": shift_b,
        "split": {"A": a_traffic, "B": b_traffic, "C": c_traffic},
        "simulated_success_rate": round(overall_success, 1),
        "simulated_latency_ms": round(overall_latency),
        "simulated_cost_inr": round(overall_cost, 2),
        "simulated_failures_per_hour": failures,
        "predicted_success_rate": round(overall_success, 1),  # legacy compatibility alias
        "predicted_latency_ms": round(overall_latency),
        "predicted_cost_inr": round(overall_cost, 2),
        "predicted_failures_per_hour": failures,
        "gateway_b_load_pct": b_load,
        "within_sla": within_sla,
        "within_guardrail_policy": within_policy,
        "recommendation": "APPROVED" if (within_sla and within_policy) else "REJECTED_BY_GUARDRAIL"
    }

@router.post("/api/v1/simulator/evaluate")
def evaluate_simulator_v1(req: EvaluateSimulationRequest):
    return compute_simulation_evaluation(req)
