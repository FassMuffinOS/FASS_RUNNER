import { verifyInvariantHash } from "./invariant/hashGuard";

import { UNIVERSE, FAST_TICK_MS } from "./config/universe.js";
import { binanceAdapter } from "./exchanges/binance.js";
import { coinbaseAdapter } from "./exchanges/coinbase.js";
import { fetchAll } from "./exchanges/aggregate.js";
import { foreverEvery } from "./runner/scheduler.js";
import { classifyMarketState, decideMode } from "./runner/state.js";
import { runObserverTick } from "./runner/observer.js";
import { logEvent } from "./ledger/ledger.js";
import { computeMismatch } from "./runner/mismatch.js";
import { allocate } from "./runner/allocator.js";

/* 🔒 HARD BOUNDARY — invariant must pass before anything else */
verifyInvariantHash();


const adapters = [binanceAdapter, coinbaseAdapter];

const priceMem: Record<string, number> = {};
const mismatchMem: { prevAvgMid?: number } = {};

// v1: pretend starting capital (change anytime)
let capitalUSD = 50;

function stamp() {
  const d = new Date();
  return d.toISOString().replace("T", " ").slice(0, 19);
}

console.log("✅ FASS Runner — Observer Mode v1 (LATTICE ENABLED)");
console.log(`⏱️ tick=${FAST_TICK_MS}ms universe=${UNIVERSE.length} venues=${adapters.map(a => a.venue).join(", ")}`);
console.log(`💰 capitalUSD=${capitalUSD}`);
console.log("");

await foreverEvery(FAST_TICK_MS, async () => {
  const books = await fetchAll(adapters, UNIVERSE);

  // 1) Compute mismatch pressure (lattice driver)
  const mm = computeMismatch(books, mismatchMem);

  // 2) Classify market state from mismatch
  const state = classifyMarketState(mm.mismatchScore);
  const mode = decideMode(state);

  // 3) Allocate allowed behavior by capital + state
  const plan = allocate(capitalUSD, state);

  // 4) Run observer micro-detection
  const { signals } = runObserverTick(books, priceMem);

  // Filter signals by mode (LOCK = no entries)
  const allowedTypes = new Set(
    plan.mode === "LOCK"
      ? []
      : plan.mode === "HUNT"
        ? ["BREAKOUT_RETEST", "DISLOCATION_EDGE", "LIQUIDITY_SWEEP_REVERSAL"]
        : ["LIQUIDITY_SWEEP_REVERSAL", "DISLOCATION_EDGE"]
  );

  const filtered = signals.filter(s => allowedTypes.has(s.type));
  filtered.sort((a, b) => b.score - a.score);

  const top = filtered.slice(0, 7);

  console.log(
    `[${stamp()}] ` +
    `mismatch=${mm.mismatchScore.toFixed(1)} ` +
    `spread=${mm.avgSpreadPct.toFixed(3)}% ` +
    `edgeMax=${mm.maxEdgePct.toFixed(3)}% ` +
    `pulse=${mm.volPulsePct.toFixed(3)}% ` +
    `illiq=${mm.illiquidCount} ` +
    `state=${state} mode=${mode} tier=${plan.tier} ` +
    `quotes=${books.length} signals=${signals.length} shown=${top.length}`
  );

  console.log(`  ▸ PLAN: trades/hr<=${plan.maxTradesPerHour} pos<=${plan.maxPositions} risk/trade<=${plan.riskPerTradePct}%`);

  for (const s of top) {
    console.log(`  • ${s.symbol} | ${s.type} | score=${s.score.toFixed(1)} | ${s.reason.join(" | ")}`);
  }

  await logEvent({
    type: "TICK",
    ts: Date.now(),
    notes: [
      `capitalUSD=${capitalUSD}`,
      `mismatchScore=${mm.mismatchScore.toFixed(3)}`,
      `avgSpreadPct=${mm.avgSpreadPct.toFixed(6)}`,
      `maxEdgePct=${mm.maxEdgePct.toFixed(6)}`,
      `volPulsePct=${mm.volPulsePct.toFixed(6)}`,
      `illiquidCount=${mm.illiquidCount}`,
      `state=${state}`,
      `mode=${mode}`,
      `tier=${plan.tier}`,
      `maxTradesPerHour=${plan.maxTradesPerHour}`,
      `maxPositions=${plan.maxPositions}`,
      `riskPerTradePct=${plan.riskPerTradePct}`,
      `quotes=${books.length}`,
      `signals=${signals.length}`
    ]
  });

  for (const s of top) {
    if (s.score >= 85 && plan.mode !== "LOCK") {
      await logEvent({ type: "SIGNAL", ts: Date.now(), signal: s });
    }
  }

  await logEvent({
    type: "SUMMARY",
    ts: Date.now(),
    summary: {
      mismatch: mm,
      state,
      mode,
      plan,
      topSignals: top.map(s => ({ symbol: s.symbol, type: s.type, score: s.score }))
    }
  });
});
