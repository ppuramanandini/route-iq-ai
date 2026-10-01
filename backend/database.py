import sqlite3
import json
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "routeiq.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Gateways Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gateways (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        processor TEXT NOT NULL,
        health INTEGER NOT NULL,
        success_rate REAL NOT NULL,
        latency_ms INTEGER NOT NULL,
        p95_ms INTEGER NOT NULL,
        p99_ms INTEGER NOT NULL,
        errors_pct REAL NOT NULL,
        timeouts_pct REAL NOT NULL,
        traffic_pct REAL NOT NULL,
        cost_inr REAL NOT NULL,
        capacity_tps INTEGER NOT NULL,
        risk_level TEXT NOT NULL
    )
    """)

    # Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        merchant TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        gateway TEXT NOT NULL,
        status TEXT NOT NULL,
        latency INTEGER NOT NULL,
        retry INTEGER NOT NULL,
        risk TEXT NOT NULL,
        decision TEXT NOT NULL,
        trace_id TEXT NOT NULL
    )
    """)

    # Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        detected_at INTEGER NOT NULL,
        gateway TEXT NOT NULL,
        success_rate REAL NOT NULL,
        predicted_risk TEXT NOT NULL,
        root_cause TEXT NOT NULL,
        mitigation_action TEXT NOT NULL,
        status TEXT NOT NULL,
        timeline_json TEXT NOT NULL
    )
    """)

    # Audit Trail Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_trail (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        action TEXT NOT NULL,
        from_gw TEXT,
        to_gw TEXT,
        amount TEXT,
        reason TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        simulation_evidence TEXT,
        guardrail TEXT NOT NULL,
        verification TEXT NOT NULL,
        agent TEXT NOT NULL
    )
    """)

    # Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        min_health_threshold INTEGER NOT NULL,
        max_traffic_shift INTEGER NOT NULL,
        sla_latency_limit INTEGER NOT NULL,
        canary_ramp TEXT NOT NULL,
        rollback_window_sec INTEGER NOT NULL,
        auto_healing_enabled INTEGER NOT NULL,
        idempotency_enabled INTEGER NOT NULL
    )
    """)

    # Routing History Table (Agent 2, 3, 5 tracking)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS routing_history (
        transaction_id TEXT PRIMARY KEY,
        primary_gateway TEXT NOT NULL,
        fallback_gateway TEXT NOT NULL,
        decision_reason TEXT NOT NULL,
        validation_result TEXT NOT NULL,
        revision_count INTEGER NOT NULL,
        final_status TEXT NOT NULL,
        created_at INTEGER NOT NULL
    )
    """)

    # Routing Rules / Learned Configuration Table (Agent 5 continuous refinement)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS routing_rules (
        gateway_id TEXT PRIMARY KEY,
        priority_offset REAL DEFAULT 0.0,
        penalty_score REAL DEFAULT 0.0,
        is_deprioritized INTEGER DEFAULT 0,
        reason TEXT DEFAULT 'Nominal baseline configuration',
        updated_at INTEGER NOT NULL
    )
    """)

    # Gateway Telemetry Events Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gateway_telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gateway_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        status_code TEXT NOT NULL,
        outcome TEXT NOT NULL,
        error_code TEXT
    )
    """)

    # Safely migrate new columns into transactions table if they do not exist
    for col_def in [
        ("primary_gateway", "TEXT"),
        ("fallback_gateway", "TEXT"),
        ("final_gateway", "TEXT"),
        ("retry_count", "INTEGER DEFAULT 0"),
        ("fallback_triggered", "INTEGER DEFAULT 0"),
        ("fallback_reason", "TEXT"),
        ("idempotency_key", "TEXT"),
        ("final_status", "TEXT"),
        ("created_at", "INTEGER")
    ]:
        try:
            cursor.execute(f"ALTER TABLE transactions ADD COLUMN {col_def[0]} {col_def[1]}")
        except sqlite3.OperationalError:
            pass  # Column already exists

    # Seed Initial Data if empty
    cursor.execute("SELECT COUNT(*) as count FROM gateways")
    if cursor.fetchone()["count"] == 0:
        gateways_data = [
            ("A", "Gateway A", "Processor: Razorpay-sim", 98, 98.4, 180, 342, 558, 1.3, 0.4, 42.0, 1.8, 1200, "LOW"),
            ("B", "Gateway B", "Processor: Stripe-sim", 98, 98.7, 182, 345, 564, 1.0, 0.4, 40.0, 2.1, 1500, "LOW"),
            ("C", "Gateway C", "Processor: PayU-sim", 96, 96.1, 310, 589, 961, 3.6, 0.8, 18.0, 1.4, 700, "MEDIUM"),
        ]
        cursor.executemany("""
        INSERT INTO gateways (id, name, processor, health, success_rate, latency_ms, p95_ms, p99_ms, errors_pct, timeouts_pct, traffic_pct, cost_inr, capacity_tps, risk_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, gateways_data)

    cursor.execute("SELECT COUNT(*) as count FROM settings")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO settings (id, min_health_threshold, max_traffic_shift, sla_latency_limit, canary_ramp, rollback_window_sec, auto_healing_enabled, idempotency_enabled)
        VALUES (1, 92, 40, 500, '5% → 20% → 40%', 180, 1, 1)
        """)

    cursor.execute("SELECT COUNT(*) as count FROM incidents")
    if cursor.fetchone()["count"] == 0:
        now = int(time.time() * 1000)
        timeline = [
            {"ts": now - 3600000 * 2, "label": "Processor maintenance window announced"},
            {"ts": now - 3600000, "label": "20% traffic shifted to Gateway B"},
            {"ts": now - 1800000, "label": "Recovery verified: 98.5% success"}
        ]
        cursor.execute("""
        INSERT INTO incidents (id, title, detected_at, gateway, success_rate, predicted_risk, root_cause, mitigation_action, status, timeline_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("INC-2047", "Gateway C processor maintenance", now - 86400000, "C", 95.2, "MEDIUM", "Planned acquirer maintenance", "20% traffic shift → Gateway B", "RECOVERED", json.dumps(timeline)))

    cursor.execute("SELECT COUNT(*) as count FROM audit_trail")
    if cursor.fetchone()["count"] == 0:
        now = int(time.time() * 1000)
        audit_data = [
            ("AUD-7712", now - 3600000 * 6, "Traffic shifted", "Gateway C", "Gateway B", "20%", "Scheduled maintenance window on processor", 99, "20% shift kept success at 98.5%", "PASSED", "STABLE", "Intelligent Routing & Safe Fallback Agent"),
            ("AUD-7711", now - 3600000 * 12, "Retry blocked", None, None, None, "Payment state SUCCESS at issuer — duplicate debit prevented", 100, "Idempotency cache hit rate 100%", "N/A", "SAFE", "Zero-Trust Route Validation Agent"),
            ("AUD-7710", now - 3600000 * 18, "Rollback", "Gateway B", "Gateway C", "20%", "Gateway C recovered after maintenance", 96, "Restored cost-optimal split", "PASSED", "RECOVERED", "Intelligent Routing & Safe Fallback Agent"),
        ]
        cursor.executemany("""
        INSERT INTO audit_trail (id, timestamp, action, from_gw, to_gw, amount, reason, confidence, simulation_evidence, guardrail, verification, agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, audit_data)

    cursor.execute("SELECT COUNT(*) as count FROM transactions")
    if cursor.fetchone()["count"] == 0:
        now = int(time.time() * 1000)
        merchants = ["FoodApp", "TravelNow", "ShopSphere", "TicketHub"]
        methods = ["UPI", "UPI", "CARD", "NETBANKING", "WALLET"]
        txs = []
        for i in range(25):
            t_id = f"TX-{90000 + i}"
            ts = now - (25 - i) * 2000
            mch = merchants[i % len(merchants)]
            mth = methods[i % len(methods)]
            gw = "A" if i % 10 < 4 else "B" if i % 10 < 8 else "C"
            amt = [500, 8450, 1240, 32500, 299, 1899, 650, 4200][i % 8]
            txs.append((
                t_id, ts, mch, amt, mth, gw, "SUCCESS", 180 + (i % 5) * 8, 0, "LOW", "Auto-routed", f"tr_{t_id.lower()}_trace"
            ))
        cursor.executemany("""
        INSERT INTO transactions (id, timestamp, merchant, amount, method, gateway, status, latency, retry, risk, decision, trace_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, txs)

    cursor.execute("SELECT COUNT(*) as count FROM routing_rules")
    if cursor.fetchone()["count"] == 0:
        now = int(time.time() * 1000)
        rules_data = [
            ("A", 0.0, 0.0, 0, "Nominal baseline configuration", now),
            ("B", 0.0, 0.0, 0, "Nominal baseline configuration", now),
            ("C", 0.0, 0.0, 0, "Nominal baseline configuration", now),
        ]
        cursor.executemany("""
        INSERT INTO routing_rules (gateway_id, priority_offset, penalty_score, is_deprioritized, reason, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, rules_data)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
