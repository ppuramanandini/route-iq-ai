import React from "react";
import { ShieldCheck, FileText } from "lucide-react";
import { formatTime } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";

export function AuditTrail() {
  const { audit } = useSim();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Audit Trail"
        sub="Every autonomous routing action with reason, confidence, simulation evidence, guardrail result and verification."
      />

      <Card>
        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5">Audit ID</th>
                <th>Time</th>
                <th>Action</th>
                <th>Scope</th>
                <th>Agent</th>
                <th>Reason / Rationale</th>
                <th>Confidence</th>
                <th>Simulation Evidence</th>
                <th>Guardrail</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {audit.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-card">
                  <td className="py-3 font-semibold text-foreground">{row.id}</td>
                  <td className="text-muted-foreground">{formatTime(row.ts, true)}</td>
                  <td>
                    <span className="font-semibold text-cyan">{row.action}</span>
                  </td>
                  <td className="text-muted-foreground">
                    {row.from && row.to ? `${row.from} → ${row.to} (${row.amount})` : "Global policy"}
                  </td>
                  <td className="text-foreground">{row.agent}</td>
                  <td className="max-w-xs text-muted-foreground truncate" title={row.reason}>
                    {row.reason}
                  </td>
                  <td className="font-bold text-success">{row.confidence}%</td>
                  <td className="max-w-xs text-muted-foreground truncate" title={row.simulation}>
                    {row.simulation || "Pre-flight checks"}
                  </td>
                  <td>
                    <StatusBadge status={row.guardrail} />
                  </td>
                  <td>
                    <StatusBadge status={row.verification} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
