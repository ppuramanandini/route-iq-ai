import React, { useState } from "react";
import { formatTime, formatInr } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { StatusBadge } from "./StatusBadge";
import { TransactionModal } from "./TransactionModal";

export function TransactionsTable({ limit = 12, gateway = null }) {
  const { txs } = useSim();
  const [selectedTx, setSelectedTx] = useState(null);

  const filtered = (gateway ? txs.filter((t) => t.gateway === gateway) : txs).slice(0, limit);

  return (
    <>
      <div className="font-mono text-[11px] overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[70px_80px_1fr_65px_36px_85px_56px] gap-2 border-b border-border pb-2 text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>Time</span>
          <span>Tx</span>
          <span>Amount</span>
          <span>Method</span>
          <span>GW</span>
          <span>Status</span>
          <span className="text-right">Latency</span>
        </div>

        {filtered.length === 0 && (
          <div className="py-6 text-center text-muted-foreground">No transactions recorded yet</div>
        )}

        <div className="divide-y divide-border/40">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="grid min-w-[560px] grid-cols-[70px_80px_1fr_65px_36px_85px_56px] items-center gap-2 py-2 transition-colors hover:bg-card/80 cursor-pointer"
            >
              <span className="text-muted-foreground">{formatTime(tx.ts)}</span>
              <span className="font-medium text-foreground">{tx.id}</span>
              <span className="text-foreground">{formatInr(tx.amount)}</span>
              <span className="text-muted-foreground">{tx.method}</span>
              <span className="text-cyan font-bold">{tx.gateway}</span>
              <div>
                <StatusBadge status={tx.status} />
              </div>
              <span className={`text-right ${tx.latency > 500 ? "text-danger font-bold" : "text-muted-foreground"}`}>
                {tx.latency}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedTx && <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </>
  );
}
