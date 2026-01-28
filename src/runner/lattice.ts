import type { MarketState, RunnerMode } from "./state.js";

export type LatticeNode = {
  state: MarketState;
  mode: RunnerMode;
  allowedStrategies: ("BREAKOUT_RETEST" | "LIQUIDITY_SWEEP_REVERSAL" | "DISLOCATION_EDGE")[];
  maxTradesPerHour: number;
  maxPositions: number;
  riskPerTradePct: number; // percent of account per trade
};

export const LATTICE: Record<MarketState, LatticeNode> = {
  RISK_ON_TREND: {
    state: "RISK_ON_TREND",
    mode: "HUNT",
    allowedStrategies: ["BREAKOUT_RETEST", "DISLOCATION_EDGE"],
    maxTradesPerHour: 3,
    maxPositions: 3,
    riskPerTradePct: 0.6
  },
  RISK_ON_CHOP: {
    state: "RISK_ON_CHOP",
    mode: "DEFENSE",
    allowedStrategies: ["LIQUIDITY_SWEEP_REVERSAL"],
    maxTradesPerHour: 1,
    maxPositions: 1,
    riskPerTradePct: 0.25
  },
  ROTATION_WINDOW: {
    state: "ROTATION_WINDOW",
    mode: "DEFENSE",
    allowedStrategies: ["DISLOCATION_EDGE"],
    maxTradesPerHour: 1,
    maxPositions: 1,
    riskPerTradePct: 0.2
  },
  RISK_OFF_PANIC: {
    state: "RISK_OFF_PANIC",
    mode: "LOCK",
    allowedStrategies: [],
    maxTradesPerHour: 0,
    maxPositions: 0,
    riskPerTradePct: 0
  },
  RISK_OFF_GRIND: {
    state: "RISK_OFF_GRIND",
    mode: "DEFENSE",
    allowedStrategies: ["LIQUIDITY_SWEEP_REVERSAL"],
    maxTradesPerHour: 1,
    maxPositions: 1,
    riskPerTradePct: 0.15
  }
};

export function latticeFor(state: MarketState) {
  return LATTICE[state];
}
