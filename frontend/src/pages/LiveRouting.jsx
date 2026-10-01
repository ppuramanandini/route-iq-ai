import React, { useState, useEffect, useRef } from "react";
import { Play, ArrowDown, Pizza } from "lucide-react";
import { cn } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { RoutingMap } from "../components/RoutingMap";
import { TransactionsTable } from "../components/TransactionsTable";
import { StageLoopBar } from "../components/StageLoopBar";

const JOURNEY_STEPS = [
  "Customer",
  "FoodApp",
  "SwitchRouteIQ",
  "Gateway",
  "Payment Network",
  "Customer Bank",
  "Payment Result"
];

const DEGRADATION_POINTS = [
  { s: 98.4, l: 180 },
  { s: 97.2, l: 320 },
  { s: 95.1, l: 520 },
  { s: 93.0, l: 780 },
  { s: 90.8, l: 780 }
];

export function LiveRouting() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Live Routing"
        sub="Payment traffic flowing from merchants through the routing engine to each processor"
      />

      <Card title="Routing Network">
        <RoutingMap detailed={true} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <PizzaJourneyDemo />
        <Card title="Live Event Stream">
          <TransactionsTable limit={16} />
        </Card>
      </div>
    </div>
  );
}

function PizzaJourneyDemo() {
  const { runIncident, running, step, gateways } = useSim();
  const [activeStep, setActiveStep] = useState(-1);
  const [degradeIdx, setDegradeIdx] = useState(-1);
  const [activeGw, setActiveGw] = useState("A");
  const timersRef = useRef([]);

  const startJourney = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setActiveStep(0);
    setDegradeIdx(-1);
    setActiveGw("A");

    // Progression through nodes
    JOURNEY_STEPS.forEach((_, idx) => {
      timersRef.current.push(
        window.setTimeout(() => setActiveStep(idx), idx * 600)
      );
    });

    // Progression through degradation points
    DEGRADATION_POINTS.forEach((_, idx) => {
      timersRef.current.push(
        window.setTimeout(() => setDegradeIdx(idx), 4500 + idx * 1100)
      );
    });

    // Trigger autonomous self-healing incident
    timersRef.current.push(
      window.setTimeout(() => {
        runIncident();
      }, 10000)
    );
  };

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (step >= 8) {
      setActiveGw("B");
    }
  }, [step]);

  const showDegradeAlert = degradeIdx >= 3;

  return (
    <Card
      title="Payment Journey Demonstration"
      right={
        <button
          onClick={startJourney}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-sm border border-cyan/60 bg-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
        >
          <Play className="h-3 w-3" /> Start journey
        </button>
      }
    >
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        {/* Order Details Card */}
        <div className="space-y-2 rounded-sm border border-border bg-card/50 p-3 font-mono text-[11px]">
          <div className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold">
            <Pizza className="h-4 w-4 text-warning" /> Pizza order
          </div>
          {[
            ["Order", "PIZZA-9281"],
            ["Amount", "₹500"],
            ["Method", "UPI"],
            ["Merchant", "FoodApp"],
            ["Route", `Gateway ${activeGw}`]
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted-foreground">{k}</span>
              <span className={k === "Route" && activeGw === "B" ? "text-success font-bold" : ""}>
                {v}
              </span>
            </div>
          ))}

          {step >= 11 && (
            <div className="mt-3 rounded-sm border border-success/50 bg-success/10 p-2 text-center text-success font-bold">
              PAYMENT SUCCESS · 204ms
            </div>
          )}
        </div>

        {/* Step-by-Step Route Progress */}
        <div>
          <div className="flex flex-col items-start gap-0.5">
            {JOURNEY_STEPS.map((s, idx) => (
              <div key={s} className="flex flex-col items-start">
                <div
                  className={cn(
                    "rounded-sm border px-3 py-1 text-xs transition-all duration-300",
                    activeStep >= idx
                      ? "border-cyan/70 bg-cyan/10 text-foreground font-medium"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {s === "Gateway" ? `Gateway A / B / C → ${activeGw}` : s}
                </div>
                {idx < JOURNEY_STEPS.length - 1 && (
                  <ArrowDown
                    className={cn(
                      "my-0.5 ml-3 h-3 w-3 transition-colors",
                      activeStep > idx ? "text-cyan" : "text-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Degradation Timeline & Autonomous Action */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Gateway A Degradation Timeline
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {DEGRADATION_POINTS.map((pt, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-sm border p-2 font-mono text-[11px] transition-all",
                degradeIdx >= idx
                  ? pt.s < 94
                    ? "border-danger/60 bg-danger/10 text-danger"
                    : "border-warning/50 bg-warning/5 text-warning"
                  : "border-border opacity-40 text-muted-foreground"
              )}
            >
              <div>{pt.s}%</div>
              <div className="text-muted-foreground">{pt.l}ms</div>
            </div>
          ))}
        </div>

        {showDegradeAlert && (
          <div className="slide-in mt-3 rounded-sm border border-danger/50 bg-danger/10 px-3 py-2 text-xs font-mono text-danger">
            Gateway Health & Telemetry: "Gateway A degradation threshold breached." → Route Selection & Safe Fallback engaged
          </div>
        )}

        {running && (
          <div className="mt-4 space-y-2">
            <StageLoopBar compact={true} />
            <p className="font-mono text-[11px] text-muted-foreground">
              Live split: A {Math.round(gateways.A.traffic)}% · B {Math.round(gateways.B.traffic)}% · C {Math.round(gateways.C.traffic)}%
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
