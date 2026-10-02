import React from "react";
import { Building2, Server, Layers } from "lucide-react";
import { RotatingEarth } from "./RotatingEarth";

/* ===================================================================
   HeroControlRoom — Enterprise Fintech Hero Visualization
   
   The Earth floats freely without a bounding box.
   Small translucent info panels overlay around the Earth.
   Transaction flow runs as a minimal strip below.
   =================================================================== */

const panelStyle = {
  padding: "12px 16px",
  borderRadius: "14px",
  backgroundColor: "rgba(2, 7, 22, 0.72)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(56, 189, 248, 0.18)",
  boxShadow: "0 8px 32px rgba(0, 5, 20, 0.6), 0 0 20px rgba(0, 180, 255, 0.08)",
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: "11px",
  userSelect: "none"
};

export function HeroControlRoom() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "640px",
        marginLeft: "auto",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "620px"
      }}
    >
      {/* ============================================================== */}
      {/* EARTH — Floating freely, no surrounding box                    */}
      {/* ============================================================== */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1
        }}
      >
        {/* Subtle ambient glow behind the Earth (not a box) */}
        <div
          style={{
            position: "absolute",
            width: "520px",
            height: "520px",
            background: "radial-gradient(circle, rgba(0, 180, 255, 0.14) 0%, rgba(0, 120, 255, 0.06) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0
          }}
        />
        <RotatingEarth size={520} />
      </div>

      {/* ============================================================== */}
      {/* FLOATING PANEL — Live Payment Routing (Top-Right)              */}
      {/* ============================================================== */}
      <div
        style={{
          ...panelStyle,
          position: "absolute",
          top: "14px",
          right: "8px",
          zIndex: 10,
          minWidth: "210px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
            <span style={{ color: "#e2e8f0", fontWeight: 600, letterSpacing: "0.06em", fontSize: "10px" }}>
              LIVE PAYMENT ROUTING
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", color: "#cbd5e1" }}>
            <span style={{ color: "#94a3b8" }}>Gateway A</span>
            <span style={{ color: "#34d399" }}>● Online<span style={{ marginLeft: "8px" }}>182 ms</span></span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", color: "#cbd5e1" }}>
            <span style={{ color: "#94a3b8" }}>Gateway B</span>
            <span style={{ color: "#34d399" }}>● Online<span style={{ marginLeft: "8px" }}>206 ms</span></span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", color: "#fbbf24" }}>
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>Gateway C</span>
            <span style={{ color: "#fbbf24", fontWeight: 600 }}>● Degraded<span style={{ marginLeft: "8px" }}>720 ms</span></span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", color: "#cbd5e1" }}>
            <span style={{ color: "#94a3b8" }}>Gateway D</span>
            <span style={{ color: "#34d399" }}>● Online<span style={{ marginLeft: "8px" }}>248 ms</span></span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLOATING PANEL — Routing Status (Right, below gateways)        */}
      {/* ============================================================== */}
      <div
        style={{
          ...panelStyle,
          position: "absolute",
          top: "212px",
          right: "10px",
          zIndex: 10,
          minWidth: "210px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
          <span style={{ color: "#e2e8f0", fontWeight: 600, letterSpacing: "0.06em", fontSize: "10px" }}>
            ROUTING STATUS
          </span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 7px", borderRadius: "9999px", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34d399", fontSize: "9px", fontWeight: 600, marginBottom: "6px" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#34d399" }} />
          ACTIVE
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
            <span style={{ color: "#94a3b8" }}>Primary</span>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>Gateway A</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
            <span style={{ color: "#94a3b8" }}>Fallback</span>
            <span style={{ color: "#cbd5e1" }}>Gateway B</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
            <span style={{ color: "#94a3b8" }}>Health</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>98.4%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
            <span style={{ color: "#94a3b8" }}>Latency</span>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>182 ms</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLOATING PANEL — Transaction Flow (Bottom)                     */}
      {/* ============================================================== */}
      <div
        style={{
          ...panelStyle,
          position: "absolute",
          bottom: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          width: "94%",
          maxWidth: "430px",
          padding: "10px 14px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
            fontSize: "10px",
            color: "#94a3b8"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Layers size={12} style={{ color: "#38bdf8" }} />
            <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "#e2e8f0", fontSize: "9px" }}>
              TRANSACTION FLOW
            </span>
          </div>
        </div>

        {/* Compact Flow: Merchant → SwitchRouteIQ → Gateways → Bank Rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "9px"
          }}
        >
          {/* Merchant */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "7px", backgroundColor: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
              <Building2 size={13} />
            </div>
            <span style={{ color: "#94a3b8", fontSize: "8px" }}>Merchant</span>
          </div>

          {/* Line */}
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, rgba(56, 189, 248, 0.15), rgba(56, 189, 248, 0.4), rgba(56, 189, 248, 0.15))", margin: "0 4px" }} />

          {/* SwitchRouteIQ */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div style={{ padding: "3px 8px", borderRadius: "6px", backgroundColor: "rgba(8, 47, 73, 0.6)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", fontWeight: 700, fontSize: "9px" }}>
              SwitchRoute<span style={{ color: "#ffffff" }}>IQ</span>
            </div>
          </div>

          {/* Line */}
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, rgba(56, 189, 248, 0.15), rgba(56, 189, 248, 0.4), rgba(56, 189, 248, 0.15))", margin: "0 4px" }} />

          {/* Gateways */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ padding: "1px 5px", borderRadius: "3px", backgroundColor: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#34d399", fontSize: "7px" }}>
              Gateways
            </div>
          </div>

          {/* Line */}
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, rgba(56, 189, 248, 0.15), rgba(56, 189, 248, 0.4), rgba(56, 189, 248, 0.15))", margin: "0 4px" }} />

          {/* Bank Rail */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "7px", backgroundColor: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399" }}>
              <Server size={13} />
            </div>
            <span style={{ color: "#94a3b8", fontSize: "8px" }}>Bank / Rail</span>
          </div>
        </div>
      </div>
    </div>
  );
}
