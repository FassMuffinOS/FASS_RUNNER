export type MidObs = { occurred_at: string; symbols: { symbol: string; price: number }[] };

const KRAKEN_PAIRS = [
  "XBT/USD",
  "ETH/USD",
  "SOL/USD",
  "XRP/USD",
  "ADA/USD",
  "DOGE/USD",
  "AVAX/USD",
  "LINK/USD",
  "DOT/USD",
  "MATIC/USD",
  "LTC/USD",
  "BCH/USD",
  "UNI/USD",
  "ATOM/USD",
  "XLM/USD",
  "FIL/USD",
  "ETC/USD",
  "AAVE/USD",
  "NEAR/USD",
  "ALGO/USD",
];

// map Kraken base → Coinbase base
function baseMap(base: string) {
  if (base === "XBT") return "BTC";
  if (base === "XDG") return "DOGE";
  return base;
}

function normalizeKrakenSymbol(pair: string) {
  // "XBT/USD" -> "BTC-USD"
  const [baseRaw, quoteRaw] = pair.split("/");
  if (!baseRaw || !quoteRaw) return pair;

  const base = baseMap(baseRaw);
  const quote = quoteRaw;
  return `${base}-${quote}`;
}

export async function fetchKrakenTopMid(): Promise<MidObs> {
  const out: { symbol: string; price: number }[] = [];

  for (const pair of KRAKEN_PAIRS) {
    const url = `https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(pair)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "FASS-Runner/1.0",
        Accept: "application/json",
      },
    });

    if (!res.ok) continue;

    const j = (await res.json()) as any;
    const result = j?.result;

    if (!result) continue;

    // Kraken result key is NOT always the same as the requested pair
    const key = Object.keys(result)[0];
    const row = key ? result[key] : null;

    const last = row?.c?.[0];
    const price = Number(last);

    if (!Number.isFinite(price) || price <= 0) continue;

    out.push({ symbol: normalizeKrakenSymbol(pair), price });
  }

  return { occurred_at: new Date().toISOString(), symbols: out };
}
