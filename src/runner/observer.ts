import type { AggregatedBook } from "../exchanges/aggregate.js";
import type { Signal } from "./score.js";
import { detectBreakoutRetest } from "../strategies/breakoutRetest.js";
import { detectLiquiditySweepReversal } from "../strategies/liquiditySweepReversal.js";

type PriceMemory = Record<string, number>;

export function runObserverTick(books: AggregatedBook[], mem: PriceMemory) {
  const signals: Signal[] = [];

  for (const b of books) {
    const sym = b.symbol;
    const mid = b.bestAsk?.mid ?? b.bestBid?.mid ?? b.quotes[0]?.mid;
    if (!mid) continue;

    const prev = mem[sym];
    mem[sym] = mid;

    // Skip until we have prior reference
    if (!prev) continue;

    const s1 = detectBreakoutRetest(sym, mid, prev);
    if (s1) signals.push(s1);

    const s2 = detectLiquiditySweepReversal(sym, mid, prev);
    if (s2) signals.push(s2);

    // Dislocation edge (cross-venue)
    if ((b.edgePct ?? 0) > 0.08 && b.quotes.length >= 2 && b.bestBid && b.bestAsk) {
      signals.push({
        signalId: `sig_dx_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        symbol: sym,
        type: "DISLOCATION_EDGE",
        score: Math.min(99, 60 + (b.edgePct ?? 0) * 120),
        reason: [
          `cross-venue edge detected`,
          `edgePct=${(b.edgePct ?? 0).toFixed(3)}`
        ],
        ts: Date.now(),
        venues: [b.bestAsk.venue, b.bestBid.venue],
        metrics: { edgePct: b.edgePct ?? 0 }
      });
    }
  }

  signals.sort((a, b) => b.score - a.score);
  return { signals, mem };
}
