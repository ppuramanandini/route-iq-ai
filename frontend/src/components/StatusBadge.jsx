import React from "react";
import { cn } from "../lib/utils";

export function StatusBadge({ status }) {
  const isGood = ["SUCCESS", "RECOVERED", "PASSED", "SAFE", "STABLE"].includes(status);
  const isWarn = ["TIMEOUT", "IN PROGRESS", "MITIGATING", "DETECTING"].includes(status);
  const isMuted = status === "N/A";

  const cls = isGood
    ? "text-success border-success/40 bg-success/10"
    : isWarn
    ? "text-warning border-warning/40 bg-warning/10"
    : isMuted
    ? "text-muted-foreground border-border"
    : "text-danger border-danger/40 bg-danger/10";

  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider", cls)}>
      {status}
    </span>
  );
}
