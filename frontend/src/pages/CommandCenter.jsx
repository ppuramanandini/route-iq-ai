import React from "react";
import { formatTime } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { IncidentControls } from "../components/IncidentControls";
import { StageLoopBar } from "../components/StageLoopBar";
import { Card } from "../components/Card";
import { RoutingMap } from "../components/RoutingMap";
import { TransactionsTable } from "../components/TransactionsTable";

export function CommandCenter() {
  const {
    overall,
    routingLatency,
    running,
    autoRecovered,
    dupPrevented,
    gateways,
    log
  } = useSim();

  const isDegraded = gateways.A.risk === "HIGH" || gateways.B.risk === "HIGH" || gateways.C.risk === "HIGH";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Command Center"
        sub="Executive operational view of payment success, routing latency, gateway risk and autonomous recovery."
        right={<IncidentControls />}
      />

      {/* 6 Top Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Success Rate" tone="good" sub="Target: > 98.0%">
          <AnimatedNumber value={overall} decimals={1} suffix="%" />
        </StatCard>

        <StatCard label="Routing Latency" tone="default" sub="SLA limit: 500ms">
          <AnimatedNumber value={routingLatency} suffix="ms" />
        </StatCard>

        <StatCard
          label="System State"
          tone={running ? "bad" : isDegraded ? "warn" : "good"}
          sub={running ? "Self-healing active" : "Normal operation"}
        >
          <span className="text-xl font-bold">
            {running ? "MITIGATING" : isDegraded ? "DEGRADED" : "NOMINAL"}
          </span>
        </StatCard>

        <StatCard label="Auto-Recovered" tone="violet" sub="Through idempotent retry">
          <AnimatedNumber value={autoRecovered} />
        </StatCard>

        <StatCard label="Duplicate Debits Prevented" tone="cyan" sub="State verified at issuer">
          <AnimatedNumber value={dupPrevented} />
        </StatCard>

        <StatCard label="Active Split" tone="default" sub="A / B / C split %">
          <span className="text-lg font-mono">
            {Math.round(gateways.A.traffic)}/{Math.round(gateways.B.traffic)}/{Math.round(gateways.C.traffic)}
          </span>
        </StatCard>
      </div>

      {/* 5-Agent Autonomous Routing Pipeline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>5-Agent Autonomous Routing Pipeline</span>
          <span>{running ? "Active Lifecycle Loop" : "Continuous Observability"}</span>
        </div>
        <StageLoopBar />
      </div>

      {/* Main Grid: Routing Map & Live Events */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card title="Live Payment Routing Topology">
            <RoutingMap detailed={true} />
          </Card>

          <Card title="Autonomous Decision & Incident Log">
            {log.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground py-4 text-center">
                No active incident telemetry. Click "Run live incident" to watch the autonomous recovery loop.
              </p>
            ) : (
              <div className="space-y-2 font-mono text-xs max-h-56 overflow-y-auto pr-2">
                {log.map((entry, idx) => (
                  <div
                    key={entry.ts + "-" + idx}
                    className="flex items-start gap-3 rounded border border-border/50 bg-secondary/20 p-2"
                  >
                    <span className="text-muted-foreground shrink-0">{formatTime(entry.ts, true)}</span>
                    <span className="text-foreground">{entry.text}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Live Transaction Stream" right={<span className="font-mono text-[10px] text-cyan">REALTIME</span>}>
            <TransactionsTable limit={14} />
          </Card>
        </div>
      </div>
    </div>
  );
}
