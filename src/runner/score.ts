export type SignalType = "BREAKOUT_RETEST" | "LIQUIDITY_SWEEP_REVERSAL" | "DISLOCATION_EDGE";

export type Signal = {
  signalId: string;
  symbol: string;
  type: SignalType;
  score: number;            // 0..100
  reason: string[];
  ts: number;
  venues?: string[];
  metrics?: Record<string, number>;
};

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function makeId(prefix: string) {
  const base = Math.random().toString(16).slice(2);
  return `${prefix}_${Date.now()}_${base.slice(0, 8)}`;
}
