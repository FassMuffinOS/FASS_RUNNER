import { CONTROL } from "../config/runnerControl.js";
import { logEvent } from "../ledger/ledger.js";
import type { Window } from "./windows.js";

export type Position = {
  symbol: string;
  side: "LONG";
  entryTs: number;
  exitTs?: number;

  entryPrice: number;
  exitPrice?: number;

  sizeUsd: number;
  qty: number;

  windowType: string;
  windowScore: number;

  reasonOpen: string[];
  reasonClose?: string;

  pnlPct?: number;
};

type ExecState = {
  capitalUsd: number;
  openPos: Position | null;
  lastTradeTsBySymbol: Record<string, number>;
  tradesLastHour: number[];
};

export function createExecState(): ExecState {
  return {
    capitalUsd: CONTROL.START_CAPITAL_USD,
    openPos: null,
    lastTradeTsBySymbol: {},
    tradesLastHour: [],
  };
}

function now() {
  return Date.now();
}

function canTradeSymbol(st: ExecState, symbol: string) {
  const last = st.lastTradeTsBySymbol[symbol] ?? 0;
  return now() - last >= CONTROL.COOLDOWN_MS;
}

function tradesInLastHour(st: ExecState) {
  const cutoff = now() - 60 * 60 * 1000;
  st.tradesLastHour = st.tradesLastHour.filter((t) => t >= cutoff);
  return st.tradesLastHour.length;
}

export async function maybeEnter(st: ExecState, w: Window, midPrice: number) {
  if (st.openPos) return; // only 1 open pos for safety

  if (tradesInLastHour(st) >= CONTROL.MAX_TRADES_PER_HOUR) return;
  if (!canTradeSymbol(st, w.symbol)) return;

  const riskUsd = Math.max(1, (st.capitalUsd * CONTROL.RISK_PER_TRADE_PCT) / 100);
  const qty = riskUsd / midPrice;

  const pos: Position = {
    symbol: w.symbol,
    side: "LONG",
    entryTs: now(),
    entryPrice: midPrice,
    sizeUsd: riskUsd,
    qty,
    windowType: w.type,
    windowScore: w.score,
    reasonOpen: w.reason,
  };

  st.openPos = pos;
  st.lastTradeTsBySymbol[w.symbol] = now();
  st.tradesLastHour.push(now());

  await logEvent({ type: "SIGNAL", ts: now(), signal: { action: "ENTER", ...pos } });
  console.log(`🔥 ENTER ${pos.symbol} @ ${pos.entryPrice.toFixed(6)} size=$${pos.sizeUsd.toFixed(2)} window=${pos.windowType} score=${pos.windowScore.toFixed(1)}`);
}

export async function maybeExit(st: ExecState, midPrice: number, reason: string) {
  const pos = st.openPos;
  if (!pos) return;

  pos.exitTs = now();
  pos.exitPrice = midPrice;

  const pnlPct = ((midPrice - pos.entryPrice) / pos.entryPrice) * 100;
  pos.pnlPct = pnlPct;
  pos.reasonClose = reason;

  // update capital (paper)
  st.capitalUsd = st.capitalUsd * (1 + pnlPct / 100);

  await logEvent({ type: "SUMMARY", ts: now(), summary: { action: "EXIT", ...pos, capitalUsd: st.capitalUsd } });
  console.log(`✅ EXIT  ${pos.symbol} @ ${midPrice.toFixed(6)} pnl=${pnlPct.toFixed(3)}% reason=${reason} capital=$${st.capitalUsd.toFixed(2)}`);

  st.openPos = null;
}

export async function managePosition(st: ExecState, midPrice: number, windowExpiresTs: number | null) {
  const pos = st.openPos;
  if (!pos) return;

  const pnlPct = ((midPrice - pos.entryPrice) / pos.entryPrice) * 100;

  // exits: TP / SL
  if (pnlPct >= CONTROL.TAKE_PROFIT_PCT) return maybeExit(st, midPrice, "TAKE_PROFIT");
  if (pnlPct <= -CONTROL.STOP_LOSS_PCT) return maybeExit(st, midPrice, "STOP_LOSS");

  // time stop
  if (windowExpiresTs && now() >= windowExpiresTs) return maybeExit(st, midPrice, "TIME_STOP");
}
