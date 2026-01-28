import type { Signal } from "../runner/score.js";
import { makeId, clamp } from "../runner/score.js";

export function detectBreakoutRetest(symbol: string, priceNow: number, pricePrev: number): Signal | null {
  const changePct = pricePrev > 0 ? ((priceNow - pricePrev) / pricePrev) * 100 : 0;

  if (changePct < 0.35) return null;

  const score = clamp(70 + changePct * 20, 0, 99);

  return {
    signalId: makeId("sig_br"),
    symbol,
    type: "BREAKOUT_RETEST",
    score,
    reason: [
      `price jump detected`,
      `Δ%=${changePct.toFixed(3)}`
    ],
    ts: Date.now(),
    metrics: { changePct }
  };
}
