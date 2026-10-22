import { NextResponse } from "next/server";
import { checkGaps } from "@/lib/ai";

// Quick look at what the owner said: returns up to 3 questions about missing or unclear
// essentials (name, prices) so we can ask before building instead of guessing.
export async function POST(req: Request) {
  const { transcript } = (await req.json().catch(() => ({}))) as { transcript?: string };
  const text = transcript?.trim() ?? "";
  if (text.length < 5) return NextResponse.json({ questions: [] });
  try {
    return NextResponse.json(await checkGaps(text.slice(0, 6000)));
  } catch (err) {
    console.error(err);
    // Never block building because the check failed.
    return NextResponse.json({ questions: [] });
  }
}
