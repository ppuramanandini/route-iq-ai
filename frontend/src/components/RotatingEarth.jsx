import React, { useEffect, useRef } from "react";
import earthTextureUrl from "../assets/earth_texture.jpg";

/* ===================================================================
   RotatingEarth — Premium Realistic 3D WebGL Globe
   
   Features:
   - Photorealistic texture-mapped sphere via WebGL
  - Continuous smooth rotation (~38s per full rotation)
   - Atmospheric Fresnel rim glow (cyan/blue)
   - Great-circle arcs in TWO colors: CYAN (standard) + GOLD (priority)
   - Moving transaction particles: cyan + gold
   - Glowing financial hub nodes with INDIVIDUAL twinkling
   - City labels on prominent hubs
   =================================================================== */

// Key global financial hubs
const HUBS = [
  { name: "New York",  lng: -74.006,  lat: 40.7128, gold: true  },
  { name: "London",    lng: -0.1276,  lat: 51.5074, gold: true  },
  { name: "Frankfurt", lng: 8.6821,   lat: 50.1109, gold: false },
  { name: "Dubai",     lng: 55.2708,  lat: 25.2048, gold: true  },
  { name: "Mumbai",    lng: 72.8777,  lat: 19.076,  gold: false },
  { name: "Singapore", lng: 103.8198, lat: 1.3521,  gold: true  },
  { name: "Tokyo",     lng: 139.6917, lat: 35.6895, gold: false },
  { name: "Sydney",    lng: 151.2093, lat: -33.8688,gold: false },
];

// Routes: gold=true = premium/high-priority (warm gold color)
// gold=false = standard cyan routing
const ROUTES = [
  { from: "London",    to: "New York",  gold: true,  arcH: 0.07 }, // transatlantic premium
  { from: "Dubai",     to: "Mumbai",    gold: true,  arcH: 0.05 }, // Middle East-India premium
  { from: "Singapore", to: "London",    gold: true,  arcH: 0.10 }, // SE Asia-Europe premium
  { from: "New York",  to: "Frankfurt", gold: true,  arcH: 0.06 }, // US-Europe premium
  { from: "Mumbai",    to: "London",    gold: false, arcH: 0.08 }, // India-Europe
  { from: "New York",  to: "Tokyo",     gold: false, arcH: 0.09 }, // Trans-Pacific
  { from: "Tokyo",     to: "Singapore", gold: false, arcH: 0.04 }, // Asia
  { from: "Singapore", to: "Mumbai",    gold: false, arcH: 0.05 }, // Asia-India
  { from: "Frankfurt", to: "Dubai",     gold: false, arcH: 0.05 }, // Europe-ME
  { from: "Dubai",     to: "Singapore", gold: false, arcH: 0.06 }, // ME-SE Asia
  { from: "Singapore", to: "Sydney",    gold: false, arcH: 0.04 }, // Asia-Pacific
  { from: "Tokyo",     to: "Sydney",    gold: false, arcH: 0.05 }, // Pacific
  { from: "London",    to: "Frankfurt", gold: false, arcH: 0.03 }, // Europe intra
];

export function RotatingEarth({ size = 480, className = "" }) {
  const containerRef = useRef(null);
  const glCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!glCanvas || !overlayCanvas) return;

    const reducedMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const prefersReducedMotion = reducedMotionQuery ? reducedMotionQuery.matches : false;

    const gl = glCanvas.getContext("webgl", { alpha: true, antialias: true });
    const ctx = overlayCanvas.getContext("2d");
    if (!gl || !ctx) return;

    let animId;
    let rotation = 3.8;
    let pulseTick = 0;
    let prog = null;
    let posBuf = null;
    let uvBuf = null;
    let idxBuf = null;
    let tex = null;
    let disposed = false;
    let previousFrame = null;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasPx = size * dpr;
    glCanvas.width = overlayCanvas.width = canvasPx;
    glCanvas.height = overlayCanvas.height = canvasPx;
    gl.viewport(0, 0, canvasPx, canvasPx);

    // Each hub gets its own independent twinkle phase offset
    const hubPhases = HUBS.map((_, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.018 + Math.random() * 0.024,
      amp: 0.35 + Math.random() * 0.45
    }));

    // Particles per route — staggered start positions
    const makeParticles = (count, speedMult) =>
      ROUTES.map((r, i) => ({
        routeIdx: i,
        t: (i * (1 / count) + Math.random() * 0.12) % 1,
        speed: (0.0022 + (i % 4) * 0.0007) * speedMult
      }));

    const particles  = makeParticles(ROUTES.length, 1.0);
    const particles2 = makeParticles(ROUTES.length, 1.3);
    // Offset second set so they start halfway along
    particles2.forEach(p => { p.t = (p.t + 0.5) % 1; });

    // ====================================================================
    // WebGL Shaders
    // ====================================================================
    const vsSource = `
      attribute vec3 a_pos;
      attribute vec2 a_uv;
      uniform float u_rot;
      uniform float u_tilt;
      uniform vec2  u_scale;
      varying vec2  v_uv;
      varying vec3  v_norm;

      void main() {
        v_uv = a_uv;
        float cosR = cos(u_rot);  float sinR = sin(u_rot);
        vec3 p1 = vec3(a_pos.x*cosR - a_pos.z*sinR, a_pos.y, a_pos.x*sinR + a_pos.z*cosR);
        float cosT = cos(u_tilt); float sinT = sin(u_tilt);
        vec3 p2 = vec3(p1.x, p1.y*cosT - p1.z*sinT, p1.y*sinT + p1.z*cosT);
        v_norm = p2;
        gl_Position = vec4(p2.x*u_scale.x, p2.y*u_scale.y, -p2.z*0.5, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 v_uv;
      varying vec3 v_norm;
      uniform sampler2D u_tex;
      uniform float u_rot;

      void main() {
        vec4 texColor = texture2D(u_tex, v_uv);

        vec3 norm    = normalize(v_norm);
        vec3 viewDir = vec3(0.0, 0.0, 1.0);

        // Fresnel atmospheric rim — strong cyan
        float fresnel  = 1.0 - max(dot(norm, viewDir), 0.0);
        float rimGlow  = pow(fresnel, 2.2) * 1.25;
        vec3  rimColor = vec3(0.0, 0.75, 1.0) * rimGlow;

        // Sunlight from upper-left
        vec3  lightDir = normalize(vec3(-0.45, 0.55, 0.9));
        float diff     = max(dot(norm, lightDir), 0.0);

        // Deep navy ocean ambient
        vec3 oceanBase = vec3(0.025, 0.065, 0.175);
        vec3 litColor  = texColor.rgb * (oceanBase + vec3(diff * 0.88));

        // Night-side city lights boost
        float lum      = dot(texColor.rgb, vec3(0.213, 0.715, 0.072));
        float nightBoost = smoothstep(0.08, 0.55, lum) * 0.55;

        vec3 finalColor = litColor + texColor.rgb * (0.42 + nightBoost) + rimColor;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (glCtx, type, src) => {
      const s = glCtx.createShader(type);
      glCtx.shaderSource(s, src);
      glCtx.compileShader(s);
      if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) {
        console.error("WebGL shader error:", glCtx.getShaderInfoLog(s));
      }
      return s;
    };

    prog = gl.createProgram();
    gl.attachShader(prog, createShader(gl, gl.VERTEX_SHADER,   vsSource));
    gl.attachShader(prog, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("WebGL link error:", gl.getProgramInfoLog(prog));
      return () => cancelAnimationFrame(animId);
    }
    gl.useProgram(prog);

    // Sphere geometry
    const BANDS = 64;
    const pos = [], uv = [], idx = [];
    for (let la = 0; la <= BANDS; la++) {
      const th = (la * Math.PI) / BANDS;
      const sTh = Math.sin(th), cTh = Math.cos(th);
      for (let lo = 0; lo <= BANDS; lo++) {
        const ph = (lo * 2 * Math.PI) / BANDS;
        pos.push(Math.cos(ph)*sTh, cTh, Math.sin(ph)*sTh);
        uv.push(1 - lo/BANDS, la/BANDS);
      }
    }
    for (let la = 0; la < BANDS; la++) {
      for (let lo = 0; lo < BANDS; lo++) {
        const f = la*(BANDS+1)+lo, s = f+BANDS+1;
        idx.push(f, s, f+1, s, s+1, f+1);
      }
    }

    const mkBuf = (target, data) => {
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return b;
    };
    posBuf = mkBuf(gl.ARRAY_BUFFER, new Float32Array(pos));
    uvBuf  = mkBuf(gl.ARRAY_BUFFER, new Float32Array(uv));
    idxBuf = mkBuf(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx));

    const aPos   = gl.getAttribLocation(prog, "a_pos");
    const aUv    = gl.getAttribLocation(prog, "a_uv");
    const uRot   = gl.getUniformLocation(prog, "u_rot");
    const uTilt  = gl.getUniformLocation(prog, "u_tilt");
    const uScale = gl.getUniformLocation(prog, "u_scale");

    gl.enableVertexAttribArray(aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(aUv);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    // Placeholder texture
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 20, 52, 255]));

    const img = new Image();
    img.src = earthTextureUrl;
    img.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (prefersReducedMotion) render(0);
    };

    // ====================================================================
    // 3D projection helpers
    // ====================================================================
    const project = (lng, lat, rot, radius, cx, cy) => {
      const rad = Math.PI / 180;
      const phi   = lat * rad;
      const theta = lng * rad + rot;
      const tilt  = 12 * rad;

      const x3 = radius * Math.cos(phi) * Math.sin(theta);
      const y3 = radius * Math.sin(phi);
      const z3 = radius * Math.cos(phi) * Math.cos(theta);

      const yT = -(y3 * Math.cos(tilt) - z3 * Math.sin(tilt));
      const zT =   y3 * Math.sin(tilt) + z3 * Math.cos(tilt);

      return { x: cx + x3, y: cy + yT, z: zT, visible: zT > 0 };
    };

    // Spherical linear interpolation for accurate great-circle arcs
    const slerp = (lng1, lat1, lng2, lat2, t) => {
      const R = Math.PI / 180;
      const p1 = lat1*R, l1 = lng1*R;
      const p2 = lat2*R, l2 = lng2*R;
      const dL = l2 - l1;
      const cP1 = Math.cos(p1), sP1 = Math.sin(p1);
      const cP2 = Math.cos(p2), sP2 = Math.sin(p2);
      let d = Math.acos(Math.min(1, Math.max(-1, sP1*sP2 + cP1*cP2*Math.cos(dL))));
      if (d < 0.0001) return { lng: lng1, lat: lat1 };
      const sD = Math.sin(d);
      const a = Math.sin((1-t)*d)/sD, b = Math.sin(t*d)/sD;
      const x = a*cP1*Math.cos(l1) + b*cP2*Math.cos(l2);
      const y = a*cP1*Math.sin(l1) + b*cP2*Math.sin(l2);
      const z = a*sP1 + b*sP2;
      return {
        lat: Math.atan2(z, Math.sqrt(x*x+y*y)) / R,
        lng: Math.atan2(y, x) / R
      };
    };

    // ====================================================================
    // Render loop
    // ====================================================================
    const render = (timestamp) => {
      if (!prefersReducedMotion) {
        if (previousFrame !== null) {
          rotation += Math.min(timestamp - previousFrame, 100) * (Math.PI * 2 / 38000);
        }
        previousFrame = timestamp;
      }
      pulseTick += 0.038;
      hubPhases.forEach(h => { h.phase += h.speed; });

      const cx = canvasPx / 2;
      const cy = canvasPx / 2;
      const R  = (canvasPx / 2) * 0.86;

      // --- WebGL sphere ---
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1f(uRot, rotation);
      gl.uniform1f(uTilt, 12 * Math.PI / 180);
      gl.uniform2f(uScale, 0.86, 0.86);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);

      // --- 2D overlay ---
      ctx.clearRect(0, 0, canvasPx, canvasPx);

      // Outer atmospheric halo
      const halo = ctx.createRadialGradient(cx, cy, R*0.96, cx, cy, R*1.25);
      halo.addColorStop(0,    "rgba(0,195,255,0)");
      halo.addColorStop(0.30, "rgba(0,130,255,0.12)");
      halo.addColorStop(0.65, "rgba(0,80,200,0.04)");
      halo.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R*1.25, 0, Math.PI*2); ctx.fill();

      // Inner atmosphere edge band
      const innerA = ctx.createRadialGradient(cx, cy, R*0.96, cx, cy, R*1.06);
      innerA.addColorStop(0,   "rgba(0,175,255,0)");
      innerA.addColorStop(0.5, "rgba(0,175,255,0.20)");
      innerA.addColorStop(1,   "rgba(0,120,255,0)");
      ctx.fillStyle = innerA;
      ctx.beginPath(); ctx.arc(cx, cy, R*1.06, 0, Math.PI*2); ctx.fill();

      // Hub lookup map
      const hubMap = {};
      HUBS.forEach(h => { hubMap[h.name] = h; });

      // ================================================================
      // Draw Great-Circle Arcs (GOLD + CYAN)
      // ================================================================
      ROUTES.forEach((route, rIdx) => {
        const from = hubMap[route.from];
        const to   = hubMap[route.to];
        if (!from || !to) return;

        const STEPS = 44;
        ctx.beginPath();
        let started = false;

        for (let s = 0; s <= STEPS; s++) {
          const t   = s / STEPS;
          const pt3 = slerp(from.lng, from.lat, to.lng, to.lat, t);
          const lift = Math.sin(t * Math.PI) * (R * route.arcH);
          const pt  = project(pt3.lng, pt3.lat, rotation, R + lift, cx, cy);

          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else            ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }

        if (route.gold) {
          ctx.strokeStyle = "rgba(255,200,60,0.42)";
          ctx.lineWidth   = 2.2 * dpr;
        } else {
          ctx.strokeStyle = "rgba(0,215,255,0.35)";
          ctx.lineWidth   = 1.6 * dpr;
        }
        ctx.stroke();

        // Soft glow pass (wider, more transparent)
        ctx.beginPath();
        started = false;
        for (let s = 0; s <= STEPS; s++) {
          const t   = s / STEPS;
          const pt3 = slerp(from.lng, from.lat, to.lng, to.lat, t);
          const lift = Math.sin(t * Math.PI) * (R * route.arcH);
          const pt  = project(pt3.lng, pt3.lat, rotation, R + lift, cx, cy);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else            ctx.lineTo(pt.x, pt.y);
          } else { started = false; }
        }
        if (route.gold) {
          ctx.strokeStyle = "rgba(255,185,40,0.14)";
          ctx.lineWidth   = 6 * dpr;
        } else {
          ctx.strokeStyle = "rgba(0,200,255,0.10)";
          ctx.lineWidth   = 5 * dpr;
        }
        ctx.stroke();
      });

      // ================================================================
      // Moving transaction particles (GOLD + CYAN per route type)
      // ================================================================
      const drawParticle = (p) => {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;

        const route = ROUTES[p.routeIdx];
        const from  = hubMap[route.from];
        const to    = hubMap[route.to];
        if (!from || !to) return;

        const pt3  = slerp(from.lng, from.lat, to.lng, to.lat, p.t);
        const lift = Math.sin(p.t * Math.PI) * (R * route.arcH);
        const pt   = project(pt3.lng, pt3.lat, rotation, R + lift, cx, cy);

        if (pt.visible) {
          const da  = Math.min(1, pt.z / (R * 0.28));

          if (route.gold) {
            // Gold particle
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 6*dpr, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255,200,60,${0.18*da})`; ctx.fill();
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.2*dpr, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255,210,80,${0.70*da})`; ctx.fill();
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.4*dpr, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255,245,180,${da})`; ctx.fill();
          } else {
            // Cyan particle
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 5.5*dpr, 0, Math.PI*2);
            ctx.fillStyle = `rgba(0,215,255,${0.18*da})`; ctx.fill();
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 3*dpr, 0, Math.PI*2);
            ctx.fillStyle = `rgba(0,225,255,${0.65*da})`; ctx.fill();
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.3*dpr, 0, Math.PI*2);
            ctx.fillStyle = `rgba(230,250,255,${da})`; ctx.fill();
          }
        }
      };

      particles.forEach(drawParticle);
      particles2.forEach(drawParticle);

      // ================================================================
      // Glowing Hub Nodes — INDIVIDUAL twinkling per node
      // ================================================================
      HUBS.forEach((hub, hi) => {
        const pt = project(hub.lng, hub.lat, rotation, R, cx, cy);
        if (!pt.visible) return;

        const da = Math.min(1, Math.max(0.15, pt.z / (R * 0.28)));

        // Each node's brightness oscillates independently
        const twinkle  = 0.55 + hubPhases[hi].amp * Math.sin(hubPhases[hi].phase);
        const brightness = Math.min(1, twinkle);

        if (hub.gold) {
          // ── Gold hub node ──
          // Outer glow halo
          const gr = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 14*dpr);
          gr.addColorStop(0,   `rgba(255,200,60,${0.30*da*brightness})`);
          gr.addColorStop(0.5, `rgba(255,160,40,${0.10*da*brightness})`);
          gr.addColorStop(1,   "rgba(255,140,0,0)");
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 14*dpr, 0, Math.PI*2); ctx.fill();

          // Pulsing ring
          const rr = (4.5 + Math.sin(pulseTick * 1.1 + hub.lat) * 2.5) * dpr;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, rr, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(255,200,60,${0.55*da*brightness})`;
          ctx.lineWidth = 1.4*dpr; ctx.stroke();

          // Core dot
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 4*dpr, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,215,70,${0.95*da*brightness})`; ctx.fill();

          // Bright center
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.8*dpr, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,250,200,${da})`; ctx.fill();

        } else {
          // ── Cyan hub node ──
          const gr = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 11*dpr);
          gr.addColorStop(0,   `rgba(0,220,255,${0.25*da*brightness})`);
          gr.addColorStop(0.5, `rgba(0,180,255,${0.08*da*brightness})`);
          gr.addColorStop(1,   "rgba(0,150,255,0)");
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 11*dpr, 0, Math.PI*2); ctx.fill();

          const rr = (4 + Math.sin(pulseTick * 0.9 + hub.lat) * 2) * dpr;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, rr, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(0,220,255,${0.50*da*brightness})`;
          ctx.lineWidth = 1.2*dpr; ctx.stroke();

          ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.5*dpr, 0, Math.PI*2);
          ctx.fillStyle = `rgba(0,225,255,${0.90*da*brightness})`; ctx.fill();

          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.5*dpr, 0, Math.PI*2);
          ctx.fillStyle = `rgba(220,248,255,${da})`; ctx.fill();
        }

        // City label — shown when facing viewer prominently
        if (pt.z > R * 0.36) {
          ctx.font = `${Math.round(10.5*dpr)}px 'Space Grotesk', system-ui, sans-serif`;
          ctx.fillStyle = hub.gold
            ? `rgba(255,230,140,${0.88*da*brightness})`
            : `rgba(200,240,255,${0.82*da*brightness})`;
          ctx.fillText(hub.name, pt.x + 9*dpr, pt.y + 3.5*dpr);
        }
      });

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      if (prog) gl.deleteProgram(prog);
      if (posBuf) gl.deleteBuffer(posBuf);
      if (uvBuf) gl.deleteBuffer(uvBuf);
      if (idxBuf) gl.deleteBuffer(idxBuf);
      if (tex) gl.deleteTexture(tex);
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none"
      }}
      className={className}
    >
      {/* WebGL canvas — 3D textured sphere */}
      <canvas
        ref={glCanvasRef}
        style={{
          width: "100%", height: "100%", display: "block",
          filter: "drop-shadow(0 0 42px rgba(0,170,255,0.30))"
        }}
      />
      {/* 2D overlay — arcs, particles, nodes */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          display: "block", pointerEvents: "none"
        }}
      />
    </div>
  );
}
