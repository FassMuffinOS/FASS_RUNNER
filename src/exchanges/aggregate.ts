import type { Quote, VenueAdapter } from "./types.js";

export type AggregatedBook = {
  symbol: string;
  base: string;
  quote: string;
  quotes: Quote[];
  bestBid?: Quote;
  bestAsk?: Quote;
  edgePct?: number;
};

export async function fetchAll(adapters: VenueAdapter[], universe: { base: string; quote: string }[]) {
  const venueMaps = await Promise.all(adapters.map(a => a.fetchQuotes(universe)));

  const allSymbols = universe.map(u => `${u.base}${u.quote}`);

  const books: AggregatedBook[] = [];
  for (const sym of allSymbols) {
    const base = sym.replace("USDT", "");
    const quote = "USDT";

    const quotes: Quote[] = [];
    for (const vm of venueMaps) {
      const q = vm[sym];
      if (q) quotes.push(q);
    }

    if (quotes.length === 0) continue;

    const bestBid = quotes.reduce((a, b) => (b.bid > a.bid ? b : a), quotes[0]);
    const bestAsk = quotes.reduce((a, b) => (b.ask < a.ask ? b : a), quotes[0]);
    const edgePct = bestAsk.ask > 0 ? ((bestBid.bid - bestAsk.ask) / bestAsk.ask) * 100 : 0;

    books.push({ symbol: sym, base, quote, quotes, bestBid, bestAsk, edgePct });
  }

  return books;
}
