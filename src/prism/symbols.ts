export function normalizeVenueSymbol(input: string) {
  // goal: convert all venue symbols to a canonical "BASE/QUOTE"
  // examples:
  //   "BTC-USD" -> "BTC/USD"
  //   "BTC/USD" -> "BTC/USD"
  //   "XBT/USD" -> "BTC/USD"
  //   "XBTUSD"  -> "BTC/USD" (best-effort)
  let s = String(input || "").trim().toUpperCase();

  // common separators
  s = s.replace(/-/g, "/").replace(/_/g, "/");

  // Kraken uses XBT (Bitcoin)
  s = s.replace(/^XBT\//, "BTC/");
  s = s.replace(/\/XBT$/, "/BTC");

  // best-effort for "XBTUSD" style
  if (!s.includes("/") && s.length >= 6) {
    const base = s.slice(0, 3);
    const quote = s.slice(3);
    s = `${base}/${quote}`;
  }

  // normalize again after split trick
  s = s.replace(/^XBT\//, "BTC/");

  return s;
}
