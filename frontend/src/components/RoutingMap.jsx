import React from "react";
import { cn, GATEWAY_COLORS } from "../lib/utils";
import { useSim, MERCHANTS, STAGES } from "../context/SimContext";
import { RiskBadge } from "./RiskBadge";

export function RoutingMap({ detailed = true }) {
  const { gateways, running, stage, tps } = useSim();

  const center = { x: 400, y: 190 };
  const merchantYs = [70, 150, 230, 310];
  const gatewayYs = { A: 80, B: 190, C: 300 };
  const networkPos = { x: 900, y: 150 };
  const bankPos = { x: 900, y: 300 };

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox="0 0 1000 440" className="w-full h-auto">
        <defs>
          <radialGradient id="engGlow">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Merchant to Engine flow lines */}
        {MERCHANTS.map((m, idx) => (
          <path
            key={m}
            d={`M150 ${merchantYs[idx]} C 280 ${merchantYs[idx]}, 280 ${center.y}, ${center.x - 70} ${center.y}`}
            fill="none"
            stroke="var(--cyan)"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            className="flow-line"
          />
        ))}

        {/* Engine to Gateways flow lines */}
        {["A", "B", "C"].map((k) => {
          const gw = gateways[k];
          const strokeW = 1 + gw.traffic / 7;
          const color = gw.risk === "HIGH" ? "var(--danger)" : GATEWAY_COLORS[k];
          const animDuration = Math.max(0.35, 2.2 - gw.traffic / 30);

          return (
            <g key={k}>
              <path
                d={`M${center.x + 70} ${center.y} C 560 ${center.y}, 560 ${gatewayYs[k]}, 610 ${gatewayYs[k]}`}
                fill="none"
                stroke={color}
                strokeOpacity="0.15"
                strokeWidth={strokeW + 6}
                style={{ transition: "stroke-width 1s" }}
              />
              <path
                d={`M${center.x + 70} ${center.y} C 560 ${center.y}, 560 ${gatewayYs[k]}, 610 ${gatewayYs[k]}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                className="flow-line"
                style={{
                  animationDuration: `${animDuration}s`,
                  transition: "stroke-width 1s"
                }}
              />
              <text
                x="560"
                y={(center.y + gatewayYs[k]) / 2 - 6}
                fill={color}
                fontSize="12"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {Math.round(gw.traffic)}%
              </text>
              <path
                d={`M790 ${gatewayYs[k]} L ${networkPos.x - 50} ${networkPos.y}`}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeOpacity="0.35"
                strokeWidth="1"
                className="flow-line"
              />
            </g>
          );
        })}

        {/* Payment Network to Customer Bank line */}
        <path
          d={`M${networkPos.x} ${networkPos.y + 26} L ${bankPos.x} ${bankPos.y - 26}`}
          stroke="var(--muted-foreground)"
          strokeOpacity="0.4"
          className="flow-line"
          fill="none"
        />

        {/* Merchant Nodes */}
        <text x="20" y="30" fill="var(--muted-foreground)" fontSize="10" fontFamily="JetBrains Mono" letterSpacing="2">
          MERCHANTS
        </text>
        {MERCHANTS.map((m, idx) => (
          <g key={m}>
            <rect x="20" y={merchantYs[idx] - 18} width="130" height="36" rx="3" fill="var(--card)" stroke="var(--border)" />
            <circle cx="36" cy={merchantYs[idx]} r="3" fill="var(--success)" />
            <text x="48" y={merchantYs[idx] + 4} fill="var(--foreground)" fontSize="13" fontFamily="Space Grotesk">
              {m}
            </text>
          </g>
        ))}

        {/* Center Engine Node */}
        <circle cx={center.x} cy={center.y} r="130" fill="url(#engGlow)" />
        <rect
          x={center.x - 70}
          y={center.y - 44}
          width="140"
          height="88"
          rx="4"
          fill="var(--card)"
          stroke={running ? "var(--cyan)" : "var(--primary)"}
          strokeWidth="1.5"
        />
        <text x={center.x} y={center.y - 18} fill="var(--muted-foreground)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" letterSpacing="1.5">
          ROUTING ENGINE
        </text>
        <text x={center.x} y={center.y + 4} fill="var(--foreground)" fontSize="15" fontWeight="600" fontFamily="Space Grotesk" textAnchor="middle">
          SWITCHROUTEIQ
        </text>
        <text
          x={center.x}
          y={center.y + 26}
          fill={running ? "var(--cyan)" : "var(--success)"}
          fontSize="10"
          fontFamily="JetBrains Mono"
          textAnchor="middle"
        >
          {running ? STAGES[stage] : `${tps.toLocaleString()} tx/s`}
        </text>

        {/* Gateway Nodes */}
        {["A", "B", "C"].map((k) => {
          const gw = gateways[k];
          const borderColor = gw.risk === "HIGH" ? "var(--danger)" : gw.risk === "MEDIUM" ? "var(--warning)" : "var(--success)";

          return (
            <g key={k}>
              <rect x="610" y={gatewayYs[k] - 34} width="180" height="68" rx="3" fill="var(--card)" stroke={borderColor} strokeOpacity="0.7" />
              <circle cx="624" cy={gatewayYs[k] - 18} r="4" fill={borderColor}>
                <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
              </circle>
              <text x="634" y={gatewayYs[k] - 14} fill="var(--foreground)" fontSize="13" fontWeight="600" fontFamily="Space Grotesk">
                {gw.name}
              </text>
              <text x="780" y={gatewayYs[k] - 14} fill={borderColor} fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
                {gw.risk}
              </text>
              <text x="624" y={gatewayYs[k] + 6} fill="var(--muted-foreground)" fontSize="10" fontFamily="JetBrains Mono">
                SR <tspan fill="var(--foreground)">{gw.success.toFixed(1)}%</tspan>  LAT <tspan fill={gw.latency > 500 ? "var(--danger)" : "var(--foreground)"}>{gw.latency}ms</tspan>
              </text>
              <text x="624" y={gatewayYs[k] + 22} fill="var(--muted-foreground)" fontSize="10" fontFamily="JetBrains Mono">
                ERR <tspan fill="var(--foreground)">{gw.errors}%</tspan>  ₹{gw.cost}/tx
              </text>
            </g>
          );
        })}

        {/* Right Target Nodes */}
        {[
          { ...networkPos, label: "PAYMENT NETWORK", sub: "NPCI · Visa · MC" },
          { ...bankPos, label: "CUSTOMER BANK", sub: "Issuer" }
        ].map((node) => (
          <g key={node.label}>
            <rect x={node.x - 80} y={node.y - 26} width="160" height="52" rx="3" fill="var(--card)" stroke="var(--border)" />
            <text x={node.x} y={node.y - 4} fill="var(--foreground)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle" letterSpacing="1">
              {node.label}
            </text>
            <text x={node.x} y={node.y + 13} fill="var(--muted-foreground)" fontSize="10" fontFamily="Space Grotesk" textAnchor="middle">
              {node.sub}
            </text>
          </g>
        ))}

        <text x="20" y="424" fill="var(--muted-foreground)" fontSize="10" fontFamily="JetBrains Mono">
          Customer → Merchant App → SwitchRouteIQ → Gateway A/B/C → Payment Network → Customer Bank · simulated traffic
        </text>
      </svg>

      {detailed && (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {["A", "B", "C"].map((k) => {
            const gw = gateways[k];
            return (
              <div
                key={k}
                className={cn(
                  "rounded-sm border bg-card/60 p-3 font-mono text-[11px] transition-colors",
                  gw.risk === "HIGH" ? "border-danger/60" : "border-border"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-sans text-sm font-semibold" style={{ color: GATEWAY_COLORS[k] }}>
                    {gw.name}
                  </span>
                  <RiskBadge risk={gw.risk} />
                </div>
                <div className="grid grid-cols-3 gap-y-1.5">
                  {[
                    ["Health", `${gw.health}%`],
                    ["Success", `${gw.success.toFixed(1)}%`],
                    ["Latency", `${gw.latency}ms`],
                    ["Errors", `${gw.errors}%`],
                    ["Traffic", `${Math.round(gw.traffic)}%`],
                    ["Cost", `₹${gw.cost}`]
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
                      <div>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
