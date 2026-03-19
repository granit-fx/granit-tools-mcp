/**
 * Simple in-memory rate limiter for Cloudflare Workers.
 *
 * Uses a sliding window counter per IP. State lives in the Worker isolate
 * and resets on cold start — this is intentional: it limits burst abuse
 * without needing KV writes (which would add latency and cost).
 *
 * Not a security measure against determined attackers (they can rotate IPs).
 * It protects against accidental retry storms and naive bots.
 */

const windows = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS = 60;   // per window
const WINDOW_MS = 60_000;  // 1 minute

// Cleanup stale entries every 5 minutes to avoid memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 300_000;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of windows) {
    if (now > entry.resetAt) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  let entry = windows.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(ip, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    resetAt: entry.resetAt,
  };
}
