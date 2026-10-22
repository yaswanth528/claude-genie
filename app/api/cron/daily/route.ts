// Daily maintenance, run by Vercel Cron (vercel.json) at 3 am India time.
// Only runs with the CRON_SECRET that Vercel sends as "Authorization: Bearer <secret>".
import { del, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { formatPrice } from "@/lib/catalogue";
import { sendEmail } from "@/lib/email";
import { blobEnabled } from "@/lib/media";
import { YEARLY, renewalState } from "@/lib/prices";
import { appOrigin } from "@/lib/publish";
import type { Site } from "@/lib/schema";
import { cleanupAuth, cleanupRateLimits, commitToGitHub, exportAll, listSites, saveSite } from "@/lib/store";

export const maxDuration = 300;

const UNUSED_AFTER_DAYS = 2;

function mediaUrls(sites: Site[]): Set<string> {
  const urls = new Set<string>();
  for (const s of sites) {
    for (const m of [s.hero, ...s.gallery, ...s.items.map((i) => i.image)]) if (m?.url) urls.add(m.url);
    for (const h of s.history ?? []) for (const m of [h.content.hero, ...h.content.gallery, ...h.content.items.map((i) => i.image)]) if (m?.url) urls.add(m.url);
  }
  return urls;
}

// Deletes uploads and saved stock photos that no website (or its undo history) uses.
async function cleanupMedia(sites: Site[]): Promise<number> {
  if (!blobEnabled()) return 0;
  const used = mediaUrls(sites);
  const cutoff = Date.now() - UNUSED_AFTER_DAYS * 86400000;
  let removed = 0;
  for (const prefix of ["uploads/", "generated/"]) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      const unused = page.blobs.filter((b) => new Date(b.uploadedAt).getTime() < cutoff && !used.has(b.url)).map((b) => b.url);
      if (unused.length) await del(unused);
      removed += unused.length;
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  return removed;
}

// One reminder per renewal, 30 days before a dynamic plan's year ends.
async function renewalReminders(sites: Site[], origin: string): Promise<number> {
  let sent = 0;
  for (const s of sites) {
    const until = s.payment?.paidUntil;
    if (!until || !s.ownerEmail || s.renewalReminderSentFor === until || renewalState(s.payment, s.siteType) !== "due") continue;
    const date = new Date(until).toLocaleDateString("en-IN", { dateStyle: "long" });
    await sendEmail(
      s.ownerEmail,
      `Renew online orders for ${s.businessName} by ${date}`,
      [
        `Your yearly plan for online orders on ${s.businessName} ends on ${date}.`,
        `Renew for ${formatPrice(YEARLY)} to keep taking orders on your website. Your website stays online either way.`,
      ],
      { label: "Renew now", url: `${origin}/p/${s.slug}/edit` },
    );
    await saveSite({ ...s, renewalReminderSentFor: until }, `Renewal reminder for ${s.slug}`).catch(() => {});
    sent++;
  }
  return sent;
}

async function backup(force: boolean): Promise<string | null> {
  const india = new Date(Date.now() + 5.5 * 3600 * 1000);
  if (!force && india.getUTCDay() !== 0) return null; // Sundays
  const data = await exportAll();
  if (!data) return null;
  const day = india.toISOString().slice(0, 10);
  const ok = await commitToGitHub(`backups/${day}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), ...data }), `Backup ${day}`);
  return ok ? `backups/${day}.json (${data.docs.length} documents)` : null;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Set CRON_SECRET to enable the daily job." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const report: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      report[name] = await fn();
    } catch (err) {
      console.error(`daily job: ${name} failed`, err);
      report[name] = `failed: ${(err as Error).message}`;
    }
  };

  const sites = await listSites();
  await step("expiredLoginCodes", cleanupAuth);
  await step("rateLimits", async () => (await cleanupRateLimits(), "cleaned"));
  await step("unusedMedia", () => cleanupMedia(sites));
  await step("renewalReminders", () => renewalReminders(sites, appOrigin(req)));
  await step("backup", () => backup(new URL(req.url).searchParams.get("backup") === "now"));
  return NextResponse.json({ ok: true, sites: sites.length, ...report });
}
