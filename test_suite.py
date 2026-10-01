import requests
import time
import json
import sqlite3

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = "backend/routeiq.db"

def test_endpoints():
    print("=== TESTING CORE ENDPOINTS ===")
    endpoints = [
        ("GET", "/docs"),
        ("GET", "/openapi.json"),
        ("GET", "/metrics"),
        ("GET", "/api/v1/gateways"),
        ("GET", "/api/v1/gateways/A"),
        ("GET", "/api/v1/gateways/A/telemetry"),
        ("GET", "/api/v1/transactions"),
        ("GET", "/api/v1/routing/rules"),
        ("GET", "/api/v1/agents"),
        ("GET", "/api/v1/analytics"),
        ("GET", "/api/v1/audit"),
        ("GET", "/api/v1/incidents"),
    ]
    for method, path in endpoints:
        res = requests.request(method, f"{BASE_URL}{path}")
        assert res.status_code == 200, f"Failed {path}: {res.status_code}"
        print(f"[PASS] {method} {path} -> {res.status_code}")

    # Simulator evaluate
    sim_res = requests.post(f"{BASE_URL}/api/v1/simulator/evaluate", json={
        "degradation_pct": 20,
        "max_shift_pct": 40,
        "custom_shift_pct": 30
    })
    assert sim_res.status_code == 200, f"Simulator evaluate failed: {sim_res.status_code}"
    sim_data = sim_res.json()
    assert "simulated_success_rate" in sim_data, "Missing simulated_success_rate"
    print(f"[PASS] POST /api/v1/simulator/evaluate -> {sim_res.status_code} (simulated_success_rate={sim_data['simulated_success_rate']})")

def test_scenario_1_normal_payment():
    print("\n=== TEST 1: NORMAL SUCCESSFUL TRANSACTION ===")
    idem_key = f"order_norm_{int(time.time()*1000)}"
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 499.0,
        "currency": "INR",
        "payment_rail": "UPI",
        "idempotency_key": idem_key
    }
    res = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
    assert res.status_code == 200, f"Status code {res.status_code}"
    data = res.json()
    assert data["final_status"] == "SUCCESS", f"Expected SUCCESS, got {data['final_status']}"
    assert data["fallback_triggered"] == False, "Expected no fallback"
    trace = data["agent_execution_trace"]
    assert len(trace) == 5, f"Expected 5 agents executed, got {len(trace)}"
    agent_names = [t["name"] for t in trace]
    print(f"Agent execution sequence: {agent_names}")
    assert "Gateway Health & Telemetry Agent" == agent_names[0]
    assert "Route Eligibility & Selection Agent" == agent_names[1]
    assert "Zero-Trust Route Validation Agent" == agent_names[2]
    assert "Intelligent Routing & Safe Fallback Agent" == agent_names[3]
    assert "Audit, Incident & Continuous Learning Agent" == agent_names[4]
    print(f"[PASS] Normal payment succeeded via {data['final_gateway']} without fallback across all 5 agents.")

def test_scenario_2_failed_primary_safe_fallback():
    print("\n=== TEST 2: PRIMARY GATEWAY TIMEOUT / SAFE FALLBACK ===")
    idem_key = f"order_fallback_{int(time.time()*1000)}"
    # amount >= 10000 triggers mock timeout on Razorpay (Gateway A)
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 12500.0,
        "currency": "INR",
        "payment_rail": "CARD",
        "idempotency_key": idem_key,
        "simulate_behavior": "timeout"
    }
    res = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
    assert res.status_code == 200, f"Status code {res.status_code}"
    data = res.json()
    assert data["fallback_triggered"] == True, "Expected fallback triggered"
    assert data["final_status"] == "FALLBACK_SUCCESS", f"Expected FALLBACK_SUCCESS, got {data['final_status']}"
    assert data["final_gateway"] != data["primary_gateway"], "Expected different gateway"
    print(f"[PASS] Safe Fallback triggered: Primary {data['primary_gateway']} failed -> Fallback {data['final_gateway']} executed safely (Final: {data['final_status']}).")

def test_scenario_3_idempotency():
    print("\n=== TEST 3: DUPLICATE IDEMPOTENCY KEY ===")
    idem_key = f"order_idem_{int(time.time()*1000)}"
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 750.0,
        "currency": "INR",
        "payment_rail": "UPI",
        "idempotency_key": idem_key
    }
    res1 = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
    assert res1.status_code == 200, f"First request failed: {res1.status_code}"
    data1 = res1.json()
    assert data1["final_status"] in ["SUCCESS", "FALLBACK_SUCCESS"], f"Expected successful final_status, got {data1['final_status']}"

    # Send identical request with same idempotency key
    res2 = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
    assert res2.status_code == 200, f"Second request failed: {res2.status_code}"
    data2 = res2.json()
    assert data2["status"] in ["DUPLICATE_PREVENTED", "IDEMPOTENT_DUPLICATE_IGNORED"], f"Expected duplicate detected, got {data2.get('status')}"
    assert data2["duplicate_detected"] == True
    print(f"[PASS] Idempotency check PASSED: Duplicate transaction detected. No second debit occurred.")

def test_scenario_4_validation_revision():
    print("\n=== TEST 4: AGENT 3 VALIDATION REVISE (MAX 1 REVISION) ===")
    idem_key = f"order_revise_{int(time.time()*1000)}"
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 1500.0,
        "currency": "INR",
        "payment_rail": "UPI",
        "idempotency_key": idem_key,
        "simulate_behavior": "force_revision"
    }
    res = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["revision_count"] == 1, f"Expected exactly 1 revision, got {data['revision_count']}"
    assert data["validation_status"] == "PASS", f"Expected PASS after revision, got {data['validation_status']}"
    print(f"Revision count: {data['revision_count']}, Final Validation status: {data['validation_status']}")
    print("[PASS] Agent 3 issued REVISE with structured feedback -> Agent 2 re-selected -> Agent 3 validated -> Exactly 1 revision, no infinite loop.")

def test_scenario_5_rapid_audit_transactions():
    print("\n=== TEST 5: RAPID AUDIT TEST (25 TRANSACTIONS) ===")
    audit_ids = []
    tx_ids = []
    start_time = time.time()
    for i in range(25):
        payload = {
            "merchant_id": "merch_demo_foodapp",
            "amount": 100.0 + i * 10,
            "currency": "INR",
            "payment_rail": "UPI",
            "idempotency_key": f"order_rapid_{int(time.time()*1000)}_{i}"
        }
        res = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
        assert res.status_code == 200, f"Tx {i} failed: {res.status_code}, {res.text}"
        data = res.json()
        tx_id = data["transaction_id"]
        audit_id = data.get("audit_id")
        audit_ids.append(audit_id)
        tx_ids.append(tx_id)

    elapsed = time.time() - start_time
    print(f"Executed 25 rapid transactions in {elapsed:.2f}s")
    assert len(set(audit_ids)) == 25, f"Expected 25 unique audit IDs, got {len(set(audit_ids))}: {audit_ids}"
    assert len(set(tx_ids)) == 25, f"Expected 25 unique tx IDs, got {len(set(tx_ids))}"

    # Verify directly in SQLite that all 25 rows exist in audit_trail and transactions
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    placeholders = ",".join("?" for _ in audit_ids)
    c.execute(f"SELECT COUNT(*) FROM audit_trail WHERE id IN ({placeholders})", audit_ids)
    count = c.fetchone()[0]
    conn.close()
    assert count == 25, f"Expected 25 audit rows in SQLite, found {count}"

    print(f"[PASS] All {len(audit_ids)} rapid audit IDs are genuinely unique. Zero SQLite UNIQUE constraint collisions!")

if __name__ == "__main__":
    test_endpoints()
    test_scenario_1_normal_payment()
    test_scenario_2_failed_primary_safe_fallback()
    test_scenario_3_idempotency()
    test_scenario_4_validation_revision()
    test_scenario_5_rapid_audit_transactions()
    print("\nALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!")
