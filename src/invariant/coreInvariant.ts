// src/invariant/coreInvariant.ts

export const CORE_INVARIANT = {
  MAX_OPEN_POS: 1,
  MAX_TRADES_PER_HOUR: 1,
  RISK_PER_TRADE_PCT: 0.25,
  MAX_SPREAD_PCT: 0.05,
  MIN_IMPULSE: 0.7,
  HOLD_MIN_SEC: 30,
  HOLD_MAX_SEC: 300,
} as const;

/**
 * Enforces deterministic bounds.
 * Any execution path MUST call this before acting.
 */
export function assertInvariant(input: {
  openPositions: number;
  tradesLastHour: number;
  spreadPct: number;
  impulse: number;
  holdSec: number;
}) {
  if (input.openPositions > CORE_INVARIANT.MAX_OPEN_POS)
    throw new Error("INVARIANT_VIOLATION: open positions");

  if (input.tradesLastHour > CORE_INVARIANT.MAX_TRADES_PER_HOUR)
    throw new Error("INVARIANT_VIOLATION: trade rate");

  if (input.spreadPct > CORE_INVARIANT.MAX_SPREAD_PCT)
    throw new Error("INVARIANT_VIOLATION: spread");

  if (input.impulse < CORE_INVARIANT.MIN_IMPULSE)
    throw new Error("INVARIANT_VIOLATION: impulse");

  if (
    input.holdSec < CORE_INVARIANT.HOLD_MIN_SEC ||
    input.holdSec > CORE_INVARIANT.HOLD_MAX_SEC
  )
    throw new Error("INVARIANT_VIOLATION: hold window");
}
