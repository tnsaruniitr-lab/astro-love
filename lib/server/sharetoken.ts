// PII-safe share tokens. The legacy ?r= link base64-encodes both people's
// name, exact birth date/time and coordinates in cleartext — special-category-
// adjacent PII that ends up in browser history, referrers, clipboards and
// inboxes. This wraps that payload in AES-256-GCM so a shared link is opaque;
// only the server (holding the key) can read it.
//
// Stateless: the token IS the ciphertext, so no database is needed. Legacy
// ?r= links keep working (decoded client-side), but new shares use ?s=.
//
// Key: SHARE_SECRET, else ENTITLEMENT_SECRET, else an ephemeral per-boot key
// (tokens then don't survive a restart — set the env var in production).

import crypto from "crypto";

function key(): Buffer {
  const secret = process.env.SHARE_SECRET || process.env.ENTITLEMENT_SECRET;
  if (secret) return crypto.createHash("sha256").update(secret).digest();
  // Ephemeral fallback — stable within a process so a token minted and opened
  // in the same server lifetime round-trips.
  return EPHEMERAL_KEY;
}
const EPHEMERAL_KEY = crypto.randomBytes(32);
if (!process.env.SHARE_SECRET && !process.env.ENTITLEMENT_SECRET) {
  // Fail fast at RUNTIME only, never during `next build` (see entitlement.ts).
  const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.NODE_ENV === "production" && !IS_BUILD) {
    // An ephemeral key means share links minted before a restart / on another
    // instance fail to decrypt, so every shared reading silently unfurls as the
    // generic card — killing the acquisition loop.
    throw new Error("SHARE_SECRET (or ENTITLEMENT_SECRET) must be set in production for stable encrypted share links.");
  }
  console.warn("[sharetoken] no SHARE_SECRET/ENTITLEMENT_SECRET (dev) — encrypted share links won't survive a restart.");
}

/** Encrypt an inner payload string (the legacy r-token) into an opaque token. */
export function encodeShare(inner: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(inner, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64url");
}

/** Decrypt an opaque token back to the inner payload, or null if tampered. */
export function decodeShare(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 12 + 16 + 1) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
