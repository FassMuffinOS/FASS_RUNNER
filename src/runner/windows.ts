import { CONTROL } from "../config/runnerControl.js";

export type WindowType = "MOMENTUM" | "REVERSAL" | "DISLOCATION";

export type Window = {
  symbol: string;
  type: WindowType;
  openedTs: number;
  expiresTs: number;
  score: number;
  reason: string[];
};

export type MarketSnapshot = {
  ts: number;
  mismatch: number;
  spreadPct: number;
  pulsePct: number;
  edgeMaxPct: number;
  state: string; // from your state machine, e.g. RISK_ON_TREND
  mode: string;  // HUNT / DEFENSE
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function classifyWindow(s: MarketSnapshot): { ok: boolean; type: WindowType; score: number; reason: string[] } {
  const reason: string[] = [];

  // Health filter
  if (s.spreadPct > CONTROL.MAX_SPREAD_PCT) return { ok: false, type: "MOMENTUM", score: 0, reason: ["spread too wide"] };
  if (s.mismatch < CONTROL.MIN_MISMATCH) return { ok: false, type: "MOMENTUM", score: 0, reason: ["mismatch below floor"] };
  if (s.pulsePct < CONTROL.MIN_PULSE) return { ok: false, type: "MOMENTUM", score: 0, reason: ["pulse below floor"] };

  // Dislocation window (cross venue edge)
  if (s.edgeMaxPct > 0.05) {
    reason.push("edgeMaxPct high");
    const score = clamp(70 + s.edgeMaxPct * 600, 0, 99);
    return { ok: true, type: "DISLOCATION", score, reason };
  }

  // Momentum window
  if (s.state.includes("RISK_ON") && s.mode === "HUNT") {
    reason.push("risk-on + hunt");
    const score = clamp(60 + s.mismatch * 1.2 + s.pulsePct * 600, 0, 99);
    return { ok: true, type: "MOMENTUM", score, reason };
  }

  // Reversal window (chop + rising mismatch)
  if (s.state.includes("CHOP")) {
    reason.push("chop reversal zone");
    const score = clamp(55 + s.mismatch * 1.0 + s.pulsePct * 500, 0, 95);
    return { ok: true, type: "REVERSAL", score, reason };
  }

  return { ok: false, type: "MOMENTUM", score: 0, reason: ["no window"] };
}

export function openWindow(symbol: string, snap: MarketSnapshot): Window | null {
  const c = classifyWindow(snap);
  if (!c.ok) return null;

  const holdMs = Math.min(
    CONTROL.HOLD_MAX_MS,
    Math.max(CONTROL.HOLD_MIN_MS, Math.floor((c.score / 99) * CONTROL.HOLD_MAX_MS))
  );

  return {
    symbol,
    type: c.type,
    openedTs: snap.ts,
    expiresTs: snap.ts + holdMs,
    score: c.score,
    reason: c.reason,
  };
}
