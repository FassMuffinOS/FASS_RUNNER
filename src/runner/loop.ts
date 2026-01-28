import { appendLedgerEvent } from "../ledger/ledger.js";
import { fetchMultiFeed } from "../exchanges/multi.js";
import { updateWindow, getConsensusReturns } from "./window.js";
import { computeMismatchScore } from "./mismatch.js";
import { computeGaussianityScore } from "./gaussianity.js";
import { computeMicroshift } from "../microshift/microshift.js";
import { decideActiveSeeker } from "../seeker/activeSeeker.js";
import { decideHunt } from "../hunt/huntPolicy.js";
import { classifyLatticeState } from "./lattice.js";
import { computeBookLag } from "./bookLag.js";
import { computePrism } from "../prism/prism.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runObserverLoop() {
  console.log("writing ledger to: _RUNTIME/ledger/ledger.ndjson");

  while (true) {
    const t0 = Date.now();

    // 1) ingest multi-feed snapshot
    const obs = await fetchMultiFeed();

    // 2) update rolling returns window ONLY from consensus (truth stream)
    for (const s of obs.symbols) {
      if (s.feed === "consensus") updateWindow(s.symbol, s.price);
    }

    // 3) mismatch / gaussianity
    const mismatch = computeMismatchScore(obs);
    const gauss = computeGaussianityScore();

    // MICROSHIFT: use consensus-only return window (cleanest truth feed)
    const microshift = computeMicroshift(getConsensusReturns());

    // 4) cross-venue lag divergence (coinbase vs kraken)
    const bookLag = computeBookLag({
      obs,
      feedA: "coinbase",
      feedB: "kraken",
    });

    // 5) PRISM scan (raw refraction table across venues)
    // NOTE: we exclude "consensus" from prism on purpose (consensus is not a venue)
    const prism = computePrism({
      rows: obs.symbols
        .filter((x) => x.feed !== "consensus")
        .map((x) => ({ feed: x.feed, symbol: x.symbol, price: x.price })),
    });

    // 6) lattice classifier
    const state = classifyLatticeState({
      mismatchScore: mismatch.mismatchScore,
      gaussianityScore: gauss.gaussianityScore,
      bookLagScore: bookLag.bookLagScore,
    });

    // 7) HUNT decision (probabilistic action gate)
    const huntDecision = decideHunt({
      latticeMode: state.mode, // "HUNT" | "DEFENSE" | "LOCK"
      gaussianityScore: gauss.gaussianityScore,
      microshiftScore: microshift.microshiftScore,
      prismScore: prism.prismScore,
      fracture: prism.fracture,
      bookLagScore: bookLag.bookLagScore,
    });

    const seeker = decideActiveSeeker({
      mismatch,
      gaussianity: gauss,
      microshift,
      bookLag,
      prism,
      lattice: state,
    });

    // 8) ledger event
    const event = {
      version: "runner-v1",
      occurred_at: new Date().toISOString(),
      feeds: obs.feeds.length,
      symbols: obs.symbols.length,
      mismatch,
      gaussianity: gauss,
      microshift,
      bookLag,
      prism,
      hunt: huntDecision,
      seeker,
      lattice: state,
    };

    await appendLedgerEvent(event);

    const dt = Date.now() - t0;
    const intervalMs = 6000;
    const wait = Math.max(250, intervalMs - dt);

    console.log(
      `[RUN] feeds=${event.feeds} symbols=${event.symbols} mismatch=${mismatch.mismatchScore} gauss=${gauss.gaussianityScore} lag=${bookLag.bookLagScore} prism=${prism.prismScore} ms=${microshift.microshiftScore} hunt=${huntDecision.huntMode}:${huntDecision.confidence} risk=${huntDecision.riskPct}% seeker=${seeker.seekerMode}:${seeker.edgeType || "NONE"} score=${seeker.score} sym=${seeker.symbol || "-"} size=${seeker.sizePct || 0}% state=${state.mode} wait=${wait}ms`
    );

    // PRISM fracture alerts
    if (prism.fracture && prism.top?.length) {
      console.log(
        `[PRISM] fracture=YES severe=${prism.severeCount} moderate=${prism.moderateCount} top=` +
          prism.top
            .slice(0, 5)
            .map((x: any) => `${x.symbol}:${x.spreadBps}bps`)
            .join(", ")
      );
    }

    await sleep(wait);
  }
}
