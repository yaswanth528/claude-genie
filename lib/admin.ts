// Admin access: one password (ADMIN_PASSWORD). Logging in sets an httpOnly cookie holding
// an HMAC of the password, so the password itself is never stored in the browser.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "sg_admin";
const token = (password: string) => createHmac("sha256", password).update("sitegenie-admin-v1").digest("base64url");

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);

export function passwordMatches(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD ?? "";
  const a = Buffer.from(token(input));
  const b = Buffer.from(token(real));
  return adminEnabled() && a.length === b.length && timingSafeEqual(a, b);
}

export const sessionValue = () => token(process.env.ADMIN_PASSWORD ?? "");

export function isAdmin(req: Request): boolean {
  if (!adminEnabled()) return false;
  const cookie = req.headers.get("cookie") ?? "";
  const value = cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? "";
  const a = Buffer.from(value);
  const b = Buffer.from(sessionValue());
  return a.length === b.length && timingSafeEqual(a, b);
}
