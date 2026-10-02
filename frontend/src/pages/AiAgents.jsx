import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { IncidentControls } from "../components/IncidentControls";
import { StageLoopBar } from "../components/StageLoopBar";

export function AiAgents() {
  const { agents, running } = useSim();

  return (
    <div className="console-ai-agent-center space-y-6">
      <SectionHeader
        title="AI Agent Center"
        sub="Five specialized agents observe, select, validate, execute with safe fallback, and audit payment routing actions."
        right={<IncidentControls />}
      />

      <div className="console-agent-pipeline space-y-2">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Autonomous Loop State</span>
          <span>{running ? "Incident Orchestration Underway" : "Nominal Continuous Mode"}</span>
        </div>
        <div className="console-agent-pipeline-stages">
          <StageLoopBar />
        </div>
      </div>

      <div className="console-agent-grid grid gap-5">
        {agents.map((agent) => {
          const isRunning = agent.status === "running";
          const isDone = agent.status === "done";

          return (
            <Card
              key={agent.id}
              className={cn(
                "console-agent-card relative overflow-hidden transition-all",
                isRunning
                  ? "border-cyan/80 bg-cyan/5 shadow-[0_0_15px_-4px_var(--cyan)]"
                  : isDone
                  ? "border-success/60 bg-card/70"
                  : "border-border"
              )}
            >
              <div className="console-agent-header">
                <div className="console-agent-heading">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-sm font-mono text-xs font-bold",
                      isRunning
                        ? "bg-cyan text-background"
                        : isDone
                        ? "bg-success text-background"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    0{agent.id}
                  </div>
                  <div className="console-agent-name-wrap">
                    <h3 className="console-agent-name font-sans font-semibold text-foreground">
                      {agent.name}
                    </h3>
                  </div>
                </div>

                <span
                  className={cn(
                    "rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase font-bold",
                    isRunning
                      ? "border-cyan bg-cyan/20 text-cyan animate-pulse"
                      : isDone
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {agent.status}
                </span>
              </div>

              <div className="console-agent-verb font-mono text-[10px] uppercase tracking-wider text-cyan">
                {agent.verb}
              </div>

              <p className="console-agent-description text-sm text-muted-foreground">{agent.purpose}</p>

              {/* Monitored Inputs */}
              <div className="console-agent-inputs flex flex-wrap">
                {agent.inputs.map((inp) => (
                  <span
                    key={inp}
                    className="console-agent-input rounded bg-secondary/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                  >
                    {inp}
                  </span>
                ))}
              </div>

              {/* Output and Confidence */}
              <div className="console-agent-output rounded border border-border/60 bg-background/50 p-2.5 font-mono text-xs">
                <div className="console-agent-output-heading flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Current Finding / Output</span>
                  {agent.confidence > 0 && (
                    <span className="console-agent-confidence text-primary font-bold">
                      Confidence: {agent.confidence}%
                    </span>
                  )}
                </div>
                <div className="console-agent-output-text text-foreground">{agent.output}</div>

                {agent.evidence && agent.evidence.length > 0 && (
                  <div className="console-agent-evidence border-t border-border/40 pt-2">
                    <span className="console-agent-evidence-label text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">
                      Evidence
                    </span>
                    <ul className="console-agent-evidence-list list-inside list-disc text-[11px] text-muted-foreground">
                      {agent.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {agent.action && agent.action !== "None" && (
                  <div className="console-agent-action flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                    <span className="text-muted-foreground">Action:</span>
                    <span className="font-bold text-cyan flex items-center gap-1">
                      {agent.action} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
