import React from "react";
import { cn } from "../lib/utils";

export function RiskBadge({ risk }) {
  const styles = {
    LOW: "text-success border-success/40 bg-success/10",
    MEDIUM: "text-warning border-warning/40 bg-warning/10",
    HIGH: "text-danger border-danger/40 bg-danger/10"
  };

  return (
    <span className={cn("inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider", styles[risk] || styles.LOW)}>
      {risk}
    </span>
  );
}
