import React, { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Logo } from "../components/Logo";
import "./SignIn.css";

const ROLES = [
  "Merchant Admin",
  "Payment Operations",
  "Developer",
  "Security Administrator"
];

export function SignIn({ onSignInSuccess, onBack }) {
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
    <div className="signin-page grid min-h-screen lg:grid-cols-[1.1fr_1fr] bg-background text-foreground">
      {/* Left branding pane */}
      <div className="signin-visual-pane relative hidden flex-col justify-between border-r border-border p-12 lg:flex">
        <div className="flex items-center justify-between">
          <div
            onClick={onBack}
            className={`signin-brand flex items-center ${onBack ? "cursor-pointer hover:opacity-90" : ""}`}
          >
            <Logo size={34} />
            <span className="signin-brand-name">
              SWITCHROUTE<span className="text-cyan">IQ</span>
            </span>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="signin-back-link font-mono cursor-pointer"
            >
              ← Back to Home
            </button>
          )}
        </div>

        <div className="signin-visual-copy">
          <p className="signin-visual-kicker">INTELLIGENT PAYMENT ROUTING</p>
          <p className="signin-visual-statement">Route every payment through the safest available path.</p>
        </div>

        <div className="signin-operational">
          <span className="signin-operational-dot" />
          <span>PAYMENT ROUTING INFRASTRUCTURE</span>
          <span className="text-success">OPERATIONAL</span>
        </div>
      </div>

      {/* Right sign-in form pane */}
      <div className="signin-form-pane flex items-center justify-center p-6 sm:p-12">
        <div className="signin-form-card w-full max-w-md">
          <div className="signin-mobile-top lg:hidden">
            <div className="signin-brand flex items-center">
              <Logo size={30} />
              <span className="signin-brand-name">SWITCHROUTE<span className="text-cyan">IQ</span></span>
            </div>
            {onBack && <button type="button" onClick={onBack} className="signin-back-link font-mono">← Back to Home</button>}
          </div>

          <div>
            <h2 className="signin-form-heading">Sign in to console</h2>
            <p className="signin-form-subtitle">Access payment routing infrastructure</p>
          </div>

          <form onSubmit={handleSubmit} className="signin-form-fields">
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
              className="signin-submit flex w-full items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              {isLoading ? "Authenticating…" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => authenticate("demo@switchrouteiq.io", role)}
              className="signin-demo w-full rounded border border-border py-2 font-mono text-[11px] uppercase"
            >
              Demo access · sandbox
            </button>
          </form>

          <p className="signin-security-note flex items-center gap-2 font-mono justify-center">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            SSO · mTLS · SOC 2 controls (simulated environment)
          </p>
        </div>
      </div>
    </div>
  );
}
