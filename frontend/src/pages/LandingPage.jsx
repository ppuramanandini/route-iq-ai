import React, { useState } from "react";
import {
  ArrowRight,
  Play,
  ShieldCheck,
  Activity,
  Zap,
  Network,
  ArrowLeftRight,
  Database,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Server,
  Lock,
  Building2,
  Cpu
} from "lucide-react";
import { Logo } from "../components/Logo";
import { HeroControlRoom } from "../components/HeroControlRoom";

export function LandingPage({ onAccessConsole }) {
  const [fallbackMode, setFallbackMode] = useState("degraded"); // 'normal' | 'degraded'

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page">
      <style>{`
        .landing-page {
          --lp-bg: #020612;
          --lp-bg-soft: #040a17;
          --lp-panel: rgba(8, 16, 32, 0.7);
          --lp-panel-strong: rgba(7, 14, 30, 0.92);
          --lp-border: rgba(80, 150, 220, 0.18);
          --lp-border-strong: rgba(80, 150, 220, 0.3);
          --lp-text: #f8fbff;
          --lp-text-soft: #a9b6c9;
          --lp-cyan: #4ecbff;
          --lp-blue: #2d6df6;
          --lp-gold: #f7c86c;
          --lp-green: #5ee7a6;
          background: var(--lp-bg);
          color: var(--lp-text);
          font-family: Inter, "Segoe UI", sans-serif;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        .landing-page * { box-sizing: border-box; }
        .landing-page button {
          font: inherit;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .landing-page img { display: block; max-width: 100%; }

        .landing-page__container {
          width: min(1440px, calc(100% - 120px));
          margin: 0 auto;
        }

        .landing-page__header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(2, 6, 18, 0.9);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(80, 150, 220, 0.18);
        }

        .landing-page__nav-row {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .landing-page__brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 200px;
        }

        .landing-page__brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 0;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #fff;
        }

        .landing-page__brand-mark .accent {
          color: var(--lp-cyan);
        }

        .landing-page__nav {
          display: flex;
          align-items: center;
          gap: 42px;
          margin-left: auto;
          margin-right: 24px;
        }

        .landing-page__nav button {
          color: rgba(226, 232, 240, 0.82);
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.01em;
          transition: color 0.2s ease;
        }

        .landing-page__nav button:hover {
          color: var(--lp-cyan);
        }

        .landing-page__access {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          border-radius: 999px;
          border: 1px solid rgba(94, 150, 255, 0.36);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(59, 130, 246, 0.9));
          color: #fff;
          font-size: 14px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          box-shadow: 0 0 22px rgba(37, 99, 235, 0.25);
        }

        .landing-page__access:hover {
          background: linear-gradient(135deg, rgba(49, 110, 255, 1), rgba(66, 148, 255, 1));
        }

        .landing-page__hero {
          position: relative;
          z-index: 1;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: radial-gradient(circle at top right, rgba(40,120,200,.18), transparent 30%), #040b16;
          overflow: hidden;
        }

        .landing-page__hero-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .landing-page__hero-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.42;
          filter: saturate(0.9) brightness(0.7);
        }

        .landing-page__hero-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(2,6,18,0.96) 0%, rgba(2,6,18,0.8) 31%, rgba(2,6,18,0.46) 70%, rgba(2,6,18,0.2) 100%);
        }

        .landing-page__hero-grid {
          position: relative;
          z-index: 1;
          min-height: 560px;
          display: grid;
          grid-template-columns: 45% 55%;
          align-items: center;
          gap: 30px;
          padding-top: 40px;
          padding-bottom: 32px;
        }

        .landing-page__hero-copy {
          max-width: 600px;
          padding-right: 14px;
        }

        .landing-page__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--lp-cyan);
          font-size: 11px;
          line-height: 1.4;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
          font-family: "JetBrains Mono", monospace;
          margin-bottom: 24px;
        }

        .landing-page__eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--lp-cyan);
          box-shadow: 0 0 18px rgba(78, 203, 255, 0.8);
        }

        .landing-page__hero h1 {
          margin: 0;
          max-width: 600px;
          font-size: clamp(44px, 4.2vw, 68px);
          line-height: 0.98;
          letter-spacing: -0.055em;
          font-weight: 800;
          color: #fff;
        }

        .landing-page__hero-copy .primary {
          color: #fff;
          display: block;
        }

        .landing-page__hero-copy .highlight {
          display: block;
          color: var(--lp-cyan);
        }

        .landing-page__hero-desc {
          margin-top: 24px;
          max-width: 560px;
          font-size: 17px;
          line-height: 1.55;
          color: var(--lp-text-soft);
        }

        .landing-page__cta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .landing-page__cta-primary,
        .landing-page__cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 999px;
          padding: 15px 24px;
          font-size: 14px;
          letter-spacing: 0.12em;
          font-weight: 700;
          text-transform: uppercase;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .landing-page__cta-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          box-shadow: 0 0 25px rgba(37, 99, 235, 0.38);
        }

        .landing-page__cta-secondary {
          background: rgba(15, 23, 42, 0.28);
          color: #e2e8f0;
          border: 1px solid rgba(160, 174, 192, 0.26);
        }

        .landing-page__cta-primary:hover,
        .landing-page__cta-secondary:hover {
          transform: translateY(-1px);
        }

        .landing-page__metrics {
          margin-top: 30px;
          padding-top: 24px;
          border-top: 1px solid rgba(148,163,184,0.16);
          display: flex;
          align-items: flex-start;
          gap: 22px;
          flex-wrap: wrap;
        }

        .landing-page__metric {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 120px;
        }

        .landing-page__metric-value {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.04em;
          color: #fff;
        }

        .landing-page__metric-label {
          color: var(--lp-text-soft);
          font-size: 10px;
          line-height: 1.4;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: "JetBrains Mono", monospace;
          max-width: 120px;
        }

        .landing-page__metric-separator {
          width: 1px;
          height: 42px;
          background: rgba(148,163,184,0.16);
          margin: 0 4px;
        }

        .landing-page__hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 600px;
        }

        .landing-page__feature-strip {
          position: relative;
          z-index: 1;
          background: rgba(1, 4, 13, 0.9);
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .landing-page__feature-strip .landing-page__container {
          padding-top: 18px;
          padding-bottom: 18px;
        }

        .landing-page__feature-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 22px;
          align-items: center;
        }

        .landing-page__feature-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 46px;
          color: rgba(226,232,240,0.86);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          font-family: "JetBrains Mono", monospace;
          padding: 0 10px;
          text-align: center;
        }

        .landing-page__feature-item + .landing-page__feature-item {
          border-left: 1px solid rgba(148,163,184,0.14);
        }

        .landing-page__section {
          position: relative;
          z-index: 1;
          padding-top: 100px;
          padding-bottom: 100px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .landing-page__section--tight {
          padding-top: 88px;
          padding-bottom: 88px;
        }

        .landing-page__section-heading {
          max-width: 800px;
          margin: 0 auto 44px;
          text-align: center;
        }

        .landing-page__section-kicker {
          color: var(--lp-cyan);
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-weight: 700;
          font-family: "JetBrains Mono", monospace;
          display: inline-block;
          margin-bottom: 20px;
        }

        .landing-page__section-title {
          margin: 0;
          font-size: clamp(30px, 2.6vw, 44px);
          line-height: 1.12;
          letter-spacing: -0.04em;
          color: #fff;
          font-weight: 800;
        }

        .landing-page__section-copy {
          margin: 16px auto 0;
          max-width: 800px;
          color: var(--lp-text-soft);
          font-size: 16px;
          line-height: 1.6;
        }

        .landing-page__stage-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 18px;
        }

        .landing-page__stage-card {
          min-height: 260px;
          padding: 24px 20px 18px;
          border-radius: 16px;
          background: rgba(7, 15, 30, 0.7);
          border: 1px solid rgba(80, 150, 220, 0.24);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.02), 0 0 16px rgba(0,180,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .landing-page__stage-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .landing-page__stage-number {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          background: rgba(15, 41, 59, 0.68);
          border: 1px solid rgba(78, 203, 255, 0.28);
          color: var(--lp-cyan);
          font-family: "JetBrains Mono", monospace;
        }

        .landing-page__stage-icon {
          color: var(--lp-cyan);
          opacity: 0.9;
        }

        .landing-page__stage-card h3 {
          margin: 0;
          font-size: 17px;
          line-height: 1.35;
          color: #fff;
          font-weight: 700;
        }

        .landing-page__stage-card p {
          margin: 0;
          color: var(--lp-text-soft);
          font-size: 13px;
          line-height: 1.65;
        }

        .landing-page__stage-label {
          margin-top: auto;
          color: rgba(148,163,184,0.76);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: "JetBrains Mono", monospace;
          padding-top: 10px;
          border-top: 1px solid rgba(148,163,184,0.12);
        }

        .landing-page__architecture-wrap {
          max-width: 1180px;
          margin: 0 auto;
        }

        .landing-page__architecture-list {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          width: 100%;
        }

        .landing-page__architecture-card {
          flex: 1 1 0;
          min-height: 118px;
          padding: 18px 18px;
          border-radius: 16px;
          border: 1px solid rgba(80, 150, 220, 0.26);
          background: rgba(6, 17, 34, 0.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.02);
        }

        .landing-page__architecture-node {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .landing-page__architecture-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(17, 26, 43, 0.9);
          border: 1px solid rgba(80,150,220,0.2);
          color: var(--lp-cyan);
          flex-shrink: 0;
        }

        .landing-page__architecture-text strong {
          display: block;
          color: #fff;
          font-size: 17px;
          line-height: 1.25;
          margin-bottom: 3px;
        }

        .landing-page__architecture-text span {
          color: rgba(148,163,184,0.8);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-family: "JetBrains Mono", monospace;
        }

        .landing-page__architecture-arrow {
          display: flex;
          flex: 0 0 18px;
          align-items: center;
          justify-content: center;
          color: rgba(78, 203, 255, 0.7);
          font-size: 22px;
          line-height: 1;
          transform: translateY(-2px);
        }

        @media (max-width: 980px) {
          .landing-page__architecture-list {
            flex-wrap: wrap;
            gap: 16px;
          }

          .landing-page__architecture-card {
            flex: 1 1 calc(33.333% - 16px);
            min-width: 0;
          }

          .landing-page__architecture-arrow {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .landing-page__architecture-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .landing-page__architecture-card {
            flex: none;
            width: 100%;
          }
        }

        .landing-page__fallback-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 46px;
          align-items: center;
        }

        .landing-page__fallback-left {
          max-width: 600px;
        }

        .landing-page__fallback-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(94, 231, 166, 0.38);
          background: rgba(5, 26, 22, 0.7);
        }

        .landing-page__fallback-badge strong {
          display: block;
          color: var(--lp-green);
          letter-spacing: 0.12em;
          font-size: 12px;
          font-family: "JetBrains Mono", monospace;
          text-transform: uppercase;
        }

        .landing-page__fallback-badge span {
          display: block;
          color: rgba(148,163,184,0.9);
          font-size: 12px;
          line-height: 1.5;
        }

        .landing-page__fallback-panel {
          background: rgba(7, 15, 30, 0.8);
          border: 1px solid rgba(80, 150, 220, 0.2);
          border-radius: 18px;
          padding: 18px 18px 16px;
          box-shadow: 0 0 26px rgba(0,180,255,0.09);
        }

        .landing-page__fallback-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 12px;
          min-height: 52px;
          border: 1px solid transparent;
        }

        .landing-page__fallback-row + .landing-page__fallback-row {
          margin-top: 10px;
        }

        .landing-page__fallback-row--header {
          background: rgba(15, 30, 60, 0.66);
          border-color: rgba(255,255,255,.06);
          color: rgba(148,163,184,.9);
        }

        .landing-page__fallback-row--warn {
          background: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.2);
          color: #f8c46a;
        }

        .landing-page__fallback-row--cyan {
          background: rgba(78, 203, 255, 0.04);
          border-color: rgba(78, 203, 255, 0.18);
          color: var(--lp-cyan);
        }

        .landing-page__fallback-row--success {
          background: rgba(94, 231, 166, 0.08);
          border-color: rgba(94, 231, 166, 0.28);
          color: var(--lp-green);
        }

        .landing-page__capability-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        .landing-page__capability-card {
          min-height: 220px;
          border-radius: 18px;
          padding: 26px 22px;
          background: rgba(7, 15, 30, 0.72);
          border: 1px solid rgba(80, 150, 220, 0.2);
          box-shadow: 0 0 18px rgba(0,180,255,0.05);
        }

        .landing-page__capability-kicker {
          display: inline-block;
          padding-left: 12px;
          border-left: 2px solid currentColor;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          font-family: "JetBrains Mono", monospace;
          color: var(--lp-cyan);
        }

        .landing-page__capability-card h3 {
          margin: 18px 0 12px;
          font-size: 22px;
          line-height: 1.25;
          color: #fff;
          font-weight: 700;
        }

        .landing-page__capability-card p {
          margin: 0;
          color: rgba(148,163,184,0.9);
          font-size: 14px;
          line-height: 1.6;
        }

        .landing-page__cta-section {
          padding-top: 110px;
          padding-bottom: 110px;
          background: linear-gradient(180deg, rgba(2, 6, 18, 1), rgba(1, 3, 9, 1));
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .landing-page__cta-box {
          max-width: 760px;
          margin: 0 auto;
          text-align: center;
        }

        .landing-page__cta-box .landing-page__section-kicker {
          margin-bottom: 18px;
        }

        .landing-page__cta-box h2 {
          margin: 0;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1.08;
          letter-spacing: -0.05em;
          color: #fff;
          font-weight: 800;
        }

        .landing-page__cta-box p {
          margin: 18px auto 0;
          max-width: 620px;
          color: rgba(148,163,184,0.92);
          font-size: 16px;
          line-height: 1.7;
        }

        .landing-page__cta-box .landing-page__cta-row {
          justify-content: center;
          margin-top: 28px;
        }

        .landing-page__footer {
          background: #010308;
          padding-top: 28px;
          padding-bottom: 32px;
        }

        .landing-page__footer-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 22px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .landing-page__footer-nav {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .landing-page__footer-nav button {
          font-size: 12px;
          color: rgba(148,163,184,0.9);
        }

        .landing-page__footer-nav button:hover {
          color: var(--lp-cyan);
        }

        .landing-page__footer-meta {
          padding-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          color: rgba(148,163,184,0.78);
          font-size: 11px;
          font-family: "JetBrains Mono", monospace;
          line-height: 1.6;
          flex-wrap: wrap;
        }

        @media (max-width: 1220px) {
          .landing-page__stage-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .landing-page__feature-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .landing-page__feature-item + .landing-page__feature-item {
            border-left: none;
          }
          .landing-page__hero-grid {
            grid-template-columns: 1fr;
            padding-top: 56px;
            padding-bottom: 56px;
          }
          .landing-page__hero-copy {
            max-width: 760px;
            text-align: left;
          }
          .landing-page__fallback-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .landing-page__container { width: min(1440px, calc(100% - 42px)); }
          .landing-page__nav {
            gap: 20px;
            margin-right: 14px;
          }
          .landing-page__nav button {
            font-size: 14px;
          }
          .landing-page__capability-grid,
          .landing-page__feature-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .landing-page__section {
            padding-top: 86px;
            padding-bottom: 86px;
          }
        }

        @media (max-width: 720px) {
          .landing-page__nav-row {
            flex-wrap: wrap;
            height: auto;
            padding: 18px 0;
            gap: 14px;
          }
          .landing-page__nav {
            order: 3;
            width: 100%;
            justify-content: space-between;
            gap: 14px;
            margin: 0;
          }
          .landing-page__brand {
            min-width: auto;
          }
          .landing-page__brand-mark {
            font-size: 16px;
            letter-spacing: 0.09em;
          }
          .landing-page__metric-separator { display: none; }
          .landing-page__metrics {
            gap: 18px;
          }
          .landing-page__stage-grid,
          .landing-page__capability-grid,
          .landing-page__feature-grid {
            grid-template-columns: 1fr;
          }
          .landing-page__section-copy {
            font-size: 15px;
          }
          .landing-page__footer-wrap,
          .landing-page__footer-meta {
            flex-direction: column;
            align-items: flex-start;
          }
          .landing-page__footer-nav {
            justify-content: flex-start;
          }
        }
      `}</style>

      <header className="landing-page__header">
        <div className="landing-page__container landing-page__nav-row">
          <div className="landing-page__brand">
            <Logo size={28} />
            <span className="landing-page__brand-mark">
              SWITCHROUTE<span className="accent">IQ</span>
            </span>
          </div>

          <nav className="landing-page__nav" aria-label="Main navigation">
            <button onClick={() => scrollTo("why-switchrouteiq")}>Why SwitchRouteIQ</button>
            <button onClick={() => scrollTo("how-it-works")}>How it works</button>
            <button onClick={() => scrollTo("merchant-flow")}>Merchant flow</button>
          </nav>

          <button className="landing-page__access" onClick={onAccessConsole}>
            Access Console <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main>
        <section className="landing-page__hero">
          <div className="landing-page__hero-bg">
            <img src="/hero_cinematic_bg.jpg" alt="" />
          </div>

          <div className="landing-page__container landing-page__hero-grid">
            <div className="landing-page__hero-copy">
              <div className="landing-page__eyebrow">
                <span className="landing-page__eyebrow-dot" />
                Intelligent Payment Routing Infrastructure
              </div>

              <h1>
                <span className="primary">Don’t wait for</span>
                <span className="primary">payment failure.</span>
                <span className="highlight">Detect and prevent it.</span>
              </h1>

              <p className="landing-page__hero-desc">
                SwitchRouteIQ intelligently monitors payment gateways, selects the right route,
                validates it, and automatically executes safe fallback when a gateway becomes degraded.
              </p>

              <div className="landing-page__cta-row">
                <button className="landing-page__cta-primary" onClick={onAccessConsole}>
                  Access Console <ArrowRight size={16} />
                </button>
                <button className="landing-page__cta-secondary" onClick={() => scrollTo("how-it-works")}>
                  <Play size={14} style={{ fill: "currentColor" }} />
                  See How It Works
                </button>
              </div>

              <div className="landing-page__metrics">
                <div className="landing-page__metric">
                  <span className="landing-page__metric-value">99.9%</span>
                  <span className="landing-page__metric-label">Intentional Routing</span>
                </div>
                <div className="landing-page__metric-separator" />
                <div className="landing-page__metric">
                  <span className="landing-page__metric-value">Live</span>
                  <span className="landing-page__metric-label">Gateway Telemetry</span>
                </div>
                <div className="landing-page__metric-separator" />
                <div className="landing-page__metric">
                  <span className="landing-page__metric-value">Safe</span>
                  <span className="landing-page__metric-label">Fallback Checks</span>
                </div>
              </div>
            </div>

            <div className="landing-page__hero-visual">
              <HeroControlRoom />
            </div>
          </div>
        </section>

        <section className="landing-page__feature-strip">
          <div className="landing-page__container">
            <div className="landing-page__feature-grid">
              <div className="landing-page__feature-item"><Activity size={14} /> Real-Time Telemetry</div>
              <div className="landing-page__feature-item"><Network size={14} /> Intelligent Routing</div>
              <div className="landing-page__feature-item"><ShieldCheck size={14} /> Zero-Trust Validation</div>
              <div className="landing-page__feature-item"><ArrowLeftRight size={14} /> Safe Fallback</div>
              <div className="landing-page__feature-item"><Database size={14} /> Idempotency Protection</div>
              <div className="landing-page__feature-item"><FileText size={14} /> Audit Trail</div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-page__section">
          <div className="landing-page__container">
            <div className="landing-page__section-heading">
              <span className="landing-page__section-kicker">How It Works</span>
              <h2 className="landing-page__section-title">The five-stage routing pipeline</h2>
              <p className="landing-page__section-copy">
                From real-time telemetry to safe fallback, SwitchRouteIQ ensures high-velocity payments reach their
                destination — reliably and securely.
              </p>
            </div>

            <div className="landing-page__stage-grid">
              <article className="landing-page__stage-card">
                <div className="landing-page__stage-card-top">
                  <div className="landing-page__stage-number">01</div>
                  <Activity className="landing-page__stage-icon" size={16} />
                </div>
                <h3>Gateway Health &amp; Telemetry</h3>
                <p>Monitors success rate, latency, p95 latency, timeout behavior, error rate, availability, capacity, and cost.</p>
                <div className="landing-page__stage-label">Telemetry</div>
              </article>

              <article className="landing-page__stage-card">
                <div className="landing-page__stage-card-top">
                  <div className="landing-page__stage-number">02</div>
                  <Network className="landing-page__stage-icon" size={16} />
                </div>
                <h3>Route Eligibility &amp; Selection</h3>
                <p>Evaluates transaction context, payment method, gateway eligibility, limits, SLA, cost, and current gateway health.</p>
                <div className="landing-page__stage-label">Routing</div>
              </article>

              <article className="landing-page__stage-card">
                <div className="landing-page__stage-card-top">
                  <div className="landing-page__stage-number">03</div>
                  <ShieldCheck className="landing-page__stage-icon" size={16} />
                </div>
                <h3>Zero-Trust Route Validation</h3>
                <p>Validates availability, SLA, health thresholds, incident status, fallback integrity, and idempotency before execution.</p>
                <div className="landing-page__stage-label">Zero-Trust</div>
              </article>

              <article className="landing-page__stage-card">
                <div className="landing-page__stage-card-top">
                  <div className="landing-page__stage-number">04</div>
                  <Zap className="landing-page__stage-icon" size={16} />
                </div>
                <h3>Intelligent Execution &amp; Safe Fallback</h3>
                <p>Executes the primary route and only performs fallback when transaction-state and idempotency checks confirm it is safe.</p>
                <div className="landing-page__stage-label">Fallback</div>
              </article>

              <article className="landing-page__stage-card">
                <div className="landing-page__stage-card-top">
                  <div className="landing-page__stage-number">05</div>
                  <Database className="landing-page__stage-icon" size={16} />
                </div>
                <h3>Audit &amp; Continuous Improvement</h3>
                <p>Records outcomes, route history, latency, cost, and incidents for ongoing routing analysis and rule refinement.</p>
                <div className="landing-page__stage-label">Audit</div>
              </article>
            </div>
          </div>
        </section>

        <section id="merchant-flow" className="landing-page__section landing-page__section--tight">
          <div className="landing-page__container">
            <div className="landing-page__section-heading">
              <span className="landing-page__section-kicker">Architecture Flow</span>
              <h2 className="landing-page__section-title">How merchants use SwitchRouteIQ</h2>
              <p className="landing-page__section-copy">
                A single unified API endpoint shields your application from payment failure through continuous multi-rail telemetry.
              </p>
            </div>

            <div className="landing-page__architecture-wrap">
              <div className="landing-page__architecture-list">
                <div className="landing-page__architecture-card">
                  <div className="landing-page__architecture-node">
                    <div className="landing-page__architecture-icon"><Building2 size={18} /></div>
                    <div className="landing-page__architecture-text">
                      <strong>Merchant Application</strong>
                      <span>Initiates charge request</span>
                    </div>
                  </div>
                </div>

                    <div className="landing-page__architecture-arrow" aria-hidden="true">→</div>

                <div className="landing-page__architecture-card">
                  <div className="landing-page__architecture-node">
                    <div className="landing-page__architecture-icon"><Cpu size={18} /></div>
                    <div className="landing-page__architecture-text">
                      <strong>SwitchRouteIQ API</strong>
                      <span>Microsecond ingress</span>
                    </div>
                  </div>
                </div>

                    <div className="landing-page__architecture-arrow" aria-hidden="true">→</div>

                <div className="landing-page__architecture-card">
                  <div className="landing-page__architecture-node">
                    <div className="landing-page__architecture-icon"><Activity size={18} /></div>
                    <div className="landing-page__architecture-text">
                      <strong>Route &amp; Zero-Trust Check</strong>
                      <span>Telemetry &amp; SLA validation</span>
                    </div>
                  </div>
                </div>

                    <div className="landing-page__architecture-arrow" aria-hidden="true">→</div>

                <div className="landing-page__architecture-card">
                  <div className="landing-page__architecture-node">
                    <div className="landing-page__architecture-icon"><Network size={18} /></div>
                    <div className="landing-page__architecture-text">
                      <strong>Payment Gateway</strong>
                      <span>Gateway A / B / C execution</span>
                    </div>
                  </div>
                </div>

                    <div className="landing-page__architecture-arrow" aria-hidden="true">→</div>

                <div className="landing-page__architecture-card">
                  <div className="landing-page__architecture-node">
                    <div className="landing-page__architecture-icon"><Server size={18} /></div>
                    <div className="landing-page__architecture-text">
                      <strong>Bank / Payment Rail</strong>
                      <span>Immediate clearance response</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-page__section">
          <div className="landing-page__container">
            <div className="landing-page__fallback-grid">
              <div className="landing-page__fallback-left">
                <span className="landing-page__section-kicker">Safe Fallback Architecture</span>
                <h2 className="landing-page__section-title">Autonomous self-healing without duplicate debits</h2>
                <p className="landing-page__section-copy">
                  When a payment gateway degrades or times out, naive retries can double-charge customers.
                  SwitchRouteIQ performs transaction-state inspection and cryptographic idempotency checks before executing safe fallback routing.
                </p>
                <div className="landing-page__fallback-badge" style={{ marginTop: "28px" }}>
                  <CheckCircle2 size={18} color="#5ee7a6" />
                  <div>
                    <strong>No Duplicate Debit</strong>
                    <span>Guaranteed zero double debits during timeout failover.</span>
                  </div>
                </div>
              </div>

              <div className="landing-page__fallback-panel">
                <div className="landing-page__fallback-row landing-page__fallback-row--header">
                  <span>Primary Gateway</span>
                  <strong>Gateway A</strong>
                </div>

                <div className="landing-page__fallback-row landing-page__fallback-row--warn">
                  <span><AlertTriangle size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} /> Degradation / Timeout</span>
                  <strong>720 ms</strong>
                </div>

                <div className="landing-page__fallback-row landing-page__fallback-row--cyan">
                  <span><Lock size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} /> Transaction State Check</span>
                  <strong>Unprocessed</strong>
                </div>

                <div className="landing-page__fallback-row landing-page__fallback-row--cyan">
                  <span><CheckCircle2 size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} /> Idempotency Check</span>
                  <strong>Safe to Retry</strong>
                </div>

                <div className="landing-page__fallback-row landing-page__fallback-row--success">
                  <span>Fallback Gateway: Gateway B</span>
                  <strong>Success</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="why-switchrouteiq" className="landing-page__section">
          <div className="landing-page__container">
            <div className="landing-page__section-heading" style={{ marginBottom: "32px" }}>
              <span className="landing-page__section-kicker">Product Capabilities</span>
              <h2 className="landing-page__section-title">Engineered for mission-critical payment volume</h2>
              <p className="landing-page__section-copy">
                A high-precision orchestration layer designed to maximize transaction success and eliminate gateway outages.
              </p>
            </div>

            <div className="landing-page__capability-grid">
              <article className="landing-page__capability-card" style={{ borderColor: "rgba(78,203,255,0.26)" }}>
                <span className="landing-page__capability-kicker" style={{ color: "#4ecbff" }}>01 · Recovery</span>
                <h3>Autonomous Self-Healing</h3>
                <p>Telemetry streams detect p95 latency spikes, gateway timeouts, and error surges before merchants experience degradation.</p>
              </article>

              <article className="landing-page__capability-card" style={{ borderColor: "rgba(59,130,246,0.28)" }}>
                <span className="landing-page__capability-kicker" style={{ color: "#60a5fa" }}>02 · Routing</span>
                <h3>Intelligent Routing</h3>
                <p>Multi-factor routing decisions evaluate transaction volume, downstream gateway limits, SLA commitments, and real-time health telemetry.</p>
              </article>

              <article className="landing-page__capability-card" style={{ borderColor: "rgba(94,231,166,0.28)" }}>
                <span className="landing-page__capability-kicker" style={{ color: "#5ee7a6" }}>03 · Compliance</span>
                <h3>Zero-Trust Validation</h3>
                <p>Every candidate route passes strict pre-flight checks for availability, capacity, policy rules, and incident status.</p>
              </article>

              <article className="landing-page__capability-card" style={{ borderColor: "rgba(99,102,241,0.22)" }}>
                <span className="landing-page__capability-kicker" style={{ color: "#a5b4fc" }}>04 · Integrity</span>
                <h3>Payment Safety &amp; Idempotency</h3>
                <p>Cryptographic transaction tracking guarantees zero duplicate debits during network timeouts and cross-gateway fallback.</p>
              </article>

              <article className="landing-page__capability-card" style={{ borderColor: "rgba(34,211,238,0.22)" }}>
                <span className="landing-page__capability-kicker" style={{ color: "#67e8f9" }}>05 · Observability</span>
                <h3>Real-Time Telemetry</h3>
                <p>Continuous health pings, live TPS tracking, error-rate monitoring, and latency distribution across every payment rail.</p>
              </article>

              <article className="landing-page__capability-card" style={{ borderColor: "rgba(148,163,184,0.24)" }}>
                <span className="landing-page__capability-kicker" style={{ color: "#cbd5e1" }}>06 · Audit</span>
                <h3>Audit &amp; Routing History</h3>
                <p>Forensic ledger of every routing decision, fallback trigger, and policy adjustment for operational accountability.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-page__cta-section">
          <div className="landing-page__container">
            <div className="landing-page__cta-box">
              <span className="landing-page__section-kicker">Enterprise Console</span>
              <h2>Ready to eliminate payment failures?</h2>
              <p>
                Experience real-time routing telemetry, simulated gateway incidents, and autonomous recovery in the SwitchRouteIQ command center.
              </p>
              <div className="landing-page__cta-row">
                <button className="landing-page__cta-primary" onClick={onAccessConsole}>
                  Access Console <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-page__footer">
        <div className="landing-page__container">
          <div className="landing-page__footer-wrap">
            <div className="landing-page__brand" style={{ minWidth: 0 }}>
              <Logo size={24} />
              <span className="landing-page__brand-mark" style={{ fontSize: 14 }}>
                SWITCHROUTE<span className="accent">IQ</span>
              </span>
            </div>

            <div className="landing-page__footer-nav">
              <button onClick={() => scrollTo("why-switchrouteiq")}>Why SwitchRouteIQ</button>
              <button onClick={() => scrollTo("how-it-works")}>How it works</button>
              <button onClick={() => scrollTo("merchant-flow")}>Merchant flow</button>
              <button onClick={onAccessConsole}>Access Console →</button>
            </div>
          </div>

          <div className="landing-page__footer-meta">
            <span>© 2026 SwitchRouteIQ Inc. All rights reserved.</span>
            <span>All gateways, transactions and amounts are simulated for demonstration.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
