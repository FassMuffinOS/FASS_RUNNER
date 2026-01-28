export type MarketState =
  | "RISK_ON_TREND"
  | "RISK_ON_CHOP"
  | "ROTATION_WINDOW"
  | "RISK_OFF_PANIC"
  | "RISK_OFF_GRIND";

export type RunnerMode = "HUNT" | "DEFENSE" | "LOCK";

export function decideMode(state: MarketState): RunnerMode {
  if (state === "RISK_ON_TREND") return "HUNT";
  if (state === "RISK_OFF_PANIC") return "LOCK";
  return "DEFENSE";
}

/**
 * Lattice-first classification:
 * Decide state from mismatch pressure.
 */
export function classifyMarketState(mismatchScore: number): MarketState {
  if (mismatchScore <= 18) return "RISK_ON_TREND";
  if (mismatchScore <= 45) return "RISK_ON_CHOP";
  if (mismatchScore <= 65) return "ROTATION_WINDOW";
  if (mismatchScore <= 85) return "RISK_OFF_GRIND";
  return "RISK_OFF_PANIC";
}
