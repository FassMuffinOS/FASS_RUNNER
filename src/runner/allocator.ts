import type { MarketState, RunnerMode } from "./state.js";
import { latticeFor } from "./lattice.js";

export type AccountTier = "T0_SEED" | "T1_SNIPER" | "T2_EXPANSION" | "T3_DIVERSIFIED";

export type AllocationPlan = {
  tier: AccountTier;
  mode: RunnerMode;
  state: MarketState;

  maxTradesPerHour: number;
  maxPositions: number;
  riskPerTradePct: number;

  notes: string[];
};

export function tierFromCapital(capitalUSD: number): AccountTier {
  if (capitalUSD < 250) return "T0_SEED";
  if (capitalUSD < 2000) return "T1_SNIPER";
  if (capitalUSD < 10_000) return "T2_EXPANSION";
  return "T3_DIVERSIFIED";
}

export function allocate(capitalUSD: number, state: MarketState): AllocationPlan {
  const tier = tierFromCapital(capitalUSD);
  const node = latticeFor(state);

  const tierCaps = (() => {
    switch (tier) {
      case "T0_SEED":
        return { maxTradesPerHour: 1, maxPositions: 1, riskPerTradePct: 0.25 };
      case "T1_SNIPER":
        return { maxTradesPerHour: 2, maxPositions: 2, riskPerTradePct: 0.35 };
      case "T2_EXPANSION":
        return { maxTradesPerHour: 4, maxPositions: 3, riskPerTradePct: 0.5 };
      case "T3_DIVERSIFIED":
        return { maxTradesPerHour: 8, maxPositions: 6, riskPerTradePct: 0.75 };
    }
  })();

  const maxTradesPerHour = Math.min(node.maxTradesPerHour, tierCaps.maxTradesPerHour);
  const maxPositions = Math.min(node.maxPositions, tierCaps.maxPositions);
  const riskPerTradePct = Math.min(node.riskPerTradePct, tierCaps.riskPerTradePct);

  const notes: string[] = [];
  notes.push(`tier=${tier}`);
  notes.push(`latticeMode=${node.mode}`);
  notes.push(`tierCaps: trades/hr<=${tierCaps.maxTradesPerHour}, pos<=${tierCaps.maxPositions}, risk<=${tierCaps.riskPerTradePct}%`);
  notes.push(`final: trades/hr<=${maxTradesPerHour}, pos<=${maxPositions}, risk<=${riskPerTradePct}%`);

  return {
    tier,
    mode: node.mode,
    state,
    maxTradesPerHour,
    maxPositions,
    riskPerTradePct,
    notes
  };
}
