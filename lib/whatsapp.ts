// Sends login codes through the WhatsApp Cloud API (Meta) using an AUTHENTICATION
// template with a copy-code button. Meta only allows codes (not links) in login messages.
// Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID; the template defaults to Meta's
// sample "verification_code" in en_US.
export const whatsappLoginReady = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

export async function sendLoginCode(phone: string, code: string): Promise<void> {
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "verification_code",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en_US" },
        // The code must appear twice: in the body and in the copy-code button.
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`WhatsApp: ${err.error?.message ?? res.statusText}`);
  }
}
