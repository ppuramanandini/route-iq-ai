import React, { useState } from "react";
import { Save, Check } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";

export function Settings() {
  const [minHealth, setMinHealth] = useState(92);
  const [maxShift, setMaxShift] = useState(40);
  const [slaLatency, setSlaLatency] = useState(500);
  const [canaryRamp, setCanaryRamp] = useState("5% → 20% → 40%");
  const [rollbackWindow, setRollbackWindow] = useState(180);
  const [autoHealing, setAutoHealing] = useState(true);
  const [idempotencySafe, setIdempotencySafe] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Merchant Configuration"
        sub="Configure payment methods, gateway connections, routing rules, SLA, maximum traffic shift, cost limits and failover policy."
        right={
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:brightness-110 transition"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Settings Saved" : "Save Configuration"}
          </button>
        }
      />

      <form onSubmit={handleSave} className="console-settings-layout grid gap-6">
        <nav className="console-settings-nav" aria-label="Settings categories">
          <h2>Configuration</h2>
          <a href="#settings-routing">Routing</a>
          <a href="#settings-risk">Risk</a>
          <a href="#settings-sla">SLA</a>
          <a href="#settings-fallback">Fallback</a>
          <a href="#settings-environment">Environment</a>
          <div className="console-settings-environment">
            <span>ACTIVE ENVIRONMENT</span>
            <strong>Sandbox</strong>
            <small>Read-only session setting</small>
          </div>
        </nav>

        <div className="console-settings-panels">
        <div className="console-settings-grid grid gap-6">
        {/* Guardrail & Thresholds */}
        <Card title="Autonomous Guardrail Thresholds">
          <div id="settings-routing" className="space-y-4 font-mono text-xs">
            <div id="settings-risk">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Minimum Gateway Success Threshold</span>
                <span className="font-bold text-foreground">{minHealth}%</span>
              </div>
              <input
                type="range"
                min={80}
                max={98}
                value={minHealth}
                onChange={(e) => setMinHealth(+e.target.value)}
                className="w-full accent-[var(--primary)]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Telemetry agent triggers route challenge when success rate drops below this level.
              </p>
            </div>

            <div id="settings-sla">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Maximum Allowed Traffic Shift</span>
                <span className="font-bold text-foreground">{maxShift}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                step={5}
                value={maxShift}
                onChange={(e) => setMaxShift(+e.target.value)}
                className="w-full accent-[var(--primary)]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Hard guardrail constraint to prevent sudden downstream gateway saturation.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>SLA Latency Target</span>
                <span className="font-bold text-foreground">{slaLatency} ms</span>
              </div>
              <input
                type="range"
                min={200}
                max={1000}
                step={50}
                value={slaLatency}
                onChange={(e) => setSlaLatency(+e.target.value)}
                className="w-full accent-[var(--primary)]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Transactions with latency over this target violate SLA guardrails.
              </p>
            </div>
          </div>
        </Card>

        {/* Self-Healing & Safety Policy */}
        <Card title="Self-Healing Policy & Idempotency">
          <div id="settings-fallback" className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <span className="font-semibold text-foreground">Autonomous Traffic Shifting</span>
                <p className="text-[10px] text-muted-foreground">
                  Execute canary shifts automatically upon passing all guardrails.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoHealing}
                onChange={(e) => setAutoHealing(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-[var(--primary)]"
              />
            </div>

            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <span className="font-semibold text-foreground">Cryptographic Idempotency Guard</span>
                <p className="text-[10px] text-muted-foreground">
                  Lock state at issuer to prevent double debits during failover.
                </p>
              </div>
              <input
                type="checkbox"
                checked={idempotencySafe}
                onChange={(e) => setIdempotencySafe(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-[var(--primary)]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                Canary Ramp Strategy
              </label>
              <select
                value={canaryRamp}
                onChange={(e) => setCanaryRamp(e.target.value)}
                className="w-full rounded border border-border bg-input px-3 py-2 text-foreground focus:outline-none"
              >
                <option value="5% → 20% → 40%">5% → 20% → 40% (Conservative)</option>
                <option value="10% → 30% → 50%">10% → 30% → 50% (Standard)</option>
                <option value="Direct 40%">Immediate Direct Shift (Aggressive)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                Recovery Rollback Verification Window
              </label>
              <input
                type="number"
                value={rollbackWindow}
                onChange={(e) => setRollbackWindow(+e.target.value)}
                className="w-full rounded border border-border bg-input px-3 py-2 text-foreground focus:outline-none"
              />
            </div>
          </div>
        </Card>
        </div>
        <section id="settings-environment" className="console-settings-environment-panel">
          <div>
            <h3>Environment</h3>
            <p>Routing configuration is currently scoped to the active sandbox session.</p>
          </div>
          <span>Sandbox · Read only</span>
        </section>
        </div>
      </form>
    </div>
  );
}
