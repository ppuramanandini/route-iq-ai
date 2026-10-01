import math
from fastapi import APIRouter

router = APIRouter(tags=["Analytics"])

@router.get("/api/v1/analytics")
def get_analytics_v1():
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
