// Owner login by WhatsApp code, and the one rule for "may this request edit this site":
// either the site's private edit key, or a logged-in session for the site's WhatsApp number.
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { Site } from "./schema";
import { keyMatches } from "./store";

export const OWNER_COOKIE = "sg_owner";
const SESSION_DAYS = 30;
export const CODE_MINUTES = 10;
export const MAX_ATTEMPTS = 5;

// Secret for signing sessions. Set AUTH_SECRET; otherwise derived from other server secrets.
function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.GEMINI_API_KEY || process.env.CLOUDFLARE_API_TOKEN || process.env.GITHUB_TOKEN;
  if (!s) throw new Error("Set AUTH_SECRET to enable owner login.");
  return createHash("sha256").update(`sitegenie-owner:${s}`).digest("hex");
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const hashCode = (challenge: string, code: string) => sign(`code:${challenge}:${code}`);

export function sessionCookie(phone: string): { value: string; maxAge: number } {
  const payload = Buffer.from(JSON.stringify({ phone, exp: Date.now() + SESSION_DAYS * 86400000 })).toString("base64url");
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_DAYS * 86400 };
}

export function sessionPhone(req: Request): string | null {
  const raw = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${OWNER_COOKIE}=`))?.slice(OWNER_COOKIE.length + 1);
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;
  try {
    const a = Buffer.from(mac);
    const b = Buffer.from(sign(payload));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const { phone, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { phone: string; exp: number };
    return exp > Date.now() ? phone : null;
  } catch {
    return null;
  }
}

export function canEdit(req: Request, site: Site): boolean {
  return keyMatches(site, req.headers.get("x-edit-key")) || sessionPhone(req) === site.whatsapp;
}
