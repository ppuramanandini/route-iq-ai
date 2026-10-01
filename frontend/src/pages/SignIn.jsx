import React, { useState } from "react";
import { Lock, ShieldCheck, Zap, Server, Activity } from "lucide-react";
import { Logo } from "../components/Logo";

const ROLES = [
  "Merchant Admin",
  "Payment Operations",
  "Developer",
  "Security Administrator"
];

export function SignIn({ onSignInSuccess }) {
  const [email, setEmail] = useState("ops@foodapp.in");
  const [role, setRole] = useState(ROLES[1]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const authenticate = (userEmail, userRole) => {
    setIsLoading(true);
    sessionStorage.setItem("sriq_session", JSON.stringify({ email: userEmail, role: userRole }));
    setTimeout(() => {
      onSignInSuccess("/command-center");
    }, 700);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your corporate email.");
      return;
    }
    setError("");
    authenticate(email, role);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr] bg-background text-foreground">
      {/* Left branding pane */}
      <div className="relative hidden flex-col justify-between border-r border-border p-12 lg:flex">
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <span className="text-lg font-bold tracking-[0.14em]">
            SWITCHROUTE<span className="text-cyan">IQ</span>
          </span>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
            Payment orchestration · B2B
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight">
            Don't wait for payment failure.{" "}
            <span className="text-muted-foreground">Detect and prevent it.</span>
          </h1>
          <p className="mt-5 max-w-lg text-muted-foreground leading-relaxed">
            SwitchRouteIQ sits between your backend and every configured gateway — observing telemetry, selecting routes, validating zero-trust compliance, and executing safe fallback before a payment fails.
          </p>

          <div className="mt-8 grid gap-4 max-w-lg">
            <div className="flex items-start gap-3 rounded border border-border/60 bg-card/40 p-3.5">
              <Zap className="h-5 w-5 text-cyan shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Autonomous Self-Healing</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Detects gateway degradation via real-time telemetry and automatically executes safe fallback routing.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded border border-border/60 bg-card/40 p-3.5">
              <Activity className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Traffic What-If Simulation</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Simulates candidate routing strategies against downstream capacity and cost before touching live traffic.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded border border-border/60 bg-card/40 p-3.5">
              <Server className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Payment Safety & Idempotency</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Guarantees zero duplicate debits during timeout failover via cryptographic idempotency tracking.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>SWITCHROUTEIQ</span>
          <span>Autonomous Payment Routing Infrastructure</span>
        </div>
      </div>

      {/* Right sign-in form pane */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <Logo size={32} />
            <span className="text-lg font-bold tracking-[0.14em]">
              SWITCHROUTE<span className="text-cyan">IQ</span>
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in to console</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Access payment routing infrastructure and live telemetry
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@foodapp.in"
                className="w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-card text-foreground">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-70"
            >
              <Lock className="h-4 w-4" />
              {isLoading ? "Authenticating…" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => authenticate("demo@switchrouteiq.io", role)}
              className="w-full rounded border border-border py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:border-cyan hover:text-cyan transition-colors"
            >
              Demo access · sandbox
            </button>
          </form>

          <p className="mt-6 flex items-center gap-2 font-mono text-[10px] text-muted-foreground justify-center">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            SSO · mTLS · SOC 2 controls (simulated environment)
          </p>
        </div>
      </div>
    </div>
  );
}
