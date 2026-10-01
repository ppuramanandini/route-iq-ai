import React from "react";
import { cn } from "../lib/utils";
import { useSim, STAGES } from "../context/SimContext";

export function StageLoopBar({ compact = false }) {
  const { stage, running, step } = useSim();
  const isComplete = step >= 12;

  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
      {STAGES.map((name, idx) => {
        const isActive = running && idx === stage;
        const isDone = running && (idx < stage || isComplete);

        return (
          <div
            key={name}
            className={cn(
              "relative overflow-hidden rounded-sm border px-2 py-2 text-center font-mono text-[10px] tracking-[0.14em] transition-all duration-500",
              isActive
                ? "border-cyan bg-cyan/15 text-cyan shadow-[0_0_20px_-4px_var(--cyan)]"
                : isDone
                ? "border-success/50 bg-success/10 text-success"
                : "border-border text-muted-foreground"
            )}
          >
            {isActive && (
              <span className="scan absolute inset-0 bg-gradient-to-r from-transparent via-cyan/25 to-transparent" />
            )}
            <div className="relative text-[9px] opacity-60">{String(idx + 1).padStart(2, "0")}</div>
            <div className="relative font-semibold">{name}</div>
          </div>
        );
      })}
    </div>
  );
}
