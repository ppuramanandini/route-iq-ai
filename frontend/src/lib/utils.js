import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(ts, includeMs = false) {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  const time = d.toLocaleTimeString("en-GB", { hour12: false });
  return includeMs ? `${time}.${String(d.getMilliseconds()).padStart(3, "0")}` : time;
}

export function formatInr(val) {
  return `₹${val.toLocaleString("en-IN")}`;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function getRiskLevel(success, latency) {
  if (success < 94 || latency > 600) return "HIGH";
  if (success < 97 || latency > 290) return "MEDIUM";
  return "LOW";
}

export function evaluateStrategy(degradeA, shiftB, maxShift = 40, tps = 1842) {
  const aTraffic = 90 - shiftB;
  const bTraffic = 5 + shiftB;
  const aSuccess = 98.5 - degradeA * 0.45;
  const bSuccess = 98.8 - Math.max(0, bTraffic - 45) * 0.25;
  const overallSuccess = (aTraffic * aSuccess + bTraffic * bSuccess + 482.5) / 100;
  const aLatency = 180 + degradeA * 20;
  const bLatency = 182 + Math.max(0, bTraffic - 45) * 9;
  const overallLatency = (aTraffic * aLatency + bTraffic * bLatency + 1550) / 100;
  const overallCost = (aTraffic * 1.8 + bTraffic * 2.1 + 7) / 100;
  return {
    label: shiftB === 0 ? "Current" : `${shiftB}% Shift`,
    shift: shiftB,
    a: aTraffic,
    b: bTraffic,
    c: 5,
    success: +overallSuccess.toFixed(1),
    latency: Math.round(overallLatency),
    cost: +overallCost.toFixed(2),
    failures: Math.round(((100 - overallSuccess) / 100) * tps * 60),
    bLoad: Math.round((bTraffic / 100) * tps * 1 / 15),
    withinSla: overallLatency <= 500,
    withinPolicy: shiftB <= maxShift
  };
}

export function getRecommendedStrategy(strategies) {
  const valid = strategies.filter((s) => s.withinSla);
  return [...(valid.length ? valid : strategies)].sort((a, b) => b.success - a.success)[0];
}

export const GATEWAY_COLORS = {
  A: "var(--chart-1)",
  B: "var(--success)",
  C: "var(--violet)"
};
