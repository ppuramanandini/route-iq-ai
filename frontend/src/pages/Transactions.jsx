import React, { useState } from "react";
import { Pause, Play, Search } from "lucide-react";
import { formatTime, formatInr } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { RiskBadge } from "../components/RiskBadge";
import { TransactionModal } from "../components/TransactionModal";

export function Transactions() {
  const { txs, tps } = useSim();
  const [filterGw, setFilterGw] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [frozenTxs, setFrozenTxs] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  const togglePause = () => {
    if (!isPaused) {
      setFrozenTxs([...txs]);
      setIsPaused(true);
    } else {
      setFrozenTxs(null);
      setIsPaused(false);
    }
  };

  const currentList = isPaused && frozenTxs ? frozenTxs : txs;

  const filtered = currentList.filter((tx) => {
    if (filterGw !== "ALL" && tx.gateway !== filterGw) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        tx.id.toLowerCase().includes(term) ||
        tx.merchant.toLowerCase().includes(term) ||
        tx.method.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Transactions"
        sub="Live routed transactions with gateway, latency, retry and routing decision — click any row for a full trace."
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={togglePause}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              {isPaused ? <Play className="h-3.5 w-3.5 text-success" /> : <Pause className="h-3.5 w-3.5 text-warning" />}
              {isPaused ? "Resume stream" : "Pause stream"}
            </button>
            <span className="font-mono text-xs text-muted-foreground">
              {tps.toLocaleString()} tx/s
            </span>
          </div>
        }
      />

      <Card>
        {/* Search and Filters Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            {["ALL", "A", "B", "C"].map((gw) => (
              <button
                key={gw}
                onClick={() => setFilterGw(gw)}
                className={`rounded-sm border px-3 py-1 font-mono text-xs uppercase transition-colors ${
                  filterGw === gw
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {gw === "ALL" ? "All Gateways" : `Gateway ${gw}`}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Tx ID, Merchant, Method…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-border bg-input py-1.5 pl-8 pr-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="console-table-scroll overflow-x-auto">
          <table className="console-full-transactions font-mono text-xs" aria-label="Transactions">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>Time</th>
                <th style={{ width: "11%" }}>Tx ID</th>
                <th style={{ width: "12%" }}>Merchant</th>
                <th style={{ width: "10%" }}>Amount</th>
                <th style={{ width: "8%" }}>Method</th>
                <th style={{ width: "10%" }}>Gateway</th>
                <th style={{ width: "9%" }}>Status</th>
                <th style={{ width: "8%" }}>Latency</th>
                <th style={{ width: "6%" }}>Retry</th>
                <th style={{ width: "8%" }}>Risk</th>
                <th style={{ width: "10%" }}>Routing Decision</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">No matching transactions in buffer</td>
                </tr>
              ) : filtered.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTx(tx);
                    }
                  }}
                  tabIndex={0}
                  className="cursor-pointer"
                >
                  <td className="whitespace-nowrap text-muted-foreground">{formatTime(tx.ts)}</td>
                  <td className="whitespace-nowrap font-semibold text-cyan">{tx.id}</td>
                  <td className="truncate text-foreground" title={tx.merchant}>{tx.merchant}</td>
                  <td className="whitespace-nowrap font-semibold text-foreground">{formatInr(tx.amount)}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{tx.method}</td>
                  <td className="whitespace-nowrap font-semibold text-cyan">Gateway {tx.gateway}</td>
                  <td><StatusBadge status={tx.status} /></td>
                  <td className={`whitespace-nowrap ${tx.latency > 500 ? "font-bold text-danger" : "text-muted-foreground"}`}>{tx.latency}ms</td>
                  <td className="text-muted-foreground">{tx.retry ? "1" : "0"}</td>
                  <td><RiskBadge risk={tx.risk} /></td>
                  <td className="truncate text-muted-foreground" title={tx.decision}>{tx.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedTx && <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  );
}
