import React, { useState, useMemo } from "react";
import { Bot, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { cn, evaluateStrategy, getRecommendedStrategy, GATEWAY_COLORS } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { RiskBadge } from "../components/RiskBadge";

const DEGRADE_OPTIONS = [10, 20, 30, 50];
const SHIFT_POINTS = [0, 20, 40, 60, 80];

export function Simulator() {
  const { gateways } = useSim();
  const [degradeA, setDegradeA] = useState(20);
  const [maxGuardrail, setMaxGuardrail] = useState(40);
  const [customShift, setCustomShift] = useState(40);

  const candidateStrategies = useMemo(() => {
    return SHIFT_POINTS.map((s) => evaluateStrategy(degradeA, s, maxGuardrail));
  }, [degradeA, maxGuardrail]);

  const recommended = useMemo(() => {
    return getRecommendedStrategy(candidateStrategies);
  }, [candidateStrategies]);

  const curvePoints = useMemo(() => {
    return Array.from({ length: 17 }, (_, i) => ({
      shift: i * 5,
      ...evaluateStrategy(degradeA, i * 5, maxGuardrail)
    }));
  }, [degradeA, maxGuardrail]);

  const customResult = evaluateStrategy(degradeA, customShift, maxGuardrail);

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    fontSize: 11,
    borderRadius: 4
  };

  const axisTick = { fontSize: 10, fill: "var(--muted-foreground)" };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payment Traffic What-If Lab"
        sub="Model the outcome of routing strategies before touching live traffic"
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Controls Column */}
        <div className="space-y-4">
          <Card title="Scenario Parameters">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Gateway A Degradation
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {DEGRADE_OPTIONS.map((val) => (
                <button
                  key={val}
                  onClick={() => setDegradeA(val)}
                  className={cn(
                    "rounded-sm border py-2 font-mono text-xs font-semibold transition-colors",
                    degradeA === val
                      ? "border-danger bg-danger/15 text-danger"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {val}%
                </button>
              ))}
            </div>

            <div className="mt-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Guardrail · Max Automatic Shift: {maxGuardrail}%
            </div>
            <input
              type="range"
              min={20}
              max={80}
              step={10}
              value={maxGuardrail}
              onChange={(e) => setMaxGuardrail(+e.target.value)}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </Card>

          <Card title="Live Gateway State">
            {Object.values(gateways).map((gw) => (
              <div
                key={gw.id}
                className="flex items-center justify-between border-b border-border/50 py-2 font-mono text-xs last:border-0"
              >
                <span style={{ color: GATEWAY_COLORS[gw.id] }}>{gw.name}</span>
                <span>{gw.success.toFixed(1)}%</span>
                <span className="text-muted-foreground">{gw.latency}ms</span>
                <RiskBadge risk={gw.risk} />
              </div>
            ))}
          </Card>

          <Card title="Custom Strategy Evaluation">
            <div className="font-mono text-xs text-foreground">
              Shift {customShift}% of traffic → Gateway B
            </div>
            <input
              type="range"
              min={0}
              max={85}
              step={5}
              value={customShift}
              onChange={(e) => setCustomShift(+e.target.value)}
              className="mt-2 w-full accent-[var(--primary)]"
            />

            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
              <StatItem k="Split A/B/C" v={`${customResult.a}/${customResult.b}/${customResult.c}`} />
              <StatItem k="Success Rate" v={`${customResult.success}%`} />
              <StatItem k="Latency" v={`${customResult.latency}ms`} alert={!customResult.withinSla} />
              <StatItem k="Cost / Tx" v={`₹${customResult.cost}`} />
              <StatItem k="Failures / hr" v={customResult.failures.toLocaleString()} />
              <StatItem k="Gateway B Load" v={`${customResult.bLoad}%`} />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-border pt-2">
              <span className="text-muted-foreground">Merchant SLA (≤ 500ms):</span>
              <span className={customResult.withinSla ? "text-success font-bold" : "text-danger font-bold"}>
                {customResult.withinSla ? "PASSED" : "BREACHED"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted-foreground">Guardrail Policy:</span>
              <span className={customResult.withinPolicy ? "text-success font-bold" : "text-warning font-bold"}>
                {customResult.withinPolicy ? "WITHIN LIMIT" : "REQUIRES OVERRIDE"}
              </span>
            </div>
          </Card>
        </div>

        {/* Results & Comparison Column */}
        <div className="space-y-6">
          <Card
            title="Candidate Strategy Comparison"
            right={
              <span className="flex items-center gap-1 font-mono text-[10px] text-cyan uppercase tracking-wider">
                <Bot className="h-3.5 w-3.5" /> AI Recommended: {recommended.label}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2">Strategy</th>
                    <th>Split A/B/C</th>
                    <th>Simulated Success</th>
                    <th>Simulated Latency</th>
                    <th>Cost/Tx</th>
                    <th>Failures/hr</th>
                    <th>SLA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {candidateStrategies.map((strat) => {
                    const isRec = strat.shift === recommended.shift;
                    return (
                      <tr
                        key={strat.label}
                        className={cn(
                          "transition-colors",
                          isRec ? "bg-cyan/10 font-semibold text-cyan" : "text-foreground hover:bg-card"
                        )}
                      >
                        <td className="py-2.5 flex items-center gap-1.5">
                          {isRec && <Check className="h-3 w-3 text-cyan" />}
                          {strat.label}
                        </td>
                        <td>{strat.a}/{strat.b}/{strat.c}</td>
                        <td className="text-success">{strat.success}%</td>
                        <td className={strat.withinSla ? "text-foreground" : "text-danger"}>
                          {strat.latency}ms
                        </td>
                        <td>₹{strat.cost}</td>
                        <td>{strat.failures.toLocaleString()}</td>
                        <td>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] uppercase font-bold",
                              strat.withinSla
                                ? "bg-success/15 text-success border border-success/30"
                                : "bg-danger/15 text-danger border border-danger/30"
                            )}
                          >
                            {strat.withinSla ? "PASSED" : "SLA BREACH"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-sm border border-cyan/40 bg-cyan/5 p-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-cyan font-bold mb-1">
                <Bot className="h-4 w-4" /> Recommendation Rationale
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Shifting {recommended.shift}% to Gateway B delivers the highest simulated success rate of{" "}
                <strong className="text-foreground">{recommended.success}%</strong> while keeping latency at{" "}
                <strong className="text-foreground">{recommended.latency}ms</strong> (well within the 500ms SLA limit) and avoiding processor saturation.
              </p>
            </div>
          </Card>

          <Card title="Traffic Shift Trade-off Curve (Success % vs Latency ms)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curvePoints}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                  <XAxis dataKey="shift" tick={axisTick} label={{ value: "Shift % to Gateway B", position: "insideBottom", offset: -5, fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis yAxisId="succ" domain={[92, 100]} tick={axisTick} width={34} />
                  <YAxis yAxisId="lat" orientation="right" tick={axisTick} width={38} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line yAxisId="succ" dataKey="success" name="Simulated Success %" stroke="var(--success)" strokeWidth={2} dot={false} />
                  <Line yAxisId="lat" dataKey="latency" name="Simulated Latency (ms)" stroke="var(--cyan)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatItem({ k, v, alert = false }) {
  return (
    <div className="rounded border border-border/50 bg-secondary/20 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={`mt-0.5 font-bold ${alert ? "text-danger" : "text-foreground"}`}>{v}</div>
    </div>
  );
}
