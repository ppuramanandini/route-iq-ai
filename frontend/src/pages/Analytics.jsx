import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";

export function Analytics() {
  const { history } = useSim();

  const thirtyDayData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const sinVal = Math.sin(i / 3);
      return {
        d: `D${i + 1}`,
        success: +(97.9 + sinVal * 0.4 + i * 0.02).toFixed(2),
        decisionSuccessRate: +(98.2 + i * 0.04 + sinVal * 0.1).toFixed(1),
        accuracy: +(98.2 + i * 0.04 + sinVal * 0.1).toFixed(1),
        recoveries: Math.round(320 + sinVal * 80 + (i % 7 === 3 ? 260 : 0)),
        decisions: Math.round(4200 + i * 40 + sinVal * 300),
        saved: Math.round(18000 + i * 400 + sinVal * 2500),
        volume: Math.round(1400000 + i * 12000 + sinVal * 90000),
        events: Math.max(0, Math.round(2 + sinVal * 2 + (i % 7 === 3 ? 3 : 0)))
      };
    });
  }, []);

  const latest = history.at(-1) || {};
  const averageLatency = [latest.latA, latest.latB, latest.latC]
    .filter(Number.isFinite)
    .reduce((sum, latency, _, values) => sum + latency / values.length, 0);
  const recoveredThisPeriod = thirtyDayData.reduce((sum, day) => sum + day.recoveries, 0);
  const savedThisPeriod = thirtyDayData.reduce((sum, day) => sum + day.saved, 0);

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
        title="Analytics"
        sub="Operational intelligence across gateways, routing decisions, recoveries and cost optimization."
      />

      <div className="console-kpi-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Success Rate" tone="good" sub="Latest telemetry interval">{(latest.overall ?? 0).toFixed(1)}%</StatCard>
        <StatCard label="Transaction Throughput" tone="cyan" sub="Current simulated rate">{(latest.tps ?? 0).toLocaleString()} tx/s</StatCard>
        <StatCard label="Average Latency" tone="default" sub="Across active gateways">{Math.round(averageLatency)} ms</StatCard>
        <StatCard label="Recoveries · 30d" tone="good" sub="Existing analytics series">{recoveredThisPeriod.toLocaleString()}</StatCard>
        <StatCard label="Cost Optimized · 30d" tone="warn" sub="Existing analytics series">₹{savedThisPeriod.toLocaleString()}</StatCard>
      </div>

      <div className="console-analytics-grid grid gap-6">
        {/* 1. Payment Success Trend 30d */}
        <ChartCard title="Payment Success Trend · 30d">
          <AreaChart data={thirtyDayData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="d" tick={axisTick} />
            <YAxis domain={[96, 100]} tick={axisTick} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="success" stroke="var(--success)" fill="var(--success)" fillOpacity={0.15} />
          </AreaChart>
        </ChartCard>

        {/* 2. Gateway Comparison Live Success */}
        <ChartCard title="Gateway Comparison · Live Success %">
          <LineChart data={history}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="t" tick={axisTick} minTickGap={40} />
            <YAxis domain={[86, 100]} tick={axisTick} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="A" stroke="var(--chart-1)" dot={false} isAnimationActive={false} />
            <Line dataKey="B" stroke="var(--success)" dot={false} isAnimationActive={false} />
            <Line dataKey="C" stroke="var(--violet)" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartCard>

        {/* 3. Latency Trend Live */}
        <ChartCard title="Latency Trend · Live ms">
          <LineChart data={history}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="t" tick={axisTick} minTickGap={40} />
            <YAxis tick={axisTick} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="latA" name="A" stroke="var(--chart-1)" dot={false} isAnimationActive={false} />
            <Line dataKey="latB" name="B" stroke="var(--success)" dot={false} isAnimationActive={false} />
            <Line dataKey="latC" name="C" stroke="var(--violet)" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartCard>

        {/* 4. Traffic Distribution Stacked */}
        <ChartCard title="Traffic Distribution · Live %">
          <AreaChart data={history} stackOffset="expand">
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="t" tick={axisTick} minTickGap={40} />
            <YAxis tick={axisTick} width={32} tickFormatter={(v) => `${Math.round(v * 100)}`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area dataKey="trA" name="A" stackId="1" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.5} isAnimationActive={false} />
            <Area dataKey="trB" name="B" stackId="1" stroke="var(--success)" fill="var(--success)" fillOpacity={0.5} isAnimationActive={false} />
            <Area dataKey="trC" name="C" stackId="1" stroke="var(--violet)" fill="var(--violet)" fillOpacity={0.5} isAnimationActive={false} />
          </AreaChart>
        </ChartCard>

        {/* 5. Routing Decision Success Rate */}
        <ChartCard title="Routing Decision Success Rate · %">
          <LineChart data={thirtyDayData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="d" tick={axisTick} />
            <YAxis domain={[95, 100]} tick={axisTick} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line dataKey="decisionSuccessRate" stroke="var(--cyan)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        {/* 6. Automatic Recoveries / Day */}
        <ChartCard title="Automatic Recoveries / Day">
          <AreaChart data={thirtyDayData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="d" tick={axisTick} />
            <YAxis tick={axisTick} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="recoveries" stroke="var(--violet)" fill="var(--violet)" fillOpacity={0.2} />
          </AreaChart>
        </ChartCard>

        {/* 7. Routing Decisions / Day */}
        <ChartCard title="Routing Decisions / Day">
          <LineChart data={thirtyDayData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="d" tick={axisTick} />
            <YAxis tick={axisTick} width={40} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line dataKey="decisions" stroke="var(--primary)" dot={false} />
          </LineChart>
        </ChartCard>

        {/* 8. Cost Optimization Saved / Day */}
        <ChartCard title="Cost Optimization · ₹ Saved / Day">
          <AreaChart data={thirtyDayData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="d" tick={axisTick} />
            <YAxis tick={axisTick} width={48} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="saved" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.15} />
          </AreaChart>
        </ChartCard>

        {/* 9. Transaction Volume / Day */}
        <ChartCard title="Transaction Volume / Day">
          <AreaChart data={thirtyDayData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="d" tick={axisTick} />
            <YAxis tick={axisTick} width={48} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="volume" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} />
          </AreaChart>
        </ChartCard>

        {/* 10. Degradation Events / Day */}
        <ChartCard title="Gateway Degradation Events / Day">
          <LineChart data={thirtyDayData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="d" tick={axisTick} />
            <YAxis tick={axisTick} width={28} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="stepAfter" dataKey="events" stroke="var(--danger)" dot={false} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card title={title}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
