import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { GATEWAY_COLORS } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { RiskBadge } from "../components/RiskBadge";

export function GatewayHealth() {
  const { gateways, history } = useSim();

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
        title="Gateway Health"
        sub="Per-gateway health, percentile latency, timeouts, capacity, cost and observed degradation risk."
      />

      {/* 3 Gateway Deep-Dive Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {["A", "B", "C"].map((key) => {
          const gw = gateways[key];
          const color = GATEWAY_COLORS[key];

          return (
            <Card
              key={key}
              title={gw.name}
              right={<RiskBadge risk={gw.risk} />}
              className="relative overflow-hidden"
            >
              <div className="font-mono text-xs text-muted-foreground mb-4">
                {gw.processor}
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">Health Index</div>
                  <div className="mt-1 text-2xl font-bold font-mono" style={{ color }}>
                    {gw.health}%
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">Success Rate</div>
                  <div className="mt-1 text-2xl font-bold font-mono text-foreground">
                    {gw.success.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-y-3 font-mono text-xs">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Latency (p50)</div>
                  <div className={`mt-0.5 ${gw.latency > 500 ? "text-danger font-bold" : "text-foreground"}`}>
                    {gw.latency} ms
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">p95 Latency</div>
                  <div className="mt-0.5 text-foreground">{gw.p95} ms</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">p99 Latency</div>
                  <div className="mt-0.5 text-foreground">{gw.p99} ms</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Timeouts</div>
                  <div className="mt-0.5 text-foreground">{gw.timeouts}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Errors</div>
                  <div className="mt-0.5 text-foreground">{gw.errors}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Traffic Share</div>
                  <div className="mt-0.5 text-cyan font-bold">{Math.round(gw.traffic)}%</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Throughput</div>
                  <div className="mt-0.5 text-foreground">{gw.tps} tx/s</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Max Capacity</div>
                  <div className="mt-0.5 text-foreground">{gw.capacity} tx/s</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Fee / Tx</div>
                  <div className="mt-0.5 text-foreground">₹{gw.cost}</div>
                </div>
              </div>

              <div className="mt-5 rounded border border-border/70 bg-secondary/30 p-2.5 font-mono text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Degradation Risk Index:</span>
                <span className={`font-bold ${gw.degradeProb > 50 ? "text-danger" : gw.degradeProb > 20 ? "text-warning" : "text-success"}`}>
                  {gw.degradeProb}%
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Real-time Telemetry Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Live Success Rate Comparison (%)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="t" tick={axisTick} minTickGap={30} />
                <YAxis domain={[85, 100]} tick={axisTick} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="A" name="Gateway A" stroke="var(--chart-1)" dot={false} isAnimationActive={false} />
                <Line dataKey="B" name="Gateway B" stroke="var(--success)" dot={false} isAnimationActive={false} />
                <Line dataKey="C" name="Gateway C" stroke="var(--violet)" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Live Latency Comparison (ms)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="t" tick={axisTick} minTickGap={30} />
                <YAxis tick={axisTick} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="latA" name="Gateway A" stroke="var(--chart-1)" dot={false} isAnimationActive={false} />
                <Line dataKey="latB" name="Gateway B" stroke="var(--success)" dot={false} isAnimationActive={false} />
                <Line dataKey="latC" name="Gateway C" stroke="var(--violet)" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
