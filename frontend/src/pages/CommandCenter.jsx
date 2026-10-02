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
    tps,
    running,
    autoRecovered,
    gateways,
    log,
    incidents
  } = useSim();

  const isDegraded = gateways.A.risk === "HIGH" || gateways.B.risk === "HIGH" || gateways.C.risk === "HIGH";
  const activeGatewayCount = Object.values(gateways).filter((gateway) => gateway.risk !== "HIGH").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Command Center"
        sub="Real-time payment routing operations and agent activity."
        right={<IncidentControls />}
      />

      <div className="console-kpi-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Transaction Throughput" tone="cyan" sub="Live payment traffic">
          <AnimatedNumber value={tps} /> <span className="text-sm font-medium text-muted-foreground">tx/s</span>
        </StatCard>
        <StatCard label="Success Rate" tone="good" sub="Target: > 98.0%">
          <AnimatedNumber value={overall} decimals={1} suffix="%" />
        </StatCard>
        <StatCard label="Active Gateways" tone={isDegraded ? "warn" : "good"} sub="Processors available">
          <span>{activeGatewayCount} <span className="text-sm font-medium text-muted-foreground">/ 3</span></span>
        </StatCard>
        <StatCard label="Fallback Events" tone="default" sub="Idempotent recovery">
          <AnimatedNumber value={autoRecovered} />
        </StatCard>
        <StatCard label="Average Latency" tone="default" sub="SLA limit: 500ms">
          <AnimatedNumber value={routingLatency} suffix="ms" />
        </StatCard>
      </div>

      <div className="console-command-main grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <Card title="Live Transaction Stream" right={<span className="font-mono text-[11px] font-semibold tracking-wider text-cyan">LIVE</span>} bodyClass="p-0">
          <TransactionsTable limit={14} />
        </Card>

        <Card title="Gateway Health">
          <div className="console-gateway-list divide-y divide-border/50">
            {Object.values(gateways).map((gateway) => (
              <div key={gateway.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <span className={`h-2 w-2 rounded-full ${gateway.risk === "HIGH" ? "bg-danger" : "bg-success"}`} />
                    {gateway.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{gateway.processor}</div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className={gateway.risk === "HIGH" ? "text-warning" : "text-success"}>
                    {gateway.risk === "HIGH" ? "DEGRADED" : "ONLINE"}
                  </div>
                  <div className="mt-1 text-muted-foreground">{gateway.latency} ms · {gateway.success.toFixed(1)}%</div>
                </div>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-cyan" style={{ width: `${gateway.health}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">AI Agent Pipeline</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{running ? "Active lifecycle loop" : "Continuous observability"}</span>
        </div>
        <StageLoopBar />
      </section>

      <div className="console-command-lower grid gap-5">
        <Card title="Routing Activity">
          <RoutingMap detailed={true} />
        </Card>

        <Card title="Recent Incidents & Activity">
          {log.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {log.map((entry, idx) => (
                <div key={entry.ts + "-" + idx} className="flex items-start gap-3 border-b border-border/40 py-2 last:border-0">
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatTime(entry.ts, true)}</span>
                  <span className="text-xs leading-relaxed text-foreground">{entry.text}</span>
                </div>
              ))}
            </div>
          ) : incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.slice(0, 4).map((incident) => (
                <div key={incident.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-mono text-xs font-semibold text-foreground">{incident.id} · Gateway {incident.gateway}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{incident.title}</div>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-success">{incident.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">No recent incident activity.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
