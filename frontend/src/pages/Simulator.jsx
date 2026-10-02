import React, { useEffect, useState, useMemo } from "react";
import { Bot, Check } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine
} from "recharts";
import { clamp, cn, evaluateStrategy, getRecommendedStrategy, GATEWAY_COLORS } from "../lib/utils";
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
  const [telemetryTick, setTelemetryTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTelemetryTick((tick) => tick + 1), 1500);
    return () => window.clearInterval(interval);
  }, []);

  const candidateStrategies = useMemo(() => {
    return SHIFT_POINTS.map((s) => evaluateStrategy(degradeA, s, maxGuardrail));
  }, [degradeA, maxGuardrail]);

  const recommended = useMemo(() => {
    return getRecommendedStrategy(candidateStrategies);
  }, [candidateStrategies]);
  const recommendedLabel = recommended?.label || "No compliant strategy";

  const curvePoints = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const shift = i * 4;
      const strategy = evaluateStrategy(degradeA, shift, maxGuardrail);
      const successVariation =
        Math.sin(shift * 0.29 + degradeA * 0.17 + telemetryTick * 0.61) * 0.075 +
        Math.sin(shift * 0.13 + customShift * 0.11 - telemetryTick * 0.37) * 0.035;
      const pressure = Math.max(0, shift - maxGuardrail);
      const smallSpike = (i + telemetryTick) % 11 === 0 ? 0.7 + pressure * 0.012 : 0;
      const latencyVariation =
        Math.sin(shift * 0.21 + telemetryTick * 0.53) * 2.1 +
        Math.sin(shift * 0.49 + telemetryTick * 0.27 + degradeA) * 0.9 +
        smallSpike * 2.4;

      return {
        ...strategy,
        shift,
        success: +clamp(strategy.success + successVariation - smallSpike * 0.05, 80, 99.5).toFixed(2),
        latency: Math.max(0, Math.round(strategy.latency + latencyVariation))
      };
    });
  }, [degradeA, maxGuardrail, customShift, telemetryTick]);

  const customResult = evaluateStrategy(degradeA, customShift, maxGuardrail);
  const selectedCurvePoint = curvePoints.reduce((closest, point) =>
    Math.abs(point.shift - customShift) < Math.abs(closest.shift - customShift) ? point : closest
  );

  const axisTick = { fontSize: 10, fill: "var(--muted-foreground)" };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payment Traffic What-If Lab"
        sub="Model the outcome of routing strategies before touching live traffic"
      />

      <div className="console-simulator-grid grid gap-6">
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
                <Bot className="h-3.5 w-3.5" /> AI Recommended: {recommendedLabel}
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
                    const isRec = recommended !== null && strat.shift === recommended.shift;
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

          </Card>

          <Card title="Traffic Shift Trade-off Curve (Success % vs Latency ms)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curvePoints}>
                  <CartesianGrid stroke="rgba(90, 150, 210, 0.18)" strokeDasharray="3 5" />
                  <XAxis
                    dataKey="shift"
                    type="number"
                    domain={[0, 80]}
                    ticks={[0, 20, 40, 60, 80]}
                    tickFormatter={(value) => `${value}%`}
                    tick={axisTick}
                    axisLine={{ stroke: "rgba(120, 150, 180, 0.3)" }}
                    tickLine={{ stroke: "rgba(120, 150, 180, 0.3)" }}
                    label={{ value: "Shift % to Gateway B", position: "insideBottom", offset: -5, fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    yAxisId="succ"
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={axisTick}
                    width={38}
                    axisLine={{ stroke: "rgba(120, 150, 180, 0.3)" }}
                    tickLine={{ stroke: "rgba(120, 150, 180, 0.3)" }}
                  />
                  <YAxis
                    yAxisId="lat"
                    orientation="right"
                    domain={["dataMin - 30", "dataMax + 30"]}
                    tick={axisTick}
                    width={42}
                    axisLine={{ stroke: "rgba(120, 150, 180, 0.3)" }}
                    tickLine={{ stroke: "rgba(120, 150, 180, 0.3)" }}
                  />
                  <Tooltip content={<TradeoffTooltip />} />
                  <Legend content={<TradeoffLegend />} wrapperStyle={{ paddingTop: 4 }} />
                  <ReferenceArea x1={0} x2={maxGuardrail} yAxisId="succ" fill="#19d889" fillOpacity={0.035} ifOverflow="hidden" />
                  <ReferenceLine
                    x={customShift}
                    yAxisId="succ"
                    stroke="rgba(0, 200, 255, 0.65)"
                    strokeDasharray="4 4"
                    label={{ value: "CURRENT", position: "insideTopRight", fill: "#69dcff", fontSize: 8 }}
                  />
                  <ReferenceDot x={customShift} y={selectedCurvePoint.success} yAxisId="succ" r={3} fill="var(--success)" stroke="#07111f" strokeWidth={1.5} ifOverflow="discard" />
                  <ReferenceDot x={customShift} y={selectedCurvePoint.latency} yAxisId="lat" r={3} fill="var(--cyan)" stroke="#07111f" strokeWidth={1.5} ifOverflow="discard" />
                  <Line yAxisId="succ" dataKey="success" name="Success Rate" stroke="var(--success)" strokeWidth={2} dot={{ r: 1.8, strokeWidth: 0 }} activeDot={{ r: 3.5 }} type="monotone" isAnimationActive animationDuration={320} />
                  <Line yAxisId="lat" dataKey="latency" name="Latency" stroke="var(--cyan)" strokeWidth={2} dot={{ r: 1.8, strokeWidth: 0 }} activeDot={{ r: 3.5 }} type="monotone" isAnimationActive animationDuration={320} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TradeoffTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded border border-border bg-[#07111f] px-3 py-2 font-mono text-[10px] shadow-lg">
      <div className="mb-1.5 text-muted-foreground">Shift: <span className="text-foreground">{point.shift}%</span></div>
      <div className="flex items-center justify-between gap-4 text-success">
        <span>Success Rate</span><span>{point.success.toFixed(1)}%</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4 text-cyan">
        <span>Latency</span><span>{point.latency} ms</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4 text-muted-foreground">
        <span>Gateway B Load</span><span className="text-foreground">{point.bLoad}%</span>
      </div>
    </div>
  );
}

function TradeoffLegend() {
  return (
    <div className="flex items-center justify-center gap-4 font-mono text-[10px]">
      <span className="flex items-center gap-1.5 text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Success Rate
      </span>
      <span className="flex items-center gap-1.5 text-cyan">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
        Latency
      </span>
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
