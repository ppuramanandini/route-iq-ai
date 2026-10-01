import React from "react";
import { Zap, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";
import { useSim } from "../context/SimContext";

export function IncidentControls({ className }) {
  const { running, runIncident, reset, shift } = useSim();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={runIncident}
        disabled={running}
        className="relative inline-flex items-center gap-2 overflow-hidden rounded-sm border border-danger/60 bg-danger/15 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-danger transition hover:bg-danger/25 disabled:opacity-80"
      >
        {running && (
          <span className="scan absolute inset-0 bg-gradient-to-r from-transparent via-danger/20 to-transparent" />
        )}
        <Zap className="h-3.5 w-3.5" />
        {running ? "Incident running…" : "Run live incident"}
      </button>

      {!running && shift > 0 && (
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      )}
    </div>
  );
}
