import { normalizeVenueSymbol } from "./symbols.js";

type Row = {
  feed: string;
  symbol: string;
  price: number;
};

export function computePrism(input: { rows: Row[] }) {
  const rows = input.rows || [];

  // group rows by canonical symbol
  const bySymbol = new Map<string, Row[]>();

  for (const r of rows) {
    if (!r?.symbol) continue;
    if (!Number.isFinite(r.price) || r.price <= 0) continue;

    const sym = normalizeVenueSymbol(r.symbol);
    const list = bySymbol.get(sym) || [];
    list.push({ ...r, symbol: sym });
    bySymbol.set(sym, list);
  }

  const multi: {
    symbol: string;
    spreadBps: number;
    min: number;
    max: number;
    venues: number;
  }[] = [];

  for (const [symbol, list] of bySymbol.entries()) {
    // needs >= 2 venues to refract
    const uniqueFeeds = new Set(list.map((x) => x.feed));
    if (uniqueFeeds.size < 2) continue;

    const prices = list.map((x) => x.price).filter((x) => Number.isFinite(x) && x > 0);
    if (prices.length < 2) continue;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const mid = (min + max) / 2;
    if (mid <= 0) continue;

    const spreadBps = ((max - min) / mid) * 10000;

    multi.push({
      symbol,
      spreadBps: Number(spreadBps.toFixed(2)),
      min: Number(min.toFixed(8)),
      max: Number(max.toFixed(8)),
      venues: uniqueFeeds.size,
    });
  }

  multi.sort((a, b) => b.spreadBps - a.spreadBps);

  const n = multi.length;
  const maxBps = n ? multi[0].spreadBps : 0;
  const avgBps = n ? multi.reduce((acc, x) => acc + x.spreadBps, 0) / n : 0;

  const severeCount = multi.filter((x) => x.spreadBps >= 25).length;   // 0.25%
  const moderateCount = multi.filter((x) => x.spreadBps >= 10).length; // 0.10%

  const prismScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((avgBps / 50) * 100 + (maxBps / 50) * 25)
    )
  );

  const fracture = severeCount >= 2 || maxBps >= 40;

  return {
    prismScore,
    severeCount,
    moderateCount,
    fracture,
    top: multi.slice(0, 8),
    reason: n === 0 ? "no_multi_venue_rows" : "venue_refraction",
  };
}
