import React, { useState } from "react";
import { Search } from "lucide-react";
import { formatTime } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";

export function AuditTrail() {
  const { audit } = useSim();
  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const agents = Array.from(new Set(audit.map((row) => row.agent))).sort();
  const visibleAudit = audit.filter((row) => {
    const matchesAgent = agentFilter === "ALL" || row.agent === agentFilter;
    const searchable = `${row.id} ${row.action} ${row.agent} ${row.reason}`.toLowerCase();
    return matchesAgent && searchable.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Audit Trail"
        sub="Every autonomous routing action with reason, confidence, simulation evidence, guardrail result and verification."
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              aria-label="Search audit events"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search event, action, agent..."
              className="w-full rounded border border-border bg-input py-2 pl-9 pr-3 text-sm text-foreground"
            />
          </div>
          <select aria-label="Filter by agent" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} className="rounded border border-border bg-input px-3 py-2 text-sm text-foreground">
            <option value="ALL">All agents</option>
            {agents.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
          </select>
          <span className="font-mono text-xs text-muted-foreground">{visibleAudit.length} events</span>
        </div>
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
              {visibleAudit.map((row) => (
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
