import "server-only";

/* In-memory rate limiter and daily budget cap. Resets on process restart;
   for production swap the Map for Upstash Redis or similar. */

const PER_IP_MAX = 30;
const PER_IP_WINDOW_MS = 60 * 60 * 1000;        /* 1 hour */
const DAILY_BUDGET = 200;                        /* total summarize calls per UTC day */

type IpEntry = { count: number; resetAt: number };
const ipBuckets = new Map<string, IpEntry>();

let dayKey = utcDayKey();
let dayCount = 0;

function utcDayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export type LimitResult =
  | { ok: true }
  | { ok: false; reason: "ip"; retryAfterSec: number }
  | { ok: false; reason: "daily" };

export function checkAndIncrement(ip: string): LimitResult {
  /* Daily budget — global cap to keep the Anthropic bill bounded. */
  const today = utcDayKey();
  if (today !== dayKey) { dayKey = today; dayCount = 0; }
  if (dayCount >= DAILY_BUDGET) return { ok: false, reason: "daily" };

  /* Per-IP — 5 calls per hour, sliding window per IP. */
  const now = Date.now();
  const entry = ipBuckets.get(ip);
  if (!entry || entry.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + PER_IP_WINDOW_MS });
    dayCount += 1;
    return { ok: true };
  }
  if (entry.count >= PER_IP_MAX) {
    return { ok: false, reason: "ip", retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  dayCount += 1;
  return { ok: true };
}

/* Best-effort client IP from typical proxy headers, falling back to a
   constant so dev still works behind localhost. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}
