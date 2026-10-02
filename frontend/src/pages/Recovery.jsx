import React from "react";
import { formatTime } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { IncidentControls } from "../components/IncidentControls";
import { StatCard } from "../components/StatCard";

export function Recovery() {
  const { incidents } = useSim();
  const activeRecoveries = incidents.filter((incident) => !["RECOVERED", "FAILED"].includes(incident.status)).length;
  const recoveredCount = incidents.filter((incident) => incident.status === "RECOVERED").length;
  const pendingCount = incidents.filter((incident) => incident.status === "DETECTING").length;
  const failedCount = incidents.filter((incident) => incident.status === "FAILED").length;
  const recoveryDurations = incidents
    .filter((incident) => incident.status === "RECOVERED" && incident.timeline?.length > 1)
    .map((incident) => incident.timeline.at(-1).ts - incident.timeline[0].ts);
  const averageRecovery = recoveryDurations.length
    ? `${Math.round(recoveryDurations.reduce((sum, duration) => sum + duration, 0) / recoveryDurations.length / 1000)}s`
    : "—";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Recovery Center"
        sub="Active and resolved gateway incidents with root cause, AI action and recovery timeline."
        right={<IncidentControls />}
      />

      <div className="console-kpi-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active Recoveries" tone={activeRecoveries ? "warn" : "default"} sub="Current mitigation queue">{activeRecoveries}</StatCard>
        <StatCard label="Recovered" tone="good" sub="Verified incidents">{recoveredCount}</StatCard>
        <StatCard label="Pending" tone="warn" sub="Awaiting route action">{pendingCount}</StatCard>
        <StatCard label="Failed" tone="bad" sub="Requires operator review">{failedCount}</StatCard>
        <StatCard label="Avg. Recovery Time" tone="cyan" sub="From recorded timeline">{averageRecovery}</StatCard>
      </div>

      <Card title="Recovery Queue" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] table-fixed" aria-label="Recovery queue">
            <thead><tr><th>Incident</th><th>Gateway</th><th>Detected</th><th>Recovery State</th><th>Fallback</th><th>Status</th><th>Duration</th><th>Action</th></tr></thead>
            <tbody>
              {incidents.map((incident) => {
                const elapsed = incident.timeline?.length > 1
                  ? `${Math.max(0, Math.round((incident.timeline.at(-1).ts - incident.timeline[0].ts) / 1000))}s`
                  : "—";
                return (
                  <tr key={incident.id}>
                    <td className="font-mono font-semibold text-cyan">{incident.id}</td>
                    <td>Gateway {incident.gateway}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{formatTime(incident.detected, true)}</td>
                    <td>{incident.action}</td>
                    <td className="text-muted-foreground">{incident.action.includes("→") ? incident.action.split("→").at(-1).trim() : "Not routed"}</td>
                    <td><StatusBadge status={incident.status} /></td>
                    <td className="font-mono text-muted-foreground">{elapsed}</td>
                    <td className="text-muted-foreground">{incident.status === "RECOVERED" ? "Verified" : "Monitoring"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="console-recovery-details space-y-4">
        {incidents.map((inc) => (
          <Card key={inc.id} className="relative overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-mono text-base font-bold text-foreground">{inc.id}</h3>
                  <span className="font-sans text-base font-semibold">{inc.title}</span>
                  <StatusBadge status={inc.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Target: Gateway {inc.gateway} · Detected: {formatTime(inc.detected, true)}
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">Lowest Success</div>
                  <div className="font-bold text-danger">{inc.success}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">Assessed Risk</div>
                  <div className="font-bold text-warning">{inc.risk || inc.predicted}</div>
                </div>
              </div>
            </div>

            <div className="console-recovery-diagnosis mt-4 grid gap-4">
              <div className="rounded border border-border/60 bg-secondary/20 p-3 font-mono text-xs">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                  Root Cause Diagnosis
                </span>
                <p className="text-foreground">{inc.rootCause}</p>
              </div>

              <div className="rounded border border-border/60 bg-secondary/20 p-3 font-mono text-xs">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                  Autonomous Mitigation Action
                </span>
                <p className="text-cyan font-semibold">{inc.action}</p>
              </div>
            </div>

            {inc.timeline && inc.timeline.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Incident Execution Timeline
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  {inc.timeline.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-muted-foreground shrink-0">{formatTime(item.ts, true)}</span>
                      <span className="text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
