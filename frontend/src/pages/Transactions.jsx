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
        <div className="font-mono text-[11px] overflow-x-auto">
          <div className="grid min-w-[800px] grid-cols-[80px_100px_120px_100px_80px_60px_90px_140px_70px] gap-2 border-b border-border pb-2 text-[9px] uppercase tracking-wider text-muted-foreground">
            <span>Time</span>
            <span>Tx ID</span>
            <span>Merchant</span>
            <span>Amount</span>
            <span>Method</span>
            <span>GW</span>
            <span>Status</span>
            <span>Decision</span>
            <span className="text-right">Latency</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No matching transactions in buffer
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="grid min-w-[800px] grid-cols-[80px_100px_120px_100px_80px_60px_90px_140px_70px] items-center gap-2 py-2.5 transition-colors hover:bg-card/80 cursor-pointer"
                >
                  <span className="text-muted-foreground">{formatTime(tx.ts)}</span>
                  <span className="font-semibold text-foreground">{tx.id}</span>
                  <span className="text-foreground">{tx.merchant}</span>
                  <span className="text-foreground font-semibold">{formatInr(tx.amount)}</span>
                  <span className="text-muted-foreground">{tx.method}</span>
                  <span className="text-cyan font-bold">Gateway {tx.gateway}</span>
                  <div>
                    <StatusBadge status={tx.status} />
                  </div>
                  <span className="text-muted-foreground truncate">{tx.decision}</span>
                  <span className={`text-right ${tx.latency > 500 ? "text-danger font-bold" : "text-muted-foreground"}`}>
                    {tx.latency}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {selectedTx && <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  );
}
