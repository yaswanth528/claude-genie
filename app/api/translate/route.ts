import { NextResponse } from "next/server";
import { limit } from "@/lib/ratelimit";
import { translateSite } from "@/lib/ai";
import { cleanContent } from "@/lib/draft";

const LABELS: Record<string, string> = {
  Kannada: "ಕನ್ನಡ",
  Hindi: "हिन्दी",
  Tamil: "தமிழ்",
  Telugu: "తెలుగు",
  Malayalam: "മലയാളം",
  Marathi: "मराठी",
  English: "English",
};

// Create a second-language version of a website (one AI call, on request).
export async function POST(req: Request) {
  const stop = await limit(req, "translate");
  if (stop) return stop;
  const body = (await req.json().catch(() => ({}))) as { content?: unknown; language?: string };
  const language = typeof body.language === "string" && LABELS[body.language] ? body.language : null;
  if (!language) return NextResponse.json({ error: "Pick a language." }, { status: 400 });
  const { content } = cleanContent(body.content);
  try {
    const t = await translateSite(content, language);
    return NextResponse.json({ translation: { ...t, language, label: LABELS[language] } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message || "Couldn't translate." }, { status: 502 });
  }
}
