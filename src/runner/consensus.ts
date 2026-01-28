import type { MidObs } from "../exchanges/coinbase.js";

export function buildConsensusMid(input: {
  coinbase: MidObs;
  kraken: MidObs;
}) {
  const out: { symbol: string; price: number }[] = [];

  const mapA = new Map(input.coinbase.symbols.map((x) => [x.symbol, x.price]));
  const mapB = new Map(input.kraken.symbols.map((x) => [x.symbol, x.price]));

  const allSymbols = new Set<string>([
    ...mapA.keys(),
    ...mapB.keys(),
  ]);

  for (const symbol of allSymbols) {
    const a = mapA.get(symbol);
    const b = mapB.get(symbol);

    // if both exist → consensus = mid
    if (Number.isFinite(a) && Number.isFinite(b) && a! > 0 && b! > 0) {
      out.push({ symbol, price: (a! + b!) / 2 });
      continue;
    }

    // fallback to whichever exists
    if (Number.isFinite(a) && a! > 0) out.push({ symbol, price: a! });
    else if (Number.isFinite(b) && b! > 0) out.push({ symbol, price: b! });
  }

  return {
    occurred_at: new Date().toISOString(),
    symbols: out,
  };
}
