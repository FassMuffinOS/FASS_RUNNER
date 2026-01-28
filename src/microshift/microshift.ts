type Point = { t: number; r: number };

export type MicroshiftResult = {
  microshiftScore: number;   // 0..100 (higher = stronger microshift)
  driftBps: number;          // drift estimate in bps
  slope: number;             // trend strength
  coherence: number;         // how consistent direction is
  samples: number;
  reason: string;
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// simple linear regression slope for time series
function linearSlope(xs: number[]) {
  const n = xs.length;
  if (n < 3) return 0;

  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = xs[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

// returns are log returns, so sum(r) ≈ log(P_end/P_start)
export function computeMicroshift(points: Point[]): MicroshiftResult {
  const n = points.length;
  if (n < 20) {
    return {
      microshiftScore: 0,
      driftBps: 0,
      slope: 0,
      coherence: 0,
      samples: n,
      reason: "warming_up_microshift",
    };
  }

  const rs = points.map((p) => p.r);

  // drift per sample in bps
  const mean = rs.reduce((a, b) => a + b, 0) / n;
  const driftBps = mean * 10000;

  // slope (trend strength)
  const slope = linearSlope(rs);

  // coherence: how often the sign matches the mean drift sign
  const sign = mean >= 0 ? 1 : -1;
  const sameDir = rs.filter((x) => (x >= 0 ? 1 : -1) === sign).length;
  const coherence = sameDir / n; // 0..1

  // score components
  // - drift: we care once it's > ~1bp
  const driftScore = clamp01(Math.abs(driftBps) / 5);     // 5bps = strong
  const slopeScore = clamp01(Math.abs(slope) / 0.0002);   // tune later
  const cohScore = clamp01((coherence - 0.5) / 0.5);      // 0.5 -> 0, 1 -> 1

  const score01 = 0.45 * driftScore + 0.25 * slopeScore + 0.30 * cohScore;
  const microshiftScore = Math.round(score01 * 100);

  return {
    microshiftScore,
    driftBps: Number(driftBps.toFixed(2)),
    slope: Number(slope.toFixed(8)),
    coherence: Number(coherence.toFixed(3)),
    samples: n,
    reason: "microshift_drift_slope_coherence",
  };
}
