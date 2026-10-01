from fastapi import APIRouter
from typing import List, Dict, Any
from database import get_connection

router = APIRouter(tags=["Audit"])

@router.get("/api/v1/audit")
def list_audit_v1(limit: int = 100):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM audit_trail ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows
