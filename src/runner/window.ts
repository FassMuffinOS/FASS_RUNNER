type ReturnPoint = { t: number; r: number };

type SymbolWindow = {
  lastPrice?: number;
  returns: ReturnPoint[];
};

const windows = new Map<string, SymbolWindow>();

export function updateWindow(symbol: string, price: number, maxPoints = 120) {
  const now = Date.now();
  const w = windows.get(symbol) || { returns: [] };

  if (w.lastPrice && w.lastPrice > 0) {
    const r = Math.log(price / w.lastPrice);
    w.returns.push({ t: now, r });

    if (w.returns.length > maxPoints) {
      w.returns = w.returns.slice(-maxPoints);
    }
  }

  w.lastPrice = price;
  windows.set(symbol, w);
}

export function getAllReturns() {
  const all: number[] = [];
  for (const w of windows.values()) {
    for (const p of w.returns) all.push(p.r);
  }
  return all;
}

export function getWindowStats() {
  const all = getAllReturns();
  const n = all.length;

  if (n < 20) {
    return { n, mean: 0, stdev: 0, kurtosis: 0, tails3s: 0, jumps: 0 };
  }

  const mean = all.reduce((a, b) => a + b, 0) / n;
  const varr = all.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const stdev = Math.sqrt(varr);

  const m4 = all.reduce((a, b) => a + ((b - mean) / stdev) ** 4, 0) / n;
  const kurtosis = m4 - 3;

  const tails3s = all.filter((x) => Math.abs(x - mean) > 3 * stdev).length;
  const jumps = all.filter((x) => Math.abs(x - mean) > 2 * stdev).length;

  return { n, mean, stdev, kurtosis, tails3s, jumps };
}

export function getConsensusReturns() {
  // consensus-only returns are the cleanest truth line
  const all: { t: number; r: number }[] = [];
  for (const [sym, w] of windows.entries()) {
    // NOTE: we are not separating per feed here yet.
    // v2 will track per feed. For now, this is global window.
    for (const p of w.returns) all.push(p);
  }
  // sort by time and return the most recent slice
  all.sort((a, b) => a.t - b.t);
  return all.slice(-400); // cap
}
