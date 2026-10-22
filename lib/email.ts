// Emails to shop owners (new orders, renewal reminders) through Brevo's free plan, which
// works with a single verified sender address (no domain needed). Off unless
// BREVO_API_KEY and ALERT_FROM_EMAIL are set; sending never blocks the action that caused it.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailReady = () => Boolean(process.env.BREVO_API_KEY && process.env.ALERT_FROM_EMAIL);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendEmail(to: string | null | undefined, subject: string, lines: string[], link?: { label: string; url: string }): Promise<void> {
  if (!emailReady() || !to || !EMAIL_RE.test(to)) return;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1d1d1d">${lines
    .map((l) => (l ? `<p style="margin:0 0 6px">${esc(l)}</p>` : "<br>"))
    .join("")}${
    link ? `<p style="margin:16px 0"><a href="${esc(link.url)}" style="background:#c24a2e;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700">${esc(link.label)}</a></p>` : ""
  }<p style="color:#5f5a52;font-size:12px;margin-top:20px">Sent by SiteGenie</p></div>`;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.ALERT_FROM_EMAIL, name: process.env.ALERT_FROM_NAME || "SiteGenie" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: [...lines, link ? `${link.label}: ${link.url}` : ""].join("\n"),
      }),
    });
    if (!res.ok) console.error("Email failed:", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("Email failed:", (err as Error).message);
  }
}
