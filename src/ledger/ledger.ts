import fs from "node:fs";
import path from "node:path";

const RUNTIME_DIR = path.resolve(process.cwd(), "_RUNTIME");
const LEDGER_PATH = path.join(RUNTIME_DIR, "ledger.ndjson");

type AnyObj = Record<string, any>;

export type LedgerEvent =
  | { type: "BOOT"; ts: number; notes?: string[] }
  | { type: "TICK"; ts: number; notes?: string[] }
  | { type: "SIGNAL"; ts: number; signal: AnyObj }
  | { type: "SUMMARY"; ts: number; summary: AnyObj }
  | { type: "ERROR"; ts: number; error: AnyObj };

function ensureRuntime() {
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

export async function logEvent(evt: LedgerEvent) {
  ensureRuntime();
  const line = JSON.stringify(evt) + "\n";
  fs.appendFileSync(LEDGER_PATH, line, "utf8");
}
