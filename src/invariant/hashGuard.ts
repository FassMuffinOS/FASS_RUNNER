// src/invariant/hashGuard.ts
import fs from "fs";
import crypto from "crypto";
import path from "path";

const INV_PATH = path.join(__dirname, "coreInvariant.ts");
const EXPECTED_HASH = "84482519cc372bada2c1dc84a3500a079f61c5a4d0bd5d22808a641513cf26ed";

export function verifyInvariantHash() {
  const data = fs.readFileSync(INV_PATH);
  const hash = crypto.createHash("sha256").update(data).digest("hex");

  if (EXPECTED_HASH === "84482519cc372bada2c1dc84a3500a079f61c5a4d0bd5d22808a641513cf26ed") {
    throw new Error("INVARIANT_HASH_NOT_SET: run seal step");
  }

  if (hash !== EXPECTED_HASH) {
    throw new Error("INVARIANT_TAMPERED: startup refused");
  }
}
