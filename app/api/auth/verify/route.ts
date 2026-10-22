import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { hashCode, MAX_ATTEMPTS, OWNER_COOKIE, sessionCookie } from "@/lib/owner";
import { deleteChallenge, getChallenge, updateChallenge } from "@/lib/store";

// Step 2: check the code and log the owner in for 30 days.
export async function POST(req: Request) {
  const { challenge, code } = (await req.json().catch(() => ({}))) as { challenge?: string; code?: string };
  const c = challenge ? await getChallenge(challenge) : null;
  if (!c || c.expires < Date.now()) return NextResponse.json({ error: "This code has expired. Ask for a new one." }, { status: 400 });
  if (c.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Too many wrong tries. Ask for a new code." }, { status: 429 });

  const a = Buffer.from(hashCode(c.id, String(code ?? "").replace(/\D/g, "")));
  const b = Buffer.from(c.hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await updateChallenge({ ...c, attempts: c.attempts + 1 });
    const left = MAX_ATTEMPTS - c.attempts - 1;
    return NextResponse.json({ error: left > 0 ? `That code isn't right. ${left} tries left.` : "Too many wrong tries. Ask for a new code." }, { status: 400 });
  }

  await deleteChallenge(c.id);
  const res = NextResponse.json({ ok: true });
  const s = sessionCookie(c.phone);
  res.cookies.set(OWNER_COOKIE, s.value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: s.maxAge });
  return res;
}
