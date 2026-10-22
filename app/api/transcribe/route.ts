import { NextResponse } from "next/server";
import { supportedAudioType, transcribeAudio } from "@/lib/ai";

const MAX_BYTES = 4 * 1024 * 1024; // ~4 MB keeps us under Vercel's request limit; 60 s of speech is far less

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the recording as form data." }, { status: 400 });
  }
  const audio = form.get("audio");
  const language = String(form.get("language") || "Kannada").slice(0, 40);
  if (!(audio instanceof Blob) || audio.size === 0)
    return NextResponse.json({ error: "We didn't get any audio. Try recording again." }, { status: 400 });
  if (audio.size > MAX_BYTES)
    return NextResponse.json({ error: "That recording is too long. About 20 seconds is enough." }, { status: 413 });
  const mime = supportedAudioType(audio.type);
  if (!mime) return NextResponse.json({ error: `This browser's audio format (${audio.type}) isn't supported.` }, { status: 415 });

  try {
    const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const transcript = await transcribeAudio(base64, mime, language);
    if (!transcript) return NextResponse.json({ error: "We couldn't hear any speech. Try again a little closer to the phone." }, { status: 422 });
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message || "Transcription failed" }, { status: 502 });
  }
}
