import React from "react";
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import { formatTime } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { IncidentControls } from "../components/IncidentControls";

export function Recovery() {
  const { incidents } = useSim();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Recovery Center"
        sub="Active and resolved gateway incidents with root cause, AI action and recovery timeline."
        right={<IncidentControls />}
      />

      <div className="space-y-4">
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

            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
