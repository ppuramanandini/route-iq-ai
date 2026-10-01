from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from database import get_connection

router = APIRouter(tags=["Gateways"])

@router.get("/api/v1/gateways")
def list_gateways_v1():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM gateways ORDER BY id ASC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.get("/api/v1/gateways/{gw_id}")
def get_gateway_v1(gw_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM gateways WHERE id = ?", (gw_id.upper(),))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Gateway not found")
    return dict(row)

@router.get("/api/v1/gateways/{gw_id}/telemetry")
def get_gateway_telemetry(gw_id: str, limit: int = 50):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM gateway_telemetry WHERE gateway_id = ? ORDER BY timestamp DESC LIMIT ?",
        (gw_id.upper(), limit)
    )
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows
