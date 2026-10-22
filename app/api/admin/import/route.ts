import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { importFromGitHub } from "@/lib/store";

export const maxDuration = 300;

// One-time copy of shops and orders from GitHub into the current storage (Cloudflare D1).
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    return NextResponse.json(await importFromGitHub());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
