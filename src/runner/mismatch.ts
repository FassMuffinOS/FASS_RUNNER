import type { AggregatedBook } from "../exchanges/aggregate.js";

export type MismatchSnapshot = {
  mismatchScore: number; // 0..100
  avgSpreadPct: number;
  maxEdgePct: number;
  volPulsePct: number;
  illiquidCount: number;
  ts: number;
};

export type MismatchMemory = {
  prevAvgMid?: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function computeMismatch(books: AggregatedBook[], mem: MismatchMemory): MismatchSnapshot {
  // --- 1) Spread stress ---
  const spreads: number[] = [];
  let illiquidCount = 0;

  for (const b of books) {
    const q = b.bestAsk ?? b.bestBid ?? b.quotes[0];
    if (!q) continue;

    spreads.push(q.spreadPct);
    if (q.spreadPct > 0.35) illiquidCount++;
  }

  const avgSpreadPct = spreads.length ? spreads.reduce((a, c) => a + c, 0) / spreads.length : 0;

  // --- 2) Cross-venue dislocation stress ---
  const edges = books.map(b => b.edgePct ?? 0);
  const maxEdgePct = edges.length ? Math.max(...edges) : 0;

  // --- 3) Volatility pulse proxy ---
  const mids: number[] = [];
  for (const b of books) {
    const mid = b.bestAsk?.mid ?? b.bestBid?.mid ?? b.quotes[0]?.mid;
    if (mid) mids.push(mid);
  }

  const avgMid = mids.length ? mids.reduce((a, c) => a + c, 0) / mids.length : 0;

  let volPulsePct = 0;
  if (mem.prevAvgMid && mem.prevAvgMid > 0 && avgMid > 0) {
    volPulsePct = Math.abs((avgMid - mem.prevAvgMid) / mem.prevAvgMid) * 100;
  }
  mem.prevAvgMid = avgMid;

  // --- Score composition ---
  const spreadScore = clamp(avgSpreadPct * 180, 0, 40);
  const edgeScore = clamp(maxEdgePct * 220, 0, 25);
  const volScore = clamp(volPulsePct * 900, 0, 25);
  const illiqScore = clamp(illiquidCount * 1.2, 0, 10);

  const mismatchScore = clamp(spreadScore + edgeScore + volScore + illiqScore, 0, 100);

  return {
    mismatchScore,
    avgSpreadPct,
    maxEdgePct,
    volPulsePct,
    illiquidCount,
    ts: Date.now()
  };
}
