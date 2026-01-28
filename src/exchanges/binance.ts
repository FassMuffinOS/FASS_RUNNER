import fetch from "node-fetch";
import type { Quote, VenueAdapter, VenueQuotes } from "./types.js";

function spreadPct(bid: number, ask: number) {
  const mid = (bid + ask) / 2;
  if (!mid) return 0;
  return ((ask - bid) / mid) * 100;
}

export const binanceAdapter: VenueAdapter = {
  venue: "BINANCE",
  async fetchQuotes(symbols) {
    const out: VenueQuotes = {};

    for (const s of symbols) {
      const symbol = `${s.base}${s.quote}`; // BTCUSDT

      try {
        const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`;
        const res = await fetch(url);
        if (!res.ok) continue;

        const j: any = await res.json();
        const bid = Number(j.bidPrice);
        const ask = Number(j.askPrice);
        if (!bid || !ask) continue;

        const mid = (bid + ask) / 2;

        out[symbol] = {
          venue: "BINANCE",
          symbol,
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
