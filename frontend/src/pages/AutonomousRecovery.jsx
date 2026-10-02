import React from "react";
import { Check, X, Zap, Cpu, RefreshCw, Lock } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { IncidentControls } from "../components/IncidentControls";

export function AutonomousRecovery() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Autonomous Recovery"
        sub="Why proactive telemetry, zero-trust validation, and safe fallback beat static routing rules."
        right={<IncidentControls />}
      />

      <section className="console-recovery-pipeline grid gap-2 md:grid-cols-3 xl:grid-cols-6" aria-label="Autonomous recovery process">
        {["Detection", "Validation", "State Check", "Idempotency", "Fallback", "Recovery Complete"].map((stage, index) => (
          <div key={stage} className="flex min-h-[72px] items-center gap-3 rounded-md border border-border bg-card px-3 py-3">
            <span className="font-mono text-xs font-semibold text-cyan">0{index + 1}</span>
            <span className="text-sm font-medium text-foreground">{stage}</span>
          </div>
        ))}
      </section>

      {/* High-level comparison table */}
      <Card title="Architecture Comparison: Static Rules vs Autonomous Intelligence">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs text-left">
            <thead>
              <tr className="border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5">Capability</th>
                <th className="text-danger">Traditional Rule-Based Fallback</th>
                <th className="text-cyan">SwitchRouteIQ Autonomous Architecture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr>
                <td className="py-3 font-semibold text-foreground">Degradation Detection</td>
                <td className="text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-danger font-medium">
                    <X className="h-3.5 w-3.5" /> Reactive after 50-100 customer failures
                  </span>
                </td>
                <td className="text-foreground">
                  <span className="flex items-center gap-1.5 text-success font-medium">
                    <Check className="h-3.5 w-3.5" /> Real-time detection via telemetry slope analysis
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-foreground">Traffic Shift Strategy</td>
                <td className="text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-danger font-medium">
                    <X className="h-3.5 w-3.5" /> Blind 100% hard failover (thundering herd)
                  </span>
                </td>
                <td className="text-foreground">
                  <span className="flex items-center gap-1.5 text-success font-medium">
                    <Check className="h-3.5 w-3.5" /> Proportional canary shift (5% → 20% → 40%)
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-foreground">Downstream Protection</td>
                <td className="text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-danger font-medium">
                    <X className="h-3.5 w-3.5" /> Secondary gateway often crashes from overload
                  </span>
                </td>
                <td className="text-foreground">
                  <span className="flex items-center gap-1.5 text-success font-medium">
                    <Check className="h-3.5 w-3.5" /> What-If simulation validates capacity limits
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-foreground">Timeout Failover Safety</td>
                <td className="text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-danger font-medium">
                    <X className="h-3.5 w-3.5" /> High risk of customer duplicate debits
                  </span>
                </td>
                <td className="text-foreground">
                  <span className="flex items-center gap-1.5 text-success font-medium">
                    <Check className="h-3.5 w-3.5" /> Idempotent lock & issuer status verification
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-foreground">Rollback & Normalization</td>
                <td className="text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-danger font-medium">
                    <X className="h-3.5 w-3.5" /> Manual engineer intervention required
                  </span>
                </td>
                <td className="text-foreground">
                  <span className="flex items-center gap-1.5 text-success font-medium">
                    <Check className="h-3.5 w-3.5" /> Automated telemetry-verified recovery rollback
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-foreground">Auditability & Compliance</td>
                <td className="text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-danger font-medium">
                    <X className="h-3.5 w-3.5" /> Scattered application logs and alerts
                  </span>
                </td>
                <td className="text-foreground">
                  <span className="flex items-center gap-1.5 text-success font-medium">
                    <Check className="h-3.5 w-3.5" /> Immutable audit log with simulation proof
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4 Core Pillars */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="1. Telemetry Observability">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-cyan shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">Multi-Signal Latency & Error Slope Analysis</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Rather than waiting for error count thresholds to be breached, SwitchRouteIQ analyzes gateway telemetry (p50, p95) and timeout rates. When degradation indicates impending SLA breach, safe fallback commences before users feel impact.
              </p>
            </div>
          </div>
        </Card>

        <Card title="2. Pre-Action What-If Simulation">
          <div className="flex items-start gap-3">
            <Cpu className="h-5 w-5 text-violet shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">Zero Guesswork Traffic Shifting</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Every candidate routing adjustment is evaluated against live capacity models of alternate gateways. If shifting 50% to Gateway B would exceed its TPS envelope or trigger higher pricing, the simulation engine selects the optimal partial shift (e.g. 40%).
              </p>
            </div>
          </div>
        </Card>

        <Card title="3. Guardrail Enforcement">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-warning shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">Merchant Policy Boundary Protection</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                The autonomous engine can never violate merchant hard constraints: maximum shift percent limits, per-transaction fee ceilings, and end-to-end latency SLA targets (500ms). Any proposed action failing guardrails is blocked and flagged.
              </p>
            </div>
          </div>
        </Card>

        <Card title="4. Cryptographic Idempotency Safe-Retry">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-success shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">Zero Duplicate Debits Guarantee</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                When gateway timeouts occur, traditional systems risk double charging the consumer upon retry. SwitchRouteIQ verifies issuer status and holds an atomic distributed lock so that only genuinely unexecuted payments are retried on the recovery gateway.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
