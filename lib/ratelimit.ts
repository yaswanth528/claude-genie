// Fair-use limits per device (IP address), counted in Cloudflare D1 (or in memory for
// local development). If the counter itself fails, requests are allowed: a database
// hiccup should never lock real owners out.
import { NextResponse } from "next/server";
import { d1Ready, query } from "./d1";

const memory = new Map<string, { start: number; count: number }>();

export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

// Counts one request for `key`; true if it's within `limit` per `windowSec`.
async function hit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expired = now - windowSec;
  try {
    let count: number;
    let start: number;
    if (d1Ready()) {
      const rows = await query<{ count: number; window_start: number }>(
        `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count + 1 END,
           window_start = CASE WHEN rate_limits.window_start <= ? THEN excluded.window_start ELSE rate_limits.window_start END
         RETURNING count, window_start`,
        [key, now, expired, expired],
      );
      count = rows[0]?.count ?? 1;
      start = rows[0]?.window_start ?? now;
    } else {
      const m = memory.get(key);
      const fresh = !m || m.start <= expired;
      const next = fresh ? { start: now, count: 1 } : { start: m!.start, count: m!.count + 1 };
      memory.set(key, next);
      count = next.count;
      start = next.start;
    }
    return { ok: count <= limit, retryAfter: Math.max(1, start + windowSec - now) };
  } catch (err) {
    console.error("rate limit check failed (allowing):", (err as Error).message);
    return { ok: true, retryAfter: 0 };
  }
}

type Rule = { limit: number; windowSec: number };

// Named limits, one place to tune them.
export const LIMITS = {
  build: { limit: 6, windowSec: 3600 },
  buildAll: { limit: Number(process.env.BUILD_DAILY_LIMIT) || 300, windowSec: 86400 }, // everyone together, protects the Gemini quota
  check: { limit: 30, windowSec: 3600 },
  translate: { limit: 10, windowSec: 3600 },
  transcribe: { limit: 30, windowSec: 3600 },
  voiceEdit: { limit: 30, windowSec: 3600 },
  upload: { limit: 40, windowSec: 3600 },
  publish: { limit: 20, windowSec: 3600 },
  order: { limit: 10, windowSec: 600 },
  adminLogin: { limit: 10, windowSec: 900 },
  loginCode: { limit: 10, windowSec: 3600 },
  loginVerify: { limit: 20, windowSec: 3600 },
} satisfies Record<string, Rule>;

const MESSAGES: Partial<Record<keyof typeof LIMITS, string>> = {
  buildAll: "SiteGenie is very busy today. Please try again tomorrow.",
  adminLogin: "Too many tries. Wait a few minutes and try again.",
};

// Returns a 429 response when over the limit, otherwise null. Use: `const stop = await limit(...); if (stop) return stop;`
export async function limit(req: Request, name: keyof typeof LIMITS, opts: { global?: boolean; cors?: Record<string, string> } = {}) {
  const rule = LIMITS[name];
  const key = opts.global ? `${name}:all` : `${name}:${clientIp(req)}`;
  const r = await hit(key, rule.limit, rule.windowSec);
  if (r.ok) return null;
  const mins = Math.ceil(r.retryAfter / 60);
  const msg = MESSAGES[name] ?? `You've done this a lot just now. Please wait ${mins > 1 ? `${mins} minutes` : "a minute"} and try again.`;
  return NextResponse.json({ error: msg, errors: [msg] }, { status: 429, headers: { "Retry-After": String(r.retryAfter), ...(opts.cors ?? {}) } });
}
