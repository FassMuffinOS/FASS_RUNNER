export const CONTROL = {
  // hard loop
  MAX_OPEN_POS: 1,                // only 1 open trade at a time (safe)
  MAX_TRADES_PER_HOUR: 6,         // throttle

  // micro-hold windows (GENESIS)
  HOLD_MIN_MS: 10_000,            // 10s
  HOLD_MAX_MS: 60_000,            // 60s
  COOLDOWN_MS: 12_000,            // wait after exit before re-enter same symbol

  // edge + market health filters
  MIN_MISMATCH: 10,               // window opens above this
  MIN_PULSE: 0.008,               // pulse floor
  MAX_SPREAD_PCT: 0.10,           // if spread too wide = unhealthy

  // paper sizing
  START_CAPITAL_USD: 50,
  RISK_PER_TRADE_PCT: 0.25,       // 0.25% of capital per trade (ultra safe)

  // exits
  TAKE_PROFIT_PCT: 0.10,          // +0.10%
  STOP_LOSS_PCT: 0.10,            // -0.10%
};
