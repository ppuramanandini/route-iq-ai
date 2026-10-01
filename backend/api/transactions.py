from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from database import get_connection

router = APIRouter(tags=["Transactions"])

@router.get("/api/v1/transactions")
def list_transactions_v1(
    gateway: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=250),
    offset: int = 0
):
    conn = get_connection()
    c = conn.cursor()

    query = "SELECT * FROM transactions WHERE 1=1"
    params = []

    if gateway and gateway.upper() != "ALL":
        query += " AND (gateway = ? OR primary_gateway = ? OR final_gateway = ?)"
        g = gateway.upper()
        params.extend([g, g, g])

    if search:
        query += " AND (id LIKE ? OR merchant LIKE ? OR method LIKE ? OR trace_id LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.get("/api/v1/transactions/{tx_id}")
def get_transaction_v1(tx_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM transactions WHERE id = ?", (tx_id.upper(),))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    tx_data = dict(row)
    # Also fetch routing history if available
    c.execute("SELECT * FROM routing_history WHERE transaction_id = ?", (tx_id.upper(),))
    history_row = c.fetchone()
    tx_data["routing_history"] = dict(history_row) if history_row else None
    conn.close()
    return tx_data
