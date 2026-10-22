// Payment rules and deploying a site to its own hosting.
import { deployToPages } from "./cloudflare";
import { PRICES } from "./prices";
import type { Site } from "./schema";
import { renderStandalone } from "./standalone";
import { saveSite } from "./store";


// What the owner has to pay now for their current site type.
export function amountDue(site: Site): number {
  const paid = site.payment;
  if (!paid) return PRICES[site.siteType];
  if (site.siteType === "dynamic" && paid.plan === "static") return PRICES.dynamic - PRICES.static; // upgrade
  return 0;
}

export const paymentMode = (): "test" | "live" | "off" =>
  process.env.PAYMENT_MODE === "live" ? "live" : process.env.PAYMENT_MODE === "off" ? "off" : "test";

export async function deploySite(site: Site, appOrigin: string): Promise<Site> {
  const { project, url } = await deployToPages(site.slug, renderStandalone(site, appOrigin));
  const now = new Date().toISOString();
  const next: Site = { ...site, live: { provider: "cloudflare", project, url, deployedAt: now, updatedAt: site.updatedAt } };
  await saveSite(next, `Deploy ${site.slug} to ${url}`);
  return next;
}

export const appOrigin = (req: Request) => process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
