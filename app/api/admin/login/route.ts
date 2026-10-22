import { NextResponse } from "next/server";
import { limit } from "@/lib/ratelimit";
import { adminEnabled, COOKIE, passwordMatches, sessionValue } from "@/lib/admin";

export async function POST(req: Request) {
  const stop = await limit(req, "adminLogin");
  if (stop) return stop;
  if (!adminEnabled()) return NextResponse.json({ error: "Admin is off. Set ADMIN_PASSWORD (8+ characters) in the environment variables." }, { status: 503 });
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !passwordMatches(password)) return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sessionValue(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 7 * 86400 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
