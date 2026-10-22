import { NextResponse } from "next/server";
import { extractCatalogue } from "@/lib/claude";

export async function POST(req: Request) {
  const { transcript } = (await req.json()) as { transcript?: string };
  const text = transcript?.trim() ?? "";
  if (text.length < 5) return NextResponse.json({ error: "Say or type a bit more about your products." }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "That's too long — about 20 seconds is enough." }, { status: 400 });
  try {
    return NextResponse.json(await extractCatalogue(text));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message || "Extraction failed" }, { status: 502 });
  }
}
