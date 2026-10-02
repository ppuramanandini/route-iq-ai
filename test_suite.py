import requests
import time
import json
import sqlite3
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

BACKEND_DIR = str(Path(__file__).resolve().parent / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from cache.idempotency import acquire_idempotency_lock, release_idempotency_lock
from cache.redis_client import InMemoryCache
from agents.fallback_agent import FallbackAgent
from agents.route_selection_agent import RouteSelectionAgent
from agents.telemetry_agent import TelemetryAgent
from api.incidents import trigger_incident_v1
from cache.gateway_state import get_cached_gateway_state, invalidate_cached_gateway_state
from database import get_connection
from gateways import get_gateway_adapter
from gateways.base import GatewayResponse

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
        ("GET", "/api/v1/gateways/B/telemetry"),
        ("GET", "/api/v1/transactions"),
        ("GET", "/api/v1/routing/rules"),
        ("GET", "/api/v1/agents"),
        ("GET", "/api/v1/analytics"),
        ("GET", "/api/v1/audit"),
        ("GET", "/api/v1/incidents"),
        ("GET", "/api/agents"),
        ("GET", "/api/health"),
        ("GET", "/api/kpis"),
        ("GET", "/api/settings"),
        ("GET", "/api/analytics"),
    ]
    for method, path in endpoints:
        res = requests.request(method, f"{BASE_URL}{path}")
        assert res.status_code == 200, f"Failed {path}: {res.status_code}"
        print(f"[PASS] {method} {path} -> {res.status_code}")

    agent_defs = requests.get(f"{BASE_URL}/api/v1/agents").json()
    assert len(agent_defs) == 5
    assert requests.get(f"{BASE_URL}/api/agents").json() == agent_defs

    origin = "http://localhost:5175"
    preflight = requests.options(
        f"{BASE_URL}/api/v1/orchestrator/route",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type"
        }
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == origin
    assert preflight.headers.get("access-control-allow-credentials") == "true"

    validation = requests.post(f"{BASE_URL}/api/v1/routing/validate", json={
        "primary_gateway": "B",
        "fallback_gateway": "C",
        "amount": 500,
        "idempotency_key": f"validate_{int(time.time()*1000)}"
    })
    assert validation.status_code == 200

    fallback = requests.post(f"{BASE_URL}/api/v1/routing/fallback", json={
        "primary_gateway": "A",
        "fallback_gateway": "B",
        "amount": 500,
        "idempotency_key": f"fallback_api_{int(time.time()*1000)}"
    })
    assert fallback.status_code == 200
    assert fallback.json()["outcome"] == "FALLBACK_SUCCESS"

    invalid_gateway = requests.post(f"{BASE_URL}/api/v1/routing/fallback", json={
        "primary_gateway": "UNKNOWN",
        "fallback_gateway": "B",
        "amount": 500
    })
    assert invalid_gateway.status_code == 422
    print("[PASS] Agent compatibility, CORS, and routing endpoint contracts verified.")

    # Simulator evaluate
    sim_res = requests.post(f"{BASE_URL}/api/v1/simulator/evaluate", json={
        "degrade_a_pct": 20,
        "max_shift_guardrail": 20,
        "shift_b_pct": 40
    })
    assert sim_res.status_code == 200, f"Simulator evaluate failed: {sim_res.status_code}"
    sim_data = sim_res.json()
    assert "simulated_success_rate" in sim_data, "Missing simulated_success_rate"
    assert sim_data["within_guardrail_policy"] is False
    assert sim_data["recommendation"] == "REJECTED_BY_GUARDRAIL"
    legacy_sim = requests.post(f"{BASE_URL}/api/simulator/evaluate", json={
        "degrade_a_pct": 20,
        "max_shift_guardrail": 20,
        "shift_b_pct": 40
    })
    assert legacy_sim.status_code == 200, f"Legacy simulator evaluate failed: {legacy_sim.status_code}"
    assert legacy_sim.json() == sim_data, "Legacy and v1 simulator calculations diverged"
    print(f"[PASS] POST /api/v1/simulator/evaluate -> {sim_res.status_code} (simulated_success_rate={sim_data['simulated_success_rate']})")

def test_scenario_1_normal_payment():
    print("\n=== TEST 1: NORMAL SUCCESSFUL TRANSACTION ===")
    idem_key = f"order_norm_{int(time.time()*1000)}"
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 499.0,
        "currency": "INR",
        "payment_method": "UPI",
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

    missing = requests.get(f"{BASE_URL}/api/v1/transactions/tx_does_not_exist")
    assert missing.status_code == 404, f"Missing transaction should return 404, got {missing.status_code}"
    print("[PASS] Missing transaction returns 404.")

def test_scenario_2_failed_primary_safe_fallback():
    print("\n=== TEST 2: PRIMARY GATEWAY TIMEOUT / SAFE FALLBACK ===")
    idem_key = f"order_fallback_{int(time.time()*1000)}"
    # amount >= 10000 triggers mock timeout on Razorpay (Gateway A)
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 12500.0,
        "currency": "INR",
        "payment_method": "CARD",
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

def test_scenario_2b_primary_hard_failure_fallback():
    print("\n=== TEST 2B: PRIMARY HARD FAILURE / SAFE FALLBACK ===")
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 12500.0,
        "currency": "INR",
        "payment_method": "CARD",
        "idempotency_key": f"order_hard_fail_{int(time.time()*1000)}",
        "simulate_behavior": "fail"
    }
    response = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["fallback_triggered"] is True
    assert data["final_status"] == "FALLBACK_SUCCESS"
    print("[PASS] Hard primary failure verified safe fallback execution.")

def test_fallback_failure_and_charged_primary_guard():
    print("\n=== TEST: FALLBACK FAILURE AND CHARGED PRIMARY GUARD ===")
    key = f"unit_fallback_{int(time.time()*1000)}"
    primary = GatewayResponse(
        success=False,
        status_code="GW_502",
        latency_ms=250,
        gateway_tx_id="sim_primary_failure",
        message="simulated primary failure",
        raw_response={"gateway": "A"},
        is_hard_failure=True
    )
    fallback_result = FallbackAgent().execute_safe_fallback(
        fallback_gw="B",
        primary_response=primary,
        transaction_context={"idempotency_key": key, "amount": 100, "currency": "INR"},
        fallback_reason="test primary failure",
        simulate_behavior="fail"
    )
    assert fallback_result["outcome"] == "SAFE_FAILURE"
    assert fallback_result["fallback_triggered"] is True
    assert "Fallback also failed" in fallback_result["fallback_reason"]

    class ChargedAdapter:
        def __init__(self):
            self.fallback_attempted = False

        def verify_payment_state(self, gateway_tx_id, idempotency_key):
            return {"charged": True, "can_safely_fallback": False}

    charged_adapter = ChargedAdapter()
    import agents.fallback_agent as fallback_module
    original_factory = fallback_module.get_gateway_adapter
    fallback_module.get_gateway_adapter = lambda _gateway_id: charged_adapter
    try:
        charged_result = FallbackAgent().execute_safe_fallback(
            fallback_gw="B",
            primary_response=primary,
            transaction_context={"idempotency_key": f"charged_{key}", "amount": 100},
            fallback_reason="test charged primary"
        )
    finally:
        fallback_module.get_gateway_adapter = original_factory
    assert charged_result["outcome"] == "SAFE_FAILURE"
    assert charged_result["duplicate_prevented"] is True
    print("[PASS] Failed fallback remains safe; confirmed primary charge blocks fallback.")

def test_gateway_adapter_mapping():
    assert "Razorpay-sim" in get_gateway_adapter("A").name
    assert "Stripe-sim" in get_gateway_adapter("B").name
    assert "PayU-sim" in get_gateway_adapter("C").name
    try:
        get_gateway_adapter("UNKNOWN")
    except ValueError:
        pass
    else:
        raise AssertionError("Unsupported gateway ID must fail safely")
    print("[PASS] Gateway A/B/C adapter mappings and invalid-ID rejection verified.")

def test_incident_cache_consistency():
    print("\n=== TEST: INCIDENT TO TELEMETRY CACHE CONSISTENCY ===")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gateways WHERE id = 'A'")
    original_gateway = dict(cursor.fetchone())
    cursor.execute("SELECT * FROM incidents WHERE id = 'INC-2048'")
    original_incident = cursor.fetchone()
    cursor.execute("SELECT id FROM audit_trail")
    original_audit_ids = {row["id"] for row in cursor.fetchall()}
    cursor.execute("SELECT COALESCE(MAX(id), 0) FROM gateway_telemetry")
    original_telemetry_id = cursor.fetchone()[0]
    conn.close()

    try:
        telemetry = TelemetryAgent()
        telemetry.get_health_matrix()
        trigger_incident_v1()
        matrix = telemetry.get_health_matrix()
        observed = matrix["A"]
        assert observed["success_rate"] == 90.8
        assert observed["latency_ms"] == 780
        assert observed["risk_level"] == "HIGH"
        assert observed["status"] == "DEGRADED"
        assert get_cached_gateway_state("A")["latency_ms"] == 780

        selection = RouteSelectionAgent().select_routes(
            transaction_context={"merchant_id": "merch_demo_foodapp", "amount": 500, "payment_method": "UPI"},
            health_matrix=matrix
        )
        assert selection["primary_gateway"] != "A"
        print("[PASS] Incident invalidation reaches Agent 1 and Agent 2 avoids degraded Gateway A.")
    finally:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE gateways SET health = ?, success_rate = ?, latency_ms = ?, p95_ms = ?, p99_ms = ?,
            errors_pct = ?, timeouts_pct = ?, risk_level = ? WHERE id = 'A'
        """, tuple(original_gateway[column] for column in (
            "health", "success_rate", "latency_ms", "p95_ms", "p99_ms",
            "errors_pct", "timeouts_pct", "risk_level"
        )))
        if original_incident:
            cursor.execute("""
            INSERT OR REPLACE INTO incidents
                (id, title, detected_at, gateway, success_rate, predicted_risk, root_cause,
                 mitigation_action, status, timeline_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, tuple(original_incident))
        else:
            cursor.execute("DELETE FROM incidents WHERE id = 'INC-2048'")
        cursor.execute("SELECT id FROM audit_trail")
        added_audit_ids = [row["id"] for row in cursor.fetchall() if row["id"] not in original_audit_ids]
        if added_audit_ids:
            cursor.executemany("DELETE FROM audit_trail WHERE id = ?", [(audit_id,) for audit_id in added_audit_ids])
        cursor.execute("DELETE FROM gateway_telemetry WHERE id > ?", (original_telemetry_id,))
        conn.commit()
        conn.close()
        invalidate_cached_gateway_state("A")
        TelemetryAgent().get_health_matrix()

def test_scenario_3_idempotency():
    print("\n=== TEST 3: DUPLICATE IDEMPOTENCY KEY ===")
    idem_key = f"order_idem_{int(time.time()*1000)}"
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 750.0,
        "currency": "INR",
        "payment_method": "UPI",
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
        "payment_method": "UPI",
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
            "payment_method": "UPI",
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

def test_idempotency_lock_ttl():
    print("\n=== TEST 6: IDEMPOTENCY LOCK TTL ===")
    cache = InMemoryCache()
    assert cache.setnx("lock_ttl", "first", ex=1), "First lock should be acquired"
    assert not cache.setnx("lock_ttl", "duplicate", ex=1), "Concurrent lock should be rejected"
    time.sleep(1.05)
    assert cache.setnx("lock_ttl", "after_expiry", ex=1), "Expired in-memory lock should be reacquired"

    lock_key = f"test_release_{int(time.time() * 1000)}"
    assert acquire_idempotency_lock(lock_key, ttl=5), "Lock should be acquired"
    assert not acquire_idempotency_lock(lock_key, ttl=5), "Duplicate lock should be rejected"
    release_idempotency_lock(lock_key)
    assert acquire_idempotency_lock(lock_key, ttl=5), "Released lock should be reacquired"
    release_idempotency_lock(lock_key)
    print("[PASS] In-memory TTL expiration and explicit lock release verified.")

def test_concurrent_idempotency_requests():
    print("\n=== TEST 7: CONCURRENT IDEMPOTENCY REQUESTS ===")
    idem_key = f"order_concurrent_{int(time.time() * 1000)}"
    payload = {
        "merchant_id": "merch_demo_foodapp",
        "amount": 725.0,
        "currency": "INR",
        "payment_method": "UPI",
        "idempotency_key": idem_key
    }

    def send_request(_):
        response = requests.post(f"{BASE_URL}/api/v1/orchestrator/route", json=payload)
        assert response.status_code == 200, f"Concurrent request failed: {response.status_code}"
        return response.json()

    with ThreadPoolExecutor(max_workers=12) as pool:
        responses = list(pool.map(send_request, range(12)))

    routed = [response for response in responses if response.get("status") == "ROUTED"]
    transaction_ids = {response.get("transaction_id") for response in responses if response.get("transaction_id")}
    assert len(routed) == 1, f"Expected one routed payment, got {len(routed)}"
    assert len(transaction_ids) == 1, f"Expected one transaction ID, got {transaction_ids}"
    assert all(response.get("duplicate_detected") or response.get("status") == "ROUTED" for response in responses)
    print("[PASS] 12 concurrent identical requests produced exactly one routed transaction.")

if __name__ == "__main__":
    test_endpoints()
    test_scenario_1_normal_payment()
    test_scenario_2_failed_primary_safe_fallback()
    test_scenario_2b_primary_hard_failure_fallback()
    test_scenario_3_idempotency()
    test_scenario_4_validation_revision()
    test_scenario_5_rapid_audit_transactions()
    test_idempotency_lock_ttl()
    test_concurrent_idempotency_requests()
    test_fallback_failure_and_charged_primary_guard()
    test_gateway_adapter_mapping()
    test_incident_cache_consistency()
    print("\nALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!")
