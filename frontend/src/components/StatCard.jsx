import React from "react";
import { cn } from "../lib/utils";

export function StatCard({ label, children, sub, tone = "default" }) {
  const tones = {
    default: "bg-primary",
    good: "bg-success",
    warn: "bg-warning",
    bad: "bg-danger",
    cyan: "bg-cyan",
    violet: "bg-violet"
  };

  return (
    <div className="glass relative overflow-hidden rounded-md border border-border bg-card/60 px-4 py-3">
      <span className={cn("absolute left-0 top-0 h-full w-0.5", tones[tone] || tones.default)} />
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight">{children}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
