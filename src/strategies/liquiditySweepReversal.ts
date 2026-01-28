import type { Signal } from "../runner/score.js";
import { makeId, clamp } from "../runner/score.js";

export function detectLiquiditySweepReversal(symbol: string, priceNow: number, pricePrev: number): Signal | null {
  const changePct = pricePrev > 0 ? ((priceNow - pricePrev) / pricePrev) * 100 : 0;

  if (Math.abs(changePct) < 0.45) return null;

  const score = clamp(65 + Math.abs(changePct) * 18, 0, 99);

  return {
    signalId: makeId("sig_ls"),
    symbol,
    type: "LIQUIDITY_SWEEP_REVERSAL",
    score,
    reason: [
      `fast reversal magnitude`,
      `|Δ%|=${Math.abs(changePct).toFixed(3)}`
    ],
    ts: Date.now(),
    metrics: { absChangePct: Math.abs(changePct) }
  };
}
