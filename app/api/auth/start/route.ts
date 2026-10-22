import { NextResponse } from "next/server";
import { normaliseWhatsapp } from "@/lib/catalogue";
import { CODE_MINUTES, hashCode, newCode } from "@/lib/owner";
import { lastCodeSentAt, newId, saveChallenge, sitesForPhone } from "@/lib/store";
import { sendLoginCode, whatsappLoginReady } from "@/lib/whatsapp";

// Step 1 of owner login: send a 6-digit code to the WhatsApp number on their website.
export async function POST(req: Request) {
  if (!whatsappLoginReady())
    return NextResponse.json({ error: "WhatsApp login isn't set up yet. Use the private edit link you got when you published." }, { status: 503 });
  const { phone: input } = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = normaliseWhatsapp(input ?? "");
  if (!phone) return NextResponse.json({ error: "Enter the WhatsApp number on your website." }, { status: 400 });

  if (Date.now() - (await lastCodeSentAt(phone)) < 60_000)
    return NextResponse.json({ error: "We just sent a code. Wait a minute before asking for another." }, { status: 429 });
  if ((await sitesForPhone(phone)).length === 0)
    return NextResponse.json({ error: "No website uses this WhatsApp number. Check the number, or make a website first." }, { status: 404 });

  const id = newId();
  const code = newCode();
  try {
    await sendLoginCode(phone, code);
    await saveChallenge({ id, phone, hash: hashCode(id, code), expires: Date.now() + CODE_MINUTES * 60_000, attempts: 0, sentAt: Date.now() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't send the code on WhatsApp. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ challenge: id, phone: `+${phone.slice(0, 2)} ••••• ${phone.slice(-4)}` });
}
