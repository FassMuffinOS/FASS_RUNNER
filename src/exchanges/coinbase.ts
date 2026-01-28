import fetch from "node-fetch";
import type { Quote, VenueAdapter, VenueQuotes } from "./types.js";

function spreadPct(bid: number, ask: number) {
  const mid = (bid + ask) / 2;
  if (!mid) return 0;
  return ((ask - bid) / mid) * 100;
}

// Coinbase mostly uses USD pairs (BTC-USD).
// For Observer Mode we normalize into BTCUSDT key anyway.
export const coinbaseAdapter: VenueAdapter = {
  venue: "COINBASE",
  async fetchQuotes(symbols) {
    const out: VenueQuotes = {};

    for (const s of symbols) {
      const productId = `${s.base}-USD`;

      try {
        const url = `https://api.exchange.coinbase.com/products/${productId}/book?level=1`;
        const res = await fetch(url);
        if (!res.ok) continue;

        const j: any = await res.json();
        const bid = Number(j?.bids?.[0]?.[0]);
        const ask = Number(j?.asks?.[0]?.[0]);
        if (!bid || !ask) continue;

        const mid = (bid + ask) / 2;

        out[`${s.base}${s.quote}`] = {
          venue: "COINBASE",
          symbol: `${s.base}${s.quote}`,
          base: s.base,
          quote: s.quote,
          bid,
          ask,
          mid,
          spreadPct: spreadPct(bid, ask),
          ts: Date.now()
        } satisfies Quote;
      } catch {
        // ignore
      }
    }

    return out;
  }
};
