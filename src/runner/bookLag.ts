export type FeedSymbol = {
  feed: string;
  symbol: string;
  price: number;
};

export type FeedObs = {
  occurred_at: string;
  feeds: string[];
  symbols: FeedSymbol[];
};

function key(feed: string, symbol: string) {
  return `${feed}::${symbol}`;
}

export function computeBookLag(input: {
  obs: FeedObs;
  feedA: string;
  feedB: string;
}) {
  const { obs, feedA, feedB } = input;

  const prices = new Map<string, number>();
  for (const s of obs.symbols) {
    prices.set(key(s.feed, s.symbol), s.price);
  }

  const overlap: { symbol: string; a: number; b: number; bps: number }[] = [];

  const seenSymbols = new Set<string>();
  for (const s of obs.symbols) seenSymbols.add(s.symbol);

  for (const symbol of seenSymbols) {
    const a = prices.get(key(feedA, symbol));
    const b = prices.get(key(feedB, symbol));
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    const mid = (a + b) / 2;
    if (mid <= 0) continue;

    const diff = Math.abs(a - b);
    const bps = (diff / mid) * 10000;

    overlap.push({ symbol, a, b, bps: Number(bps.toFixed(2)) });
  }

  overlap.sort((x, y) => y.bps - x.bps);

  const n = overlap.length;
  const maxBps = n > 0 ? overlap[0].bps : 0;

  const avgBps = n > 0 ? overlap.reduce((acc, x) => acc + x.bps, 0) / n : 0;

  const severeCount = overlap.filter((x) => x.bps >= 25).length;
  const moderateCount = overlap.filter((x) => x.bps >= 10).length;

  const score = Math.max(
    0,
    Math.min(100, Math.round((avgBps / 50) * 100 + (maxBps / 50) * 25))
  );

  return {
    bookLagScore: score,
    overlapSymbols: n,
    avgBps: Number(avgBps.toFixed(2)),
    maxBps: Number(maxBps.toFixed(2)),
    moderateCount,
    severeCount,
    top: overlap.slice(0, 5),
    reason: n === 0 ? "no_overlap" : "cross_venue_divergence",
  };
}
