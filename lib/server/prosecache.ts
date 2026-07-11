// In-memory prose cache — the cost guard for the AI reading layer.
//
// A reading is deterministic per (inputs, locale), but the client fetches
// prose on every entitled page view; without a cache each revisit of the SAME
// couple would re-bill a full model call. Caching by input hash makes the
// model cost ~one call per paid couple per locale (a few cents), instead of
// per view. Per-instance and lost on redeploy — acceptable: worst case is one
// extra generation after a deploy. Move to Redis/Postgres when a ledger lands.

import crypto from "crypto";

const MAX_ENTRIES = 500;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Entry {
  value: unknown;
  at: number;
}

const cache = new Map<string, Entry>();

export function proseCacheKey(parts: unknown[]): string {
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function proseCacheGet<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  // LRU touch: re-insert so iteration order reflects recency.
  cache.delete(key);
  cache.set(key, e);
  return e.value as T;
}

/** Only successful generations are cached — a null (model failure/timeout)
 *  must retry next view rather than pinning the template fallback for 7 days. */
export function proseCacheSet(key: string, value: unknown): void {
  if (value == null) return;
  if (cache.size >= MAX_ENTRIES) {
    // Evict the oldest (first-inserted / least recently touched).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, at: Date.now() });
}
