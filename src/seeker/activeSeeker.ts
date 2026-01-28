export type SeekerMode = "HOLD" | "WET_FEET" | "PROBE" | "STRIKE";

export type SeekerDecision = {
  seekerMode: SeekerMode;
  symbol?: string;
  action?: "BUY" | "SELL";
  sizePct?: number; // 0.10 = 0.10% of bankroll (tiny)
  edgeType?: "MICROSHIFT" | "VENUE_REFRACTION" | "BOOK_LAG";
  score: number; // 0..100
  reason: string;
};

type AnyEvent = any;

/**
 * ACTIVE SEEKER (controlled nuke lens)
 * Goal: Seek → Find → Execute (micropulse) while staying inside FASS safety.
 *
 * This does NOT place real trades yet. It only emits a decision + logs it to ledger.
 */
export function decideActiveSeeker(event: AnyEvent): SeekerDecision {
  const mode = event?.lattice?.mode || "LOCK";

  // hard safety: if LOCK, we do not execute
  if (mode === "LOCK") {
    return {
      seekerMode: "HOLD",
      score: 0,
      reason: "lattice_lock",
    };
  }

  const ms = Number(event?.microshift?.microshiftScore ?? 0);
  const prism = Number(event?.prism?.prismScore ?? 0);
  const lag = Number(event?.bookLag?.bookLagScore ?? 0);
  const gauss = Number(event?.gaussianity?.gaussianityScore ?? 0);

  // pick top candidate from PRISM first (refraction gives direct venue opportunity)
  const prismTop = event?.prism?.top?.[0];
  const lagTop = event?.bookLag?.top?.[0];

  // thresholds (WET_FEET)
  const msOk = ms >= 15;
  const prismOk = prism > 0 && prism <= 25;
  const lagOk = lag > 0 && lag <= 25;
  const gaussOk = gauss <= 35;

  // If we detect any edge but still safe enough → WET_FEET
  if (gaussOk && (msOk || prismOk || lagOk)) {
    // choose symbol priority:
    // 1) prism top
    // 2) lag top
    // 3) none
    const pickSymbol =
      prismTop?.symbol ||
      (lagTop?.symbol ? String(lagTop.symbol).replace("-USD", "/USD") : undefined);

    const edgeType: SeekerDecision["edgeType"] =
      msOk ? "MICROSHIFT" : prismOk ? "VENUE_REFRACTION" : "BOOK_LAG";

    // score: simple blend (0..100)
    const score01 = Math.max(
      0,
      Math.min(
        1,
        (ms / 100) * 0.50 +
          (Math.max(0, 25 - prism) / 25) * 0.25 +
          (Math.max(0, 25 - lag) / 25) * 0.25
      )
    );
    const score = Math.round(score01 * 100);

    return {
      seekerMode: "WET_FEET",
      symbol: pickSymbol,
      action: "BUY",
      sizePct: 0.1, // 0.10% wet-feet micropulse
      edgeType,
      score,
      reason: `wet_feet: gauss<=35 && (ms>=15 || prism<=25 || lag<=25)`,
    };
  }

  // otherwise HOLD
  return {
    seekerMode: "HOLD",
    score: 0,
    reason: "no_safe_edge",
  };
}
