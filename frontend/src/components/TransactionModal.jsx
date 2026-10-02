import React from "react";
import { X, ShieldCheck } from "lucide-react";
import { formatTime, formatInr } from "../lib/utils";
import { RiskBadge } from "./RiskBadge";
import { StatusBadge } from "./StatusBadge";

export function TransactionModal({ tx, onClose }) {
  if (!tx) return null;

  const mockTrace = {
    trace_id: `tr_${tx.id.toLowerCase()}_${Math.random().toString(36).substring(2, 8)}`,
    idempotency_key: `idemp_${tx.id.toLowerCase()}_${tx.merchant.toLowerCase()}`,
    client_merchant: tx.merchant,
    payment_method: tx.method,
    amount_inr: tx.amount,
    gateway_selected: `Gateway ${tx.gateway}`,
    routing_reason: tx.decision,
    gateway_latency_ms: tx.latency,
    status: tx.status,
    retry_executed: tx.retry,
    risk_assessment: tx.risk,
    created_at: new Date(tx.ts).toISOString(),
    audit_reference: "AUD-" + (7700 + parseInt(tx.id.replace(/\D/g, "") || "10") % 100),
    guardrails: {
      sla_limit_ms: 500,
      sla_passed: tx.latency <= 500,
      idempotency_cached: true,
      duplicate_debit_risk: "ZERO"
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-lg font-bold text-foreground">{tx.id}</h2>
              <StatusBadge status={tx.status} />
              <RiskBadge risk={tx.risk} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Trace: {mockTrace.trace_id} · {formatTime(tx.ts, true)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="rounded border border-border/60 bg-secondary/30 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Amount</span>
            <div className="mt-1 font-semibold text-foreground">{formatInr(tx.amount)}</div>
          </div>
          <div className="rounded border border-border/60 bg-secondary/30 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Method</span>
            <div className="mt-1 font-semibold text-foreground">{tx.method}</div>
          </div>
          <div className="rounded border border-border/60 bg-secondary/30 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Merchant</span>
            <div className="mt-1 font-semibold text-foreground">{tx.merchant}</div>
          </div>
          <div className="rounded border border-border/60 bg-secondary/30 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Gateway</span>
            <div className="mt-1 font-semibold text-cyan">Gateway {tx.gateway}</div>
          </div>
        </div>

        <div className="mt-4 rounded border border-border/60 bg-secondary/20 p-3 font-mono text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Routing Decision</span>
            <span className="text-[10px] uppercase text-primary">Autonomous Policy</span>
          </div>
          <p className="mt-1 font-semibold text-foreground">{tx.decision}</p>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>Latency: <strong className={tx.latency > 500 ? "text-danger" : "text-foreground"}>{tx.latency}ms</strong></span>
            <span>Retry: <strong className="text-foreground">{tx.retry ? "Yes (Self-Healing)" : "None"}</strong></span>
            <span>Audit: <strong className="text-foreground">{mockTrace.audit_reference}</strong></span>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Raw Telemetry & Verification Trace</span>
            <span className="flex items-center gap-1 text-success">
              <ShieldCheck className="h-3 w-3" /> Idempotent & Guarded
            </span>
          </div>
          <pre className="max-h-56 overflow-y-auto rounded bg-background/90 p-3 font-mono text-[11px] text-cyan border border-border">
            {JSON.stringify(mockTrace, null, 2)}
          </pre>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded border border-border bg-secondary px-4 py-2 font-mono text-xs uppercase tracking-wider text-foreground hover:bg-secondary/80"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
}
