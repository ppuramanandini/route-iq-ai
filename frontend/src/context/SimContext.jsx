import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { clamp, getRiskLevel } from "../lib/utils";

const SimContext = createContext(null);

export const MERCHANTS = ["FoodApp", "TravelNow", "ShopSphere", "TicketHub"];

export const BASELINE = {
  A: { success: 98.4, latency: 180, traffic: 42 },
  B: { success: 98.7, latency: 182, traffic: 40 },
  C: { success: 96.1, latency: 310, traffic: 18 }
};

export const STAGES = [
  "TELEMETRY",
  "SELECTION",
  "VALIDATION",
  "EXECUTION",
  "AUDIT & LEARN"
];

export const INCIDENT_STEPS = [
  { A: BASELINE.A, B: BASELINE.B, C: BASELINE.C, tpsMul: 1, stage: 0, note: "Gateway A healthy — baseline telemetry" },
  { A: { success: 98.2, latency: 190, traffic: 42 }, B: BASELINE.B, C: BASELINE.C, tpsMul: 1.25, stage: 0, note: "Payment traffic surge +25%" },
  { A: { success: 97.2, latency: 320, traffic: 42 }, B: BASELINE.B, C: BASELINE.C, tpsMul: 1.3, stage: 0, note: "Gateway A latency rising (320 ms)" },
  { A: { success: 95.1, latency: 520, traffic: 42 }, B: BASELINE.B, C: BASELINE.C, tpsMul: 1.3, stage: 1, note: "Gateway A success falling (95.1%) — evaluating candidate routes" },
  { A: { success: 93.0, latency: 780, traffic: 42 }, B: BASELINE.B, C: BASELINE.C, tpsMul: 1.3, stage: 1, note: "Route Selection Agent: SLA latency threshold breach detected on Gateway A" },
  { A: { success: 90.8, latency: 780, traffic: 42 }, B: BASELINE.B, C: BASELINE.C, tpsMul: 1.3, stage: 2, note: "Zero-Trust Validation Agent: challenge triggered (GW_504 anomaly)" },
  { A: { success: 90.8, latency: 790, traffic: 42 }, B: BASELINE.B, C: BASELINE.C, tpsMul: 1.3, stage: 2, note: "Zero-Trust Validation Agent: REVISE issued → candidate shift to Gateway B" },
  { A: { success: 90.6, latency: 790, traffic: 42 }, B: BASELINE.B, C: BASELINE.C, tpsMul: 1.3, stage: 2, note: "Zero-Trust Validation Agent: Revised candidate PASSED · 0 duplicate debit risk" },
  { A: { success: 92.5, latency: 610, traffic: 25 }, B: { success: 98.5, latency: 196, traffic: 57 }, C: BASELINE.C, tpsMul: 1.3, stage: 3, note: "Safe Fallback: 40% traffic shifted to Gateway B" },
  { A: { success: 94.8, latency: 420, traffic: 25 }, B: { success: 98.4, latency: 205, traffic: 57 }, C: BASELINE.C, tpsMul: 1.3, stage: 3, note: "Gateway B absorbing load safely without duplicate debits" },
  { A: { success: 96.2, latency: 330, traffic: 25 }, B: { success: 98.4, latency: 204, traffic: 57 }, C: BASELINE.C, tpsMul: 1.25, stage: 3, note: "Overall success improving across payment rails" },
  { A: { success: 96.8, latency: 300, traffic: 25 }, B: { success: 98.5, latency: 200, traffic: 57 }, C: BASELINE.C, tpsMul: 1.2, stage: 3, note: "Safe Fallback verified: RECOVERED (97.8%)" },
  { A: { success: 97.0, latency: 290, traffic: 25 }, B: { success: 98.6, latency: 198, traffic: 57 }, C: BASELINE.C, tpsMul: 1.15, stage: 4, note: "Audit, Incident & Continuous Learning Agent: logged & routing rule refined" }
];

export const AGENTS_DEF = [
  { id: 1, key: "telemetry", name: "Gateway Health & Telemetry Agent", verb: "OBSERVING", purpose: "Collect real-time payment events, monitor p95 latency, timeouts, and normalize gateway health telemetry.", inputs: ["Transactions", "Latency", "Errors", "Timeouts", "Capacity"] },
  { id: 2, key: "selection", name: "Route Eligibility & Selection Agent", verb: "SELECTING", purpose: "Evaluate transaction context, merchant eligibility, payment rail, SLA, cost, and routing rules to select Primary and Fallback routes.", inputs: ["Health matrix", "Merchant SLA", "Payment rail", "Cost model", "Routing rules"] },
  { id: 3, key: "validation", name: "Zero-Trust Route Validation Agent", verb: "VALIDATING", purpose: "Independently validate candidate routes against SLA, policy guardrails, duplicate-debit hazard, and active incidents. Emits PASS or REVISE.", inputs: ["Primary candidate", "Fallback candidate", "SLA limits", "Idempotency store", "Active incidents"] },
  { id: 4, key: "execution", name: "Intelligent Routing & Safe Fallback Agent", verb: "EXECUTING", purpose: "Execute primary payment, monitor response, detect timeouts or errors, verify state, and coordinate autonomous safe fallback.", inputs: ["Validated primary", "Validated fallback", "Timeout detector", "Duplicate debit guard"] },
  { id: 5, key: "audit", name: "Audit, Incident & Continuous Learning Agent", verb: "AUDITING & LEARNING", purpose: "Persist immutable audit logs, record routing history, manage incident lifecycles, and refine routing rules via historical analysis without ML.", inputs: ["Transaction outcomes", "Routing history", "Audit records", "Incident events", "Rule refinement engine"] }
];

export function getInitialAgents() {
  const base = {
    telemetry: ["Streaming 3 gateways · 0 anomalies in window", 99, ["~1,842 events/s ingested", "Clock skew < 4ms"], "Publish telemetry frames"],
    selection: ["Primary Gateway A selected · Fallback Gateway B active", 96, ["A score 98.2 · B score 97.9", "SLA 500ms compliant"], "Emit candidate pair"],
    validation: ["Zero-trust verified: Gateway A PASS · SLA 500ms OK", 100, ["SLA latency < 500ms", "Zero double-debit risk"], "Approve execution"],
    execution: ["Payment execution engine nominal · Safe fallback ready", 98, ["Primary adapter active", "Fallback verifier armed"], "Execute transaction"],
    audit: ["Audit ledger immutable · Continuous rule refinement active", 99, ["Audit trail synchronized", "0 penalties active"], "Commit audit trail"]
  };
  return AGENTS_DEF.map((t) => {
    const [out, conf, ev, act] = base[t.key];
    return {
      ...t,
      status: "idle",
      output: out,
      confidence: conf,
      evidence: ev,
      action: act,
      ts: null
    };
  });
}

export const AGENT_UPDATES_BY_STEP = {
  1: {
    telemetry: { status: "running", output: "Traffic surge detected: +25% TPS on all routes", confidence: 99, evidence: ["TPS 1,842 → 2,300", "Gateway A queue depth rising"], action: "Emit TelemetryFrame" }
  },
  2: {
    telemetry: { status: "done", output: "Gateway A latency anomaly: 180 → 320 ms", evidence: ["p95 latency +78%", "Timeouts 0.4% → 1.9%"] },
    selection: { status: "running", output: "Evaluating candidate scores with rising Gateway A latency", confidence: 93, evidence: ["Baseline latency 175ms", "Current 320ms"], action: "Re-score routes" }
  },
  3: {
    selection: { status: "running", output: "Gateway A health deteriorating (95.1%) — evaluating Fallback B", confidence: 85, evidence: ["Success slope −1.1%/30s"], action: "Prepare candidate shift" }
  },
  4: {
    telemetry: { status: "done", output: "Gateway A latency 780ms (> 500ms SLA). Health DEGRADED", confidence: 94, evidence: ["Latency 780ms > 500ms", "Risk HIGH"], action: "Update health matrix" },
    validation: { status: "running", output: "Challenging candidate route Gateway A: SLA latency breached", confidence: 96, evidence: ["Threshold 500ms breached", "GW_504 pattern detected"], action: "Trigger Validation Challenge" }
  },
  5: {
    validation: { status: "done", output: "REVISE issued with structured feedback: Gateway A violates SLA", confidence: 99, evidence: ["Failed check: SLA_LATENCY_VIOLATION", "Suggested exclusion: Gateway A"], action: "Send Structured Feedback" }
  },
  6: {
    selection: { status: "done", output: "Revision 1 executed: Primary → Gateway B, Fallback → Gateway C", confidence: 95, evidence: ["Gateway A excluded per Agent 3 feedback", "Gateway B score 98.1% ✓"], action: "Submit Revised Route" },
    validation: { status: "done", output: "PASS: Revised Primary Gateway B verified zero-trust compliant", confidence: 100, evidence: ["Gateway B latency 196ms < 500ms SLA", "Revision count: 1 (final)"], action: "Approve to Agent 4" }
  },
  7: {
    execution: { status: "running", output: "Safe Fallback Coordinator: verified 0 double debits, armed Gateway B", confidence: 99, evidence: ["2 timed-out payments checked", "Idempotency locked"], action: "Execute Fallback Route" }
  },
  8: {
    execution: { status: "running", output: "Routing traffic to Gateway B (routing split 25/57/18)", confidence: 95, evidence: ["Canary 5% → 20% → 40%", "Safe fallback engaged"], action: "Monitor execution" }
  },
  11: {
    execution: { status: "done", output: "Fallback Success: Gateway B capturing at 98.5% · Status RECOVERED", confidence: 98, evidence: ["Latency restored to 198ms", "Zero double debits"], action: "Finalize status" },
    audit: { status: "running", output: "Recording routing history and evaluating continuous learning rules", confidence: 96, evidence: ["Revision count: 1", "Fallback triggered: True"], action: "Refine routing rules" }
  },
  12: {
    audit: { status: "done", output: "Audit log AUD-7713 committed · Updated routing configuration saved", confidence: 99, evidence: ["Gateway A preference reduced -12pts", "Rule refinement saved to DB"], action: "Sync routing configuration" }
  }
};

export function getInitialGateways() {
  const meta = {
    A: ["Processor: Razorpay-sim", 1.8, 1200],
    B: ["Processor: Stripe-sim", 2.1, 1500],
    C: ["Processor: PayU-sim", 1.4, 700]
  };
  const g = {};
  ["A", "B", "C"].forEach((k) => {
    const base = BASELINE[k];
    g[k] = {
      id: k,
      name: `Gateway ${k}`,
      processor: meta[k][0],
      health: Math.round(base.success - 0.5),
      success: base.success,
      latency: base.latency,
      p95: Math.round(base.latency * 1.9),
      p99: Math.round(base.latency * 3.1),
      errors: +(100 - base.success - 0.3).toFixed(1),
      timeouts: 0.4,
      traffic: base.traffic,
      cost: meta[k][1],
      tps: Math.round((1842 * base.traffic) / 100),
      capacity: meta[k][2],
      degradeProb: k === "C" ? 12 : 4,
      risk: getRiskLevel(base.success, base.latency)
    };
  });
  return g;
}

export function getInitialHistory() {
  return Array.from({ length: 60 }, (_, i) => {
    const sinVal = Math.sin(i / 4);
    return {
      t: `-${60 - i}s`,
      A: +(98.3 + sinVal * 0.2).toFixed(2),
      B: +(98.7 + Math.cos(i / 5) * 0.15).toFixed(2),
      C: +(96.1 + sinVal * 0.3).toFixed(2),
      latA: Math.round(180 + sinVal * 8),
      latB: Math.round(182 + Math.cos(i / 3) * 6),
      latC: Math.round(310 + sinVal * 12),
      overall: +(98.1 + sinVal * 0.15).toFixed(2),
      tps: Math.round(1842 + sinVal * 60),
      trA: 42,
      trB: 40,
      trC: 18
    };
  });
}

export const INITIAL_AUDIT = [
  {
    id: "AUD-7712",
    ts: 0,
    action: "Traffic shifted",
    from: "Gateway C",
    to: "Gateway B",
    amount: "20%",
    reason: "Scheduled maintenance window on processor",
    confidence: 99,
    simulation: "20% shift kept success at 98.5%",
    guardrail: "PASSED",
    verification: "STABLE",
    agent: "Intelligent Routing & Safe Fallback Agent"
  },
  {
    id: "AUD-7711",
    ts: 0,
    action: "Retry blocked",
    reason: "Payment state SUCCESS at issuer — duplicate debit prevented",
    confidence: 100,
    guardrail: "N/A",
    verification: "SAFE",
    agent: "Zero-Trust Route Validation Agent"
  },
  {
    id: "AUD-7710",
    ts: 0,
    action: "Rollback",
    from: "Gateway B",
    to: "Gateway C",
    amount: "20%",
    reason: "Gateway C recovered after maintenance",
    confidence: 96,
    simulation: "Restored cost-optimal split",
    guardrail: "PASSED",
    verification: "RECOVERED",
    agent: "Intelligent Routing & Safe Fallback Agent"
  }
];

export const INITIAL_INCIDENTS = [
  {
    id: "INC-2047",
    title: "Gateway C processor maintenance",
    detected: 0,
    gateway: "C",
    success: 95.2,
    predicted: "MEDIUM",
    risk: "MEDIUM",
    rootCause: "Planned acquirer maintenance",
    action: "20% traffic shift → Gateway B",
    status: "RECOVERED",
    timeline: []
  }
];

let txCounter = 90041;
const INCIDENT_INTERVAL = 2600;

export function SimProvider({ children }) {
  const [state, setState] = useState(() => ({
    gateways: getInitialGateways(),
    history: getInitialHistory(),
    txs: [],
    agents: getInitialAgents(),
    audit: INITIAL_AUDIT,
    incidents: INITIAL_INCIDENTS,
    step: -1,
    stage: 0,
    overall: 98.1,
    tps: 1842,
    routingLatency: 184,
    autoRecovered: 12481,
    dupPrevented: 37,
    shift: 0,
    log: [],
    now: Date.now()
  }));

  const stepTimerRef = useRef(0);

  // Initialize timestamps
  useEffect(() => {
    setState((s) => {
      const now = Date.now();
      return {
        ...s,
        now,
        audit: s.audit.map((a, idx) => (a.ts ? a : { ...a, ts: now - (idx + 1) * 3600000 * 3 })),
        incidents: s.incidents.map((inc) => (inc.detected ? inc : { ...inc, detected: now - 86400000 }))
      };
    });

    const ticker = window.setInterval(() => {
      setState((prev) => tickSimulation(prev));
    }, 1000);

    return () => window.clearInterval(ticker);
  }, []);

  const stepIncident = useCallback(() => {
    setState((prev) => {
      if (prev.step < 0) return prev;
      const nextStep = prev.step + 1;
      if (nextStep >= INCIDENT_STEPS.length) {
        window.clearInterval(stepTimerRef.current);
        return { ...prev, step: -1, stage: 0 };
      }
      return applyIncidentStep(prev, nextStep);
    });
  }, []);

  const runIncident = useCallback(() => {
    window.clearInterval(stepTimerRef.current);
    setState((prev) => applyIncidentStep({ ...prev, gateways: getInitialGateways(), agents: getInitialAgents(), shift: 0, log: [] }, 0));
    stepTimerRef.current = window.setInterval(stepIncident, INCIDENT_INTERVAL);
  }, [stepIncident]);

  const reset = useCallback(() => {
    window.clearInterval(stepTimerRef.current);
    setState((prev) => ({
      ...prev,
      step: -1,
      stage: 0,
      gateways: getInitialGateways(),
      agents: getInitialAgents(),
      shift: 0
    }));
  }, []);

  useEffect(() => () => window.clearInterval(stepTimerRef.current), []);

  const value = {
    ...state,
    running: state.step >= 0,
    runIncident,
    reset
  };

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used within a SimProvider");
  return ctx;
}

function getTargetTargets(state) {
  if (state.step >= 0) {
    return INCIDENT_STEPS[state.step];
  }
  if (state.shift > 0) {
    return {
      A: { success: 97.6, latency: 230, traffic: 25 },
      B: { ...BASELINE.B, traffic: 57 },
      C: BASELINE.C
    };
  }
  return BASELINE;
}

function tickSimulation(prev) {
  const now = Date.now();
  const target = getTargetTargets(prev);
  const tpsMul = prev.step >= 0 ? INCIDENT_STEPS[prev.step].tpsMul : 1;
  const newGateways = { ...prev.gateways };

  ["A", "B", "C"].forEach((k) => {
    const cur = newGateways[k];
    const tgt = target[k];
    const succ = clamp(cur.success + (tgt.success - cur.success) * 0.45 + (Math.random() - 0.5) * 0.2, 60, 99.9);
    const lat = Math.max(60, cur.latency + (tgt.latency - cur.latency) * 0.45 + (Math.random() - 0.5) * 10);
    const traf = cur.traffic + (tgt.traffic - cur.traffic) * 0.5;
    const timeouts = clamp((lat - 170) / 100, 0.2, 12);

    newGateways[k] = {
      ...cur,
      success: +succ.toFixed(2),
      latency: Math.round(lat),
      p95: Math.round(lat * 1.9),
      p99: Math.round(lat * 3.1),
      traffic: +traf.toFixed(1),
      timeouts: +timeouts.toFixed(1),
      errors: +clamp(100 - succ - timeouts * 0.2, 0.2, 40).toFixed(1),
      health: Math.round(clamp(succ - (lat > 500 ? 3 : 0) - 0.4, 0, 100)),
      tps: Math.round((1842 * tpsMul * traf) / 100),
      risk: getRiskLevel(succ, lat),
      degradeProb: Math.round(clamp((99 - succ) * 9 + (lat - 180) / 12, 2, 97))
    };
  });

  const totalTraffic = newGateways.A.traffic + newGateways.B.traffic + newGateways.C.traffic;
  const overallSuccess = +(
    (newGateways.A.success * newGateways.A.traffic +
      newGateways.B.success * newGateways.B.traffic +
      newGateways.C.success * newGateways.C.traffic) /
    totalTraffic
  ).toFixed(2);
  const overallTps = Math.round(1842 * tpsMul + (Math.random() - 0.5) * 80);
  const overallLatency = Math.round(
    (newGateways.A.latency * newGateways.A.traffic +
      newGateways.B.latency * newGateways.B.traffic +
      newGateways.C.latency * newGateways.C.traffic) /
      totalTraffic
  );

  const newTxs = [];
  let autoRecovered = prev.autoRecovered;
  let dupPrevented = prev.dupPrevented;
  const count = 2 + Math.floor(Math.random() * 2);

  for (let i = 0; i < count; i++) {
    const rnd = Math.random() * totalTraffic;
    const gw = rnd < newGateways.A.traffic ? "A" : rnd < newGateways.A.traffic + newGateways.B.traffic ? "B" : "C";
    const g = newGateways[gw];
    const roll = Math.random() * 100;
    let status = "SUCCESS";
    let lat = Math.round(g.latency * (0.7 + Math.random() * 0.6));
    let retry = false;
    let decision = prev.shift > 0 && gw === "B" ? "Shifted (self-healing)" : "Auto-routed";

    if (roll > g.success) {
      if (Math.random() < g.timeouts / (g.timeouts + 1)) {
        status = "TIMEOUT";
        lat = 1500 + Math.round(Math.random() * 600);
        if (Math.random() < 0.5) {
          status = "RECOVERED";
          retry = true;
          decision = "Idempotent retry → B";
          autoRecovered++;
          if (Math.random() < 0.15) dupPrevented++;
        }
      } else {
        status = "FAILED";
      }
    }

    const methods = ["UPI", "UPI", "CARD", "NETBANKING", "WALLET"];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const amounts = [500, 8450, 1240, 32500, 299, 1899, 650, 4200];
    const amount = amounts[Math.floor(Math.random() * amounts.length)] + (Math.random() < 0.5 ? 0 : Math.round(Math.random() * 100));

    newTxs.push({
      id: `TX-${txCounter++}`,
      ts: now + i * 120,
      merchant: MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)],
      amount,
      method,
      gateway: gw,
      status,
      latency: lat,
      retry,
      risk: g.risk,
      decision
    });
  }

  const d = new Date(now);
  const timeStr = `${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  const newHistory = [
    ...prev.history.slice(1),
    {
      t: timeStr,
      A: newGateways.A.success,
      B: newGateways.B.success,
      C: newGateways.C.success,
      latA: newGateways.A.latency,
      latB: newGateways.B.latency,
      latC: newGateways.C.latency,
      overall: overallSuccess,
      tps: overallTps,
      trA: Math.round(newGateways.A.traffic),
      trB: Math.round(newGateways.B.traffic),
      trC: Math.round(newGateways.C.traffic)
    }
  ];

  return {
    ...prev,
    now,
    gateways: newGateways,
    overall: overallSuccess,
    tps: overallTps,
    routingLatency: overallLatency,
    history: newHistory,
    txs: [...newTxs.reverse(), ...prev.txs].slice(0, 250),
    dupPrevented,
    autoRecovered
  };
}

function applyIncidentStep(prev, stepIndex) {
  const now = Date.now();
  const stepData = INCIDENT_STEPS[stepIndex];
  const stepAgentUpdates = AGENT_UPDATES_BY_STEP[stepIndex] || {};

  const updatedAgents = prev.agents.map((ag) =>
    stepAgentUpdates[ag.key] ? { ...ag, ...stepAgentUpdates[ag.key], ts: now } : ag
  );

  let incidents = [...prev.incidents];
  let audit = [...prev.audit];
  let shift = prev.shift;
  let dupPrevented = prev.dupPrevented;
  let autoRecovered = prev.autoRecovered;
  const incId = "INC-2048";
  const mkTimeline = (label) => ({ ts: now, label });

  if (stepIndex === 0) {
    incidents = incidents.filter((x) => x.id !== incId);
  }

  if (stepIndex === 4) {
    incidents = [
      {
        id: incId,
        title: "Gateway A degradation",
        detected: now,
        gateway: "A",
        success: 93,
        predicted: "HIGH",
        risk: "HIGH",
        rootCause: "Analyzing…",
        action: "Pending candidate evaluation",
        status: "DETECTING",
        timeline: [mkTimeline("Gateway degradation detected from observed telemetry")]
      },
      ...incidents
    ];
  }

  const updateCurrentIncident = (fn) => {
    incidents = incidents.map((x) => (x.id === incId ? fn(x) : x));
  };

  if (stepIndex === 5) {
    updateCurrentIncident((inc) => ({
      ...inc,
      success: 90.8,
      rootCause: "Timeout + latency anomaly",
      timeline: [...inc.timeline, mkTimeline("Root cause: timeout + latency anomaly (GW_504)")]
    }));
  }

  if (stepIndex === 6) {
    updateCurrentIncident((inc) => ({
      ...inc,
      action: "40% traffic shift → Gateway B",
      status: "MITIGATING",
      timeline: [...inc.timeline, mkTimeline("Route candidate evaluated: 40% shift to Gateway B")]
    }));
  }

  if (stepIndex === 7) {
    dupPrevented += 2;
    updateCurrentIncident((inc) => ({
      ...inc,
      timeline: [...inc.timeline, mkTimeline("Zero-Trust Validation PASSED · 0 duplicate debits")]
    }));
  }

  if (stepIndex === 8) {
    shift = 40;
    updateCurrentIncident((inc) => ({
      ...inc,
      status: "IN PROGRESS",
      timeline: [...inc.timeline, mkTimeline("Traffic shift executed: 42/40/18 → 25/57/18")]
    }));
  }

  if (stepIndex === 11) {
    autoRecovered += 412;
    updateCurrentIncident((inc) => ({
      ...inc,
      status: "RECOVERED",
      success: 97.8,
      timeline: [...inc.timeline, mkTimeline("Recovery verified: 90.8% → 97.8%")]
    }));
  }

  if (stepIndex === 12) {
    audit = [
      {
        id: `AUD-${7713 + Math.floor(Math.random() * 100)}`,
        ts: now,
        action: "Traffic shifted",
        from: "Gateway A",
        to: "Gateway B",
        amount: "40%",
        reason: "Observed gateway degradation on Gateway A (SLA breach)",
        confidence: 94,
        simulation: "40% shift restored target SLA (98.1%)",
        guardrail: "PASSED",
        verification: "RECOVERED",
        agent: "Intelligent Routing & Safe Fallback Agent"
      },
      {
        id: `AUD-${7813 + Math.floor(Math.random() * 100)}`,
        ts: now - 4000,
        action: "Retries gated",
        reason: "2 timed-out payments already SUCCESS at issuer — retry blocked",
        confidence: 100,
        guardrail: "N/A",
        verification: "SAFE",
        agent: "Zero-Trust Route Validation Agent"
      },
      ...audit
    ];
  }

  return {
    ...prev,
    step: stepIndex,
    stage: stepData.stage,
    agents: updatedAgents,
    incidents,
    audit,
    shift,
    dupPrevented,
    autoRecovered,
    log: [{ ts: now, text: stepData.note }, ...prev.log].slice(0, 30)
  };
}
