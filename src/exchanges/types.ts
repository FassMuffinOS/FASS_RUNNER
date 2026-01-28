export type Venue = "BINANCE" | "COINBASE";

export type Quote = {
  venue: Venue;
  symbol: string;   // e.g. BTCUSDT
  base: string;     // BTC
  quote: string;    // USDT
  bid: number;
  ask: number;
  mid: number;
  spreadPct: number;
  ts: number;
};

export type VenueQuotes = Record<string, Quote>;

export type VenueAdapter = {
  venue: Venue;
  fetchQuotes: (symbols: { base: string; quote: string }[]) => Promise<VenueQuotes>;
};
