import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { StatusDot } from "./StatusDot";
import { useSim } from "../context/SimContext";
import "./console.css";

export const NAV_LINKS = [
  ["/command-center", "Command Center"],
  ["/live-routing", "Live Routing"],
  ["/gateways", "Gateway Health"],
  ["/agents", "AI Agents"],
  ["/simulator", "What-If Simulator"],
  ["/transactions", "Transactions"],
  ["/recovery", "Recovery"],
  ["/autonomous-recovery", "Autonomous Recovery"],
  ["/analytics", "Analytics"],
  ["/audit", "Audit Trail"],
  ["/developer", "Developer / API"],
  ["/settings", "Settings"]
];

export function Layout({ currentPath, onNavigate, children }) {
  const { running, gateways } = useSim();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("sriq_session");
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        setSession({ email: "ops@foodapp.in", role: "Payment Operations" });
      }
    } else {
      setSession({ email: "ops@foodapp.in", role: "Payment Operations" });
    }
  }, []);

  const isDegraded = gateways.A.risk === "HIGH" || gateways.B.risk === "HIGH" || gateways.C.risk === "HIGH";

  const handleSignOut = () => {
    sessionStorage.removeItem("sriq_session");
    onNavigate("/");
  };

  return (
    <div className="console-shell min-h-screen bg-background text-foreground flex flex-col justify-between">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="console-header-top flex items-center justify-between gap-6 px-5 py-2.5">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate("/command-center")}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <Logo size={28} />
              <span className="text-[15px] font-bold tracking-[0.12em]">
                SWITCHROUTE<span className="text-cyan">IQ</span>
              </span>
            </button>

            <div className="hidden items-center gap-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:flex">
              <span className="flex items-center gap-2">
                <StatusDot tone={isDegraded ? "warn" : "good"} /> System:{" "}
                <span className={isDegraded ? "text-warning" : "text-success"}>
                  {isDegraded ? "DEGRADED · SELF-HEALING" : "OPERATIONAL"}
                </span>
              </span>
              <span>
                Env: <span className="text-warning">SANDBOX</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session && (
              <div className="hidden text-right text-xs sm:block">
                <div className="font-mono text-muted-foreground">{session.email}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-cyan">{session.role}</div>
              </div>
            )}
            <button
              aria-label="Sign out"
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-sm border border-border p-2 text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Navigation bar */}
        <nav className="console-nav flex gap-0.5 overflow-x-auto px-3 scrollbar-none border-t border-border/40">
          {NAV_LINKS.map(([path, label]) => {
            const isActive = currentPath === path;
            return (
              <button
                key={path}
                onClick={() => onNavigate(path)}
                aria-current={isActive ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Scan line active during incident */}
        {running && (
          <div className="h-0.5 w-full overflow-hidden bg-danger/20">
            <div className="scan h-full w-1/3 bg-danger" />
          </div>
        )}
      </header>

      <main className="console-content mx-auto w-full max-w-[1800px] flex-1 px-5 py-6">
        <div className="console-page">{children}</div>
      </main>

      <footer className="console-footer border-t border-border/30 px-5 py-6 font-mono text-[10px] text-muted-foreground">
        All gateways, transactions and amounts are simulated for demonstration. No real bank transactions are processed.
      </footer>
    </div>
  );
}
