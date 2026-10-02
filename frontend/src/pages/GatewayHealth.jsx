import React, { useEffect, useRef, useState } from "react";
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
import { clamp } from "../lib/utils";
import "./GatewayHealth.css";

const HISTORY_LIMIT = 48;
const TELEMETRY_INTERVAL = 1500;
const GATEWAY_IDS = ["A", "B", "C"];

function formatTelemetryTime(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function moveTelemetryValue(previous, target, alpha, noiseAmplitude, tick, phase) {
  const jitter = Math.sin(tick * 1.71 + phase) * noiseAmplitude;
  return previous + (target - previous) * alpha + jitter;
}

function getHealthTone(risk) {
  if (risk === "HIGH") return "#ff4d5e";
  if (risk === "MEDIUM") return "#f5b72c";
  return "#19d889";
}

function getGatewayAccent(id, risk) {
  if (risk === "HIGH") return "#ff4d5e";
  if (id === "C" && risk === "MEDIUM") return "#f5b72c";
  return GATEWAY_COLORS[id];
}

function getRiskTone(value) {
  if (value > 60) return "#ff4d5e";
  if (value > 25) return "#f5b72c";
  return "#19d889";
}

function TelemetryTooltip({ active, payload, label, metric, unit }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="gateway-health-tooltip">
      <div className="gateway-health-tooltip-time">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="gateway-health-tooltip-row">
          <span className="gateway-health-tooltip-label">
            <span className="gateway-health-tooltip-dot" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="gateway-health-tooltip-value">
            {metric} {Number(entry.value).toFixed(metric === "Success" ? 1 : 0)} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GatewayHealth() {
  const { gateways, history } = useSim();
  const gatewaysRef = useRef(gateways);
  const [telemetry, setTelemetry] = useState(() => {
    const source = history.slice(-HISTORY_LIMIT);
    const now = Date.now();
    return source.map((point, index) => ({
      ...point,
      t: formatTelemetryTime(now - (source.length - index - 1) * TELEMETRY_INTERVAL)
    }));
  });

  useEffect(() => {
    gatewaysRef.current = gateways;
  }, [gateways]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentGateways = gatewaysRef.current;
      const timestamp = Date.now();

      setTelemetry((previous) => {
        const last = previous[previous.length - 1];
        if (!last) return previous;

        const tick = previous.length + Math.floor(timestamp / TELEMETRY_INTERVAL);
        const point = { t: formatTelemetryTime(timestamp) };

        GATEWAY_IDS.forEach((id, index) => {
          const gateway = currentGateways[id];
          const latencyKey = `lat${id}`;
          const success = moveTelemetryValue(last[id], gateway.success, 0.22, 0.09, tick, index * 1.3);
          const latencyNoise = Math.max(2, gateway.latency * 0.012);
          const latency = moveTelemetryValue(last[latencyKey], gateway.latency, 0.3, latencyNoise, tick, index * 2.1);

          point[id] = +clamp(success, 0, 100).toFixed(2);
          point[latencyKey] = Math.max(0, Math.round(latency));
        });

        return [...previous.slice(-(HISTORY_LIMIT - 1)), point];
      });
    }, TELEMETRY_INTERVAL);

    return () => window.clearInterval(interval);
  }, []);

  const axisTick = { fontSize: 10, fill: "var(--muted-foreground)" };

  return (
    <div className="gateway-health-page space-y-6">
      <SectionHeader
        title="Gateway Health"
        sub="Per-gateway health, percentile latency, timeouts, capacity, cost and observed degradation risk."
      />

      {/* 3 Gateway Deep-Dive Cards */}
      <div className="gateway-health-cards">
        {["A", "B", "C"].map((key) => {
          const gw = gateways[key];
          const accent = getGatewayAccent(key, gw.risk);
          const healthTone = getHealthTone(gw.risk);
          const riskTone = getRiskTone(gw.degradeProb);
          const metrics = [
            ["P50 Latency", `${gw.latency} ms`, gw.latency > 500],
            ["P95 Latency", `${gw.p95} ms`, gw.p95 > 500],
            ["P99 Latency", `${gw.p99} ms`, gw.p99 > 800],
            ["Timeouts", `${gw.timeouts}%`, gw.timeouts > 2],
            ["Errors", `${gw.errors}%`, gw.errors > 3],
            ["Traffic Share", `${Math.round(gw.traffic)}%`, false],
            ["Throughput", `${gw.tps} tx/s`, false],
            ["Max Capacity", `${gw.capacity} tx/s`, false],
            ["Fee / Tx", `₹${gw.cost}`, false]
          ];

          return (
            <div key={key} className="gateway-health-card-wrap" style={{ "--gateway-accent": accent, "--gateway-health-tone": healthTone, "--gateway-risk-tone": riskTone }}>
              <Card title={gw.name} right={<RiskBadge risk={gw.risk} />} className="gateway-health-card" bodyClass="gateway-health-card-body">
                <div className="gateway-health-processor">{gw.processor}</div>

                <div className="gateway-health-primary">
                  <div className="gateway-health-primary-item">
                    <div className="gateway-health-primary-label">Health Index</div>
                    <div className="gateway-health-primary-value">{gw.health}%</div>
                  </div>
                  <div className="gateway-health-primary-item">
                    <div className="gateway-health-primary-label">Success Rate</div>
                    <div className="gateway-health-primary-value">{gw.success.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="gateway-health-metrics">
                  {metrics.map(([label, value, isAlert]) => (
                    <div key={label} className="gateway-health-metric">
                      <div className="gateway-health-metric-label">{label}</div>
                      <div className={`gateway-health-metric-value${isAlert ? " is-alert" : ""}`}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="gateway-health-risk">
                  <div className="gateway-health-risk-heading">
                    <span>Degradation Risk Index</span>
                    <span className="gateway-health-risk-value">{gw.degradeProb}%</span>
                  </div>
                  <div className="gateway-health-risk-track" aria-label={`Degradation risk ${gw.degradeProb}%`}>
                    <div className="gateway-health-risk-fill" style={{ width: `${clamp(gw.degradeProb, 0, 100)}%` }} />
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Real-time Telemetry Charts */}
      <div className="console-gateway-charts grid gap-6">
        <Card title="Live Success Rate Comparison (%)" right={<span className="gateway-health-live">LIVE</span>} className="gateway-health-chart-card">
          <div className="gateway-health-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="t" tick={axisTick} minTickGap={38} tickMargin={8} />
                <YAxis domain={[85, 100]} tick={axisTick} width={32} />
                <Tooltip content={<TelemetryTooltip metric="Success" unit="%" />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {GATEWAY_IDS.map((id) => <Line key={id} dataKey={id} name={`Gateway ${id}`} stroke={getGatewayAccent(id, gateways[id].risk)} strokeWidth={2} dot={false} isAnimationActive animationDuration={360} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Live Latency Comparison (ms)" right={<span className="gateway-health-live">LIVE</span>} className="gateway-health-chart-card">
          <div className="gateway-health-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="t" tick={axisTick} minTickGap={38} tickMargin={8} />
                <YAxis domain={["dataMin - 30", "dataMax + 30"]} tick={axisTick} width={42} />
                <Tooltip content={<TelemetryTooltip metric="Latency" unit="ms" />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {GATEWAY_IDS.map((id) => <Line key={id} dataKey={`lat${id}`} name={`Gateway ${id}`} stroke={getGatewayAccent(id, gateways[id].risk)} strokeWidth={2} dot={false} isAnimationActive animationDuration={360} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
