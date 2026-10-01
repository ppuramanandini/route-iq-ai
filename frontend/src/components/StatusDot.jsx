import React from "react";
import { cn } from "../lib/utils";

export function StatusDot({ tone = "good" }) {
  const tones = {
    good: "bg-success",
    warn: "bg-warning",
    bad: "bg-danger",
    cyan: "bg-cyan"
  };

  return (
    <span className={cn("pulse-dot inline-block h-2 w-2 rounded-full", tones[tone] || tones.good)} />
  );
}
