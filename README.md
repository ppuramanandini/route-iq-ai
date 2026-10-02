# SwitchRouteIQ - Autonomous Payment Routing Infrastructure
'''Don't wait for payment failure. Detect and prevent it'''

**Problem**

Modern payment systems rely on multiple gateways, but many still use static routing rules. When a gateway becomes slow, overloaded, degraded, or unavailable, transactions may continue to be routed through it.

**This can result in:**

**Payment failures and timeouts** - Transactions fail when the selected gateway cannot process them reliably.
**Increased latency** - Slow gateways delay payment confirmation and checkout completion.
**Repeated retries **- Failed transactions may be retried unnecessarily, increasing load and processing time.
**Duplicate-debit risk** - Retrying or switching gateways without proper transaction handling can result in multiple debit attempts.
**Revenue loss** - Failed payments can directly lead to lost purchases and abandoned transactions.

**Solution**

SwitchRouteIQ is an autonomous multi-gateway payment routing platform designed to keep digital payments reliable even when payment gateways experience latency, timeouts, errors, or temporary degradation.
The platform continuously monitors gateway health, evaluates multiple routing options, validates candidate routes using zero-trust policies, executes payments safely, and learns from historical routing outcomes to refine future decisions.

🌐Live Demo
Frontend: https://ppuramanandini.github.io/route-iq-ai/

Built using:
- **Frontend**: HTML5, CSS (exact production design tokens, glassmorphism, animations), JavaScript, React.js (Vite), Lucide Icons, and Recharts.
- **Backend**: Python FastAPI with RESTful endpoints, Prometheus metrics, and a 5-agent orchestration engine.
- **Database**: SQLite with persistent relational tables for gateways, live transactions, audit logs, incidents, routing history, and continuous learning routing rules.

---

## 5-Agent Architecture

The core system consists of exactly five specialized agents:

1. **Gateway Health & Telemetry Agent**:
   Ingests payment events, calculates real-time p50/p95/p99 latencies, tracks timeout and error rates, normalizes health scores, and publishes health frames.
2. **Route Eligibility & Selection Agent**:
   Evaluates transaction context, payment rail, merchant SLA, cost models, and refined routing rules to select Primary and Fallback candidate routes.
3. **Zero-Trust Route Validation Agent**:
   Independently validates candidate route pairs against SLA latency limits, duplicate-debit hazard, active incidents, and policy constraints. Issues `PASS` or structured `REVISE` feedback (allowing at most one revision).
4. **Intelligent Routing & Safe Fallback Agent**:
   Executes primary gateway transactions, monitors responses, performs state verification at the issuer upon timeouts, locks idempotency keys, and triggers safe fallback routing without duplicate debits.
5. **Audit, Incident & Continuous Learning Agent**:
   Persists immutable audit log entries, updates routing history, manages incident lifecycles, and refines routing rules and penalties based on observed historical outcomes.

> **Note on Continuous Learning**:  
> Continuous Learning is implemented as rule and threshold refinement from historical routing outcomes; no machine-learning model is used.

### Core Processing Flow

```
Payment
  ↓
Agent 1 — Gateway Health & Telemetry
  ↓
Agent 2 — Route Eligibility & Selection
  ↓
Agent 3 — Zero-Trust Route Validation
  ↓ (PASS)  [or REVISE with structured feedback → Agent 2, max 1 revision]
Agent 4 — Intelligent Routing & Safe Fallback
  ↓
Final Transaction Status
  ↓
Agent 5 — Audit, Incident & Continuous Learning
  ↓
Rule / Threshold Refinement
```

---

## Repository Structure

```
route-iq-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Logo.jsx               # SwitchRouteIQ circuit-routing logo
│   │   │   ├── Layout.jsx             # Top bar, system health status, navigation tabs, session pill
│   │   │   ├── RoutingMap.jsx         # Live animated SVG routing network with particle flows & gateway cards
│   │   │   ├── SectionHeader.jsx      # Page titles and subtitle banners
│   │   │   ├── Card.jsx               # Reusable glassmorphism card container
│   │   │   ├── StatCard.jsx           # KPI stat cards with accent tones
│   │   │   ├── AnimatedNumber.jsx     # Smooth numerical easing counters
│   │   │   ├── RiskBadge.jsx          # LOW, MEDIUM, HIGH risk indicators
│   │   │   ├── StatusBadge.jsx        # SUCCESS, TIMEOUT, RECOVERED, MITIGATING badges
│   │   │   ├── StatusDot.jsx          # Live pulse dot status
│   │   │   ├── IncidentControls.jsx   # "Run live incident" & "Reset" controls
│   │   │   ├── StageLoopBar.jsx       # 5-stage autonomous routing pipeline indicator
│   │   │   ├── TransactionsTable.jsx  # Live transactions list with gateway filter
│   │   │   └── TransactionModal.jsx   # Click-to-inspect trace modal with idempotency & raw payload
│   │   ├── context/
│   │   │   └── SimContext.jsx         # Global state provider managing gateways, history, 5 agents, & simulation
│   │   ├── lib/
│   │   │   └── utils.js               # Formatting (INR, time), What-If calculation formula, strategy ranker
│   │   ├── pages/
│   │   │   ├── SignIn.jsx             # Landing / Sign-in portal with role switcher & sandbox demo access
│   │   │   ├── CommandCenter.jsx      # Executive operations view with KPIs, routing map, & incident log
│   │   │   ├── LiveRouting.jsx        # Live routing network & interactive Pizza order journey demo
│   │   │   ├── GatewayHealth.jsx      # Deep-dive gateway metrics (p50, p95, p99, errors, capacity)
│   │   │   ├── AiAgents.jsx           # Five autonomous agents in active lifecycle
│   │   │   ├── Simulator.jsx          # What-If Lab utility with interactive sliders & trade-off curves
│   │   │   ├── Transactions.jsx       # Real-time transaction stream with filters, pause/play, & search
│   │   │   ├── Recovery.jsx           # Recovery center with active & past incident timelines
│   │   │   ├── AutonomousRecovery.jsx # Architecture comparison (Static fallback vs Autonomous routing)
│   │   │   ├── Analytics.jsx          # 10 Recharts graphs (success trend, latency, distribution, decision success)
│   │   │   ├── AuditTrail.jsx         # Immutable audit records with simulation & guardrail verification
│   │   │   ├── Developer.jsx          # Sandbox API credentials, webhooks, cURL / Node / Python snippets, tester
│   │   │   └── Settings.jsx           # Merchant configuration: SLA thresholds, max shift %, idempotency
│   │   ├── index.css                  # Production CSS styles & design tokens
│   │   └── App.jsx                    # Client-side router & session coordinator
│   └── index.html                     # Typography (Space Grotesk & JetBrains Mono), meta tags, favicon
│
└── backend/
    ├── agents/
    │   ├── telemetry_agent.py         # Agent 1: Gateway Health & Telemetry
    │   ├── selection_agent.py         # Agent 2: Route Eligibility & Selection
    │   ├── validation_agent.py        # Agent 3: Zero-Trust Route Validation
    │   ├── routing_agent.py           # Agent 4: Intelligent Routing & Safe Fallback
    │   ├── audit_agent.py             # Agent 5: Audit, Incident & Continuous Learning
    │   └── orchestrator.py            # 5-Agent coordinator with 1-revision loop
    ├── api/                           # Modular API routers for gateways, routing, agents, audit, etc.
    ├── cache/                         # Redis distributed idempotency locking with in-memory fallback
    ├── gateways/                      # Gateway adapters (Razorpay, Stripe, PayU, and Mock)
    ├── monitoring/                    # Prometheus metrics & SLA monitoring
    ├── database.py                    # SQLite schema initialization and seed data
    ├── main.py                        # FastAPI application mounting all APIs & 5-agent orchestrator
    └── routeiq.db                     # SQLite database file
```

---
<img width="1024" height="1536" alt="drawIO" src="https://github.com/user-attachments/assets/bbff45ae-8232-4eb9-bd24-5b4fe215ca00" />

## Component Views & Routes

1. **Sign-In / Demo Access** (`/`):
   - Executive sign-in with assigned roles (`Merchant Admin`, `Payment Operations`, `Developer`, `Security Administrator`).
   - One-click **"Demo access · sandbox"** for instant entry.
2. **Command Center** (`/command-center`):
   - 6 KPI stat cards (Overall Success %, Routing Latency ms, System Status, 24h Auto-Recovered, Duplicate Debits Prevented, Active Route Split).
   - 5-stage visual pipeline (`TELEMETRY`, `SELECTION`, `VALIDATION`, `EXECUTION`, `AUDIT & LEARN`).
   - Live interactive SVG routing topology with animated particle lines.
   - Real-time transaction stream and autonomous decision log.
3. **Live Routing** (`/live-routing`):
   - Interactive payment journey demonstration illustrating primary route degradation and autonomous safe fallback.
4. **Gateway Health** (`/gateways`):
   - Per-gateway cards for Gateway A (Razorpay-sim), Gateway B (Stripe-sim), and Gateway C (PayU-sim).
   - Telemetry: p50/p95/p99 latency, timeouts %, errors %, cost per tx, throughput TPS, and observed degradation risk.
   - Live comparative telemetry charts.
5. **AI Agents** (`/agents`):
   - Five specialized autonomous agent cards with active status, confidence %, evidence points, and proposed actions.
6. **What-If Simulator** (`/simulator`):
   - Simulation utility for modeling traffic shifts and evaluating candidate strategies against downstream capacity and SLA limits.
7. **Transactions** (`/transactions`):
   - Real-time stream with Pause/Resume, gateway filtering, and search.
   - Click any transaction to open the comprehensive **Transaction Trace Modal**.
8. **Recovery Center** (`/recovery`):
   - Incident records with observed telemetry diagnosis, safe mitigation action, and execution timeline.
9. **Autonomous Recovery** (`/autonomous-recovery`):
   - Comparative architectural matrix contrasting static rule fallback vs autonomous telemetry-driven safe fallback.
10. **Analytics** (`/analytics`):
    - 10 operational charts including 30-day success trends, live gateway comparison, latency trends, traffic distribution, routing decision success rate, and cost optimization.
11. **Audit Trail** (`/audit`):
    - Immutable event log detailing audit ID, timestamp, action, route scope, agent, reason, confidence, and verification status.
12. **Developer / API** (`/developer`):
    - Demo credentials, local endpoints (`http://localhost:8000/api/v1/orchestrator/route`), code snippets, and interactive test console.
13. **Settings** (`/settings`):
    - Merchant configuration for SLA thresholds, max shift %, and idempotency guards.

---

## How to Run

### Backend (FastAPI + SQLite)
```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- API root: `http://127.0.0.1:8000`
- Interactive OpenAPI docs: `http://127.0.0.1:8000/docs`
- Prometheus Metrics: `http://127.0.0.1:8000/metrics`
- 5-Agent Orchestrator Route: `http://127.0.0.1:8000/api/v1/orchestrator/route`

### Frontend (React + Vite)
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- Frontend application: `http://127.0.0.1:5173`
