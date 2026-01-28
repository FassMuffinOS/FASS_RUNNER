import { getWindowStats } from "./window.js";

export function computeGaussianityScore() {
  const s = getWindowStats();

  if (s.n < 20 || s.stdev === 0) {
    return {
      gaussianityScore: 50,
      tailScore: 0,
      jumpScore: 0,
      kurtosis: 0,
      samples: s.n,
      reason: "warming_up_window",
    };
  }

  const tailRate = s.tails3s / s.n;
  const jumpRate = s.jumps / s.n;

  const tailPenalty = Math.min(60, tailRate * 600);
  const jumpPenalty = Math.min(40, jumpRate * 200);
  const kurtPenalty = Math.min(40, Math.max(0, s.kurtosis) * 10);

  const penalty = tailPenalty + jumpPenalty + kurtPenalty;
  const gaussianityScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    gaussianityScore,
    tailScore: Math.round(tailPenalty),
    jumpScore: Math.round(jumpPenalty),
    kurtosis: Number(s.kurtosis.toFixed(2)),
    samples: s.n,
    reason: "rolling_returns_stats",
  };
}
