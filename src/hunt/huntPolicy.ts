export type HuntDecision = {
  huntMode: "HOLD" | "PROBE" | "HUNT";
  confidence: "LOW" | "MED" | "HIGH";
  riskPct: number; // 0..100
  reason: string;
};

export function decideHunt(input: {
  latticeMode: "HUNT" | "DEFENSE" | "LOCK";
  gaussianityScore: number;
  microshiftScore: number;
  prismScore: number;
  fracture: boolean;
  bookLagScore: number;
}): HuntDecision {
  const {
    latticeMode,
    gaussianityScore,
    microshiftScore,
    prismScore,
    fracture,
    bookLagScore,
  } = input;

  // HARD STOPS (never hunt)
  if (latticeMode === "LOCK") {
    return { huntMode: "HOLD", confidence: "LOW", riskPct: 0, reason: "lattice_lock" };
  }
  if (fracture) {
    return { huntMode: "HOLD", confidence: "LOW", riskPct: 0, reason: "prism_fracture" };
  }
  if (bookLagScore >= 35) {
    return { huntMode: "HOLD", confidence: "LOW", riskPct: 0, reason: "booklag_defense" };
  }

  // DEFENSE zone (probe only if microshift is strong)
  if (latticeMode === "DEFENSE") {
    if (microshiftScore >= 65 && gaussianityScore >= 45 && prismScore <= 10) {
      return { huntMode: "PROBE", confidence: "MED", riskPct: 10, reason: "defense_probe_microshift" };
    }
    return { huntMode: "HOLD", confidence: "LOW", riskPct: 0, reason: "defense_hold" };
  }

  // latticeMode === "HUNT"
  // HUNT is allowed only when structure is stable + prism clean
  if (gaussianityScore >= 55 && prismScore <= 12 && microshiftScore >= 45) {
    return { huntMode: "HUNT", confidence: "HIGH", riskPct: 35, reason: "hunt_stable" };
  }

  // Otherwise mild probe
  if (microshiftScore >= 55 && prismScore <= 15) {
    return { huntMode: "PROBE", confidence: "MED", riskPct: 15, reason: "hunt_probe" };
  }

  return { huntMode: "HOLD", confidence: "LOW", riskPct: 0, reason: "hunt_not_ready" };
}
