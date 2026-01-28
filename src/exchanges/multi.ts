import { fetchCoinbaseTopMid } from "./coinbase.js";
import { fetchKrakenTopMid } from "./kraken.js";
import { buildConsensusMid } from "../runner/consensus.js";

export type FeedName = "coinbase" | "kraken" | "consensus";

export type MidRow = {
  feed: FeedName;
  symbol: string;
  price: number;
};

export type MultiObs = {
  occurred_at: string;
  feeds: FeedName[];
  symbols: MidRow[];
};

export async function fetchMultiFeed(): Promise<MultiObs> {
  // PARALLEL INGEST 🔥
  const [coinbase, kraken] = await Promise.all([
    fetchCoinbaseTopMid(),
    fetchKrakenTopMid(),
  ]);

  const feeds: FeedName[] = ["coinbase", "kraken"];
  const all: MidRow[] = [];

  for (const s of coinbase.symbols) all.push({ feed: "coinbase", symbol: s.symbol, price: s.price });
  for (const s of kraken.symbols) all.push({ feed: "kraken", symbol: s.symbol, price: s.price });

  // consensus symbols (separate truth feed)
  const consensus = buildConsensusMid({ coinbase, kraken });
  for (const s of consensus.symbols) all.push({ feed: "consensus", symbol: s.symbol, price: s.price });

  return {
    occurred_at: new Date().toISOString(),
    feeds: [...feeds, "consensus"],
    symbols: all,
  };
}
