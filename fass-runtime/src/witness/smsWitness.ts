/**********************************************************************
 FASS Unified Witness + SMS Authority Module
 Single-file production implementation
**********************************************************************/

import * as twilio from "twilio";
import * as crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { resolve } from "path";

dotenv.config();

/**********************************************************************
 REQUIRED ENVIRONMENT VARIABLES
**********************************************************************/

const REQUIRED_ENV = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TEST_PHONE_NUMBER",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`[FASS INIT ERROR] Missing ENV: ${key}`);
  }
}

/**********************************************************************
 CLIENT INITIALIZATION
**********************************************************************/

const twilioClient = twilio.default(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

/**********************************************************************
 TYPES
**********************************************************************/

export interface AuthorityEvent {
  actor: string;
  action: string;
  resource: string;
  decision: "ALLOW" | "DENY";
  metadata?: Record<string, unknown> | undefined;
}

export interface WitnessRecord {
  id?: string | undefined;
  event_hash: string;
  event_type: string;
  actor: string;
  action: string;
  resource: string;
  decision: "ALLOW" | "DENY";
  timestamp: string;
  metadata?: Record<string, unknown> | undefined;
  sms_sid?: string | undefined;
  sms_status?: string | undefined;
}

export interface SMSResult {
  success: boolean;
  sid?: string | undefined;
  error?: string | undefined;
}

export interface WitnessResult {
  success: boolean;
  hash: string;
  record?: WitnessRecord | undefined;
  sms?: SMSResult | undefined;
  error?: string | undefined;
}

/**********************************************************************
 DETERMINISTIC WITNESS HASH
 Creates a reproducible hash for event integrity verification
**********************************************************************/

export function computeWitnessHash(event: AuthorityEvent): string {
  const canonicalPayload = JSON.stringify({
    actor: event.actor,
    action: event.action,
    resource: event.resource,
    decision: event.decision,
  });

  return crypto
    .createHash("sha256")
    .update(canonicalPayload)
    .digest("hex");
}

/**********************************************************************
 SUPABASE WITNESS LOGGING
 Persists authority events to the witness_log table
**********************************************************************/

export async function logWitnessToSupabase(
  event: AuthorityEvent,
  hash: string,
  smsSid?: string
): Promise<WitnessRecord | null> {
  const record: WitnessRecord = {
    event_hash: hash,
    event_type: "AUTHORITY_EVENT",
    actor: event.actor,
    action: event.action,
    resource: event.resource,
    decision: event.decision,
    timestamp: new Date().toISOString(),
    metadata: event.metadata,
    sms_sid: smsSid,
    sms_status: smsSid ? "SENT" : undefined,
  };

  const { data, error } = await supabase
    .from("witness_log")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("[FASS WITNESS] Supabase insert error:", error.message);
    return null;
  }

  return data as WitnessRecord;
}

/**********************************************************************
 TWILIO SMS NOTIFICATION
 Sends SMS alerts for critical authority events via Messaging Service
**********************************************************************/

export async function sendSMSNotification(
  event: AuthorityEvent,
  hash: string
): Promise<SMSResult> {
  const messageBody = [
    `[FASS AUTHORITY EVENT]`,
    `Decision: ${event.decision}`,
    `Actor: ${event.actor}`,
    `Action: ${event.action}`,
    `Resource: ${event.resource}`,
    `Hash: ${hash.substring(0, 16)}...`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  try {
    const message = await twilioClient.messages.create({
      body: messageBody,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID as string,
      to: process.env.TEST_PHONE_NUMBER as string,
    });

    return {
      success: true,
      sid: message.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[FASS SMS] Twilio send error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**********************************************************************
 FAIL-CLOSED AUTHORITY EVENT HANDLER
 Primary entry point for processing authority events
 
 FAIL-CLOSED PRINCIPLE:
 - If ANY step fails, the entire operation is treated as DENY
 - SMS failures do not block witness logging
 - Witness logging failures trigger SMS alert if possible
**********************************************************************/

export async function handleAuthorityEvent(
  event: AuthorityEvent
): Promise<WitnessResult> {
  // Step 1: Compute deterministic hash
  const hash = computeWitnessHash(event);

  // Step 2: Send SMS notification for DENY events or critical actions
  let smsResult: SMSResult | undefined;
  const shouldNotify = event.decision === "DENY" || 
    event.metadata?.critical === true;

  if (shouldNotify) {
    smsResult = await sendSMSNotification(event, hash);
  }

  // Step 3: Log to Supabase witness ledger
  const record = await logWitnessToSupabase(event, hash, smsResult?.sid);

  // Step 4: Evaluate outcome (fail-closed)
  if (!record) {
    // FAIL-CLOSED: If we cannot log the witness, treat as failed
    // Attempt emergency SMS if not already sent
    if (!smsResult) {
      smsResult = await sendSMSNotification(
        { ...event, metadata: { ...event.metadata, emergency: true } },
        hash
      );
    }

    return {
      success: false,
      hash,
      sms: smsResult,
      error: "Failed to log witness record - fail-closed triggered",
    };
  }

  return {
    success: true,
    hash,
    record,
    sms: smsResult,
  };
}

/**********************************************************************
 CONVENIENCE EXPORTS
**********************************************************************/

export { twilioClient, supabase };

/**********************************************************************
 MODULE SELF-TEST (runs when executed directly)
**********************************************************************/

const isMainModule = (): boolean => {
  try {
    const modulePath = fileURLToPath(import.meta.url);
    const entryPath = resolve(process.argv[1] ?? "");
    return modulePath === entryPath;
  } catch {
    return false;
  }
};

if (isMainModule()) {
  console.log("[FASS WITNESS] Running self-test...");
  
  const testEvent: AuthorityEvent = {
    actor: "system:test",
    action: "SELF_TEST",
    resource: "witness:module",
    decision: "ALLOW",
    metadata: { test: true },
  };

  const hash = computeWitnessHash(testEvent);
  console.log("[FASS WITNESS] Test hash:", hash);
  console.log("[FASS WITNESS] Module loaded successfully");
}
