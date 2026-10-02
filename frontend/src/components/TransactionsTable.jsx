import React, { useState, useEffect, useRef } from "react";
import { formatTime, formatInr } from "../lib/utils";
import { useSim } from "../context/SimContext";
import { StatusBadge } from "./StatusBadge";
import { TransactionModal } from "./TransactionModal";

export function TransactionsTable({ limit = 14, gateway = null }) {
  const { txs } = useSim();
  const [selectedTx, setSelectedTx] = useState(null);
  const prevSeenIdsRef = useRef(new Set());
  const [newlyArrivedIds, setNewlyArrivedIds] = useState(new Set());

  const filtered = (gateway ? txs.filter((t) => t.gateway === gateway) : txs).slice(0, limit);

  // Track newly arrived transactions for a subtle highlight animation
  useEffect(() => {
    if (filtered.length === 0) return;

    if (prevSeenIdsRef.current.size === 0) {
      prevSeenIdsRef.current = new Set(filtered.map((t) => t.id));
      return;
    }

    const incoming = new Set();
    filtered.forEach((t) => {
      if (!prevSeenIdsRef.current.has(t.id)) {
        incoming.add(t.id);
      }
    });

    if (incoming.size > 0) {
      setNewlyArrivedIds(incoming);
      prevSeenIdsRef.current = new Set(filtered.map((t) => t.id));
      const timer = setTimeout(() => {
        setNewlyArrivedIds(new Set());
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [filtered]);

  return (
    <>
      <style>{`
        @keyframes txRowArrive {
          0% {
            background-color: rgba(0, 240, 255, 0.18);
            transform: translateY(-2px);
          }
          100% {
            background-color: transparent;
            transform: translateY(0);
          }
        }
        .tx-row-new {
          animation: txRowArrive 1.6s ease-out forwards;
        }
        .tx-table-row {
          transition: background-color 0.15s ease;
        }
        .tx-table-row:hover {
          background-color: rgba(0, 240, 255, 0.05);
        }
      `}</style>

      <div className="w-full overflow-x-auto">
        <table
          aria-label="Live transactions"
          className="console-transaction-table w-full border-collapse text-left font-mono text-xs"
          style={{ minWidth: "920px", tableLayout: "fixed" }}
        >
          <thead>
            <tr className="border-b border-[#14233a] bg-[#081224]/80 text-[10px] uppercase tracking-wider text-[#7e92ad]">
              <th style={{ width: "10%" }} className="py-2.5 px-3 font-semibold">TIME</th>
              <th style={{ width: "13%" }} className="py-2.5 px-3 font-semibold">TX ID</th>
              <th style={{ width: "13%" }} className="py-2.5 px-3 font-semibold">MERCHANT</th>
              <th style={{ width: "12%" }} className="py-2.5 px-3 font-semibold">AMOUNT</th>
              <th style={{ width: "9%" }} className="py-2.5 px-3 font-semibold">METHOD</th>
              <th style={{ width: "11%" }} className="py-2.5 px-2 text-center font-semibold">GATEWAY</th>
              <th style={{ width: "12%" }} className="py-2.5 px-3 font-semibold">STATUS</th>
              <th style={{ width: "10%" }} className="py-2.5 px-3 text-right font-semibold">LATENCY</th>
              <th style={{ width: "10%" }} className="py-2.5 px-3 font-semibold">DECISION</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#132238]/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#64748b]">
                  Waiting for live payment telemetry...
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isNew = newlyArrivedIds.has(tx.id);
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className={`tx-table-row cursor-pointer ${isNew ? "tx-row-new" : ""}`}
                  >
                    {/* TIME */}
                    <td className="py-2.5 px-3 text-[#8fa0b8] whitespace-nowrap">
                      {formatTime(tx.ts)}
                    </td>

                    {/* TX */}
                    <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                      <span className="text-cyan font-bold">{tx.id}</span>
                    </td>

                    <td className="py-2.5 px-3 text-foreground truncate" title={tx.merchant}>{tx.merchant}</td>

                    {/* AMOUNT */}
                    <td className="py-2.5 px-3 font-medium text-[#e2e8f0] whitespace-nowrap">
                      {formatInr(tx.amount)}
                    </td>

                    {/* METHOD */}
                    <td className="py-2.5 px-3 text-[#94a3b8] whitespace-nowrap">
                      {tx.method}
                    </td>

                    {/* GW */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span
                        className="inline-flex items-center justify-center font-mono font-bold text-[10px] w-5 h-5 rounded-[3px]"
                        style={
                          tx.gateway === "A"
                            ? {
                                color: "#38bdf8",
                                backgroundColor: "rgba(56, 189, 248, 0.12)",
                                border: "1px solid rgba(56, 189, 248, 0.4)"
                              }
                            : tx.gateway === "B"
                            ? {
                                color: "#2dd4bf",
                                backgroundColor: "rgba(45, 212, 191, 0.12)",
                                border: "1px solid rgba(45, 212, 191, 0.4)"
                              }
                            : {
                                color: "#c084fc",
                                backgroundColor: "rgba(192, 132, 252, 0.12)",
                                border: "1px solid rgba(192, 132, 252, 0.4)"
                              }
                        }
                      >
                        {tx.gateway}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge status={tx.status} />
                    </td>

                    {/* LATENCY */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span
                        className={`tabular-nums font-medium ${
                          tx.latency > 500
                            ? "text-[#ef4444] font-bold"
                            : tx.latency > 280
                            ? "text-[#f59e0b]"
                            : "text-[#8fa0b8]"
                        }`}
                      >
                        {tx.latency}ms
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-muted-foreground truncate" title={tx.decision}>{tx.decision}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedTx && <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </>
  );
}

