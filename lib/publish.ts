// Payment rules and deploying a site to its own hosting.
import { deployToPages } from "./cloudflare";
import { PRICES } from "./prices";
import type { Site } from "./schema";
import { renderStandalone } from "./standalone";
import { ConflictError, getSiteRev, saveSite } from "./store";


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
  const { project, url } = await deployToPages(site.slug, await renderStandalone(site, appOrigin));
  const live = { provider: "cloudflare" as const, project, url, deployedAt: new Date().toISOString(), updatedAt: site.updatedAt };
  // Record the deploy on the newest saved version, so a deploy never undoes a newer edit.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { site: latest, rev } = await getSiteRev(site.slug);
    if (!latest) break;
    const next: Site = { ...latest, live };
    try {
      await saveSite(next, `Deploy ${site.slug} to ${url}`, rev);
      return next;
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
    }
  }
  return { ...site, live };
}

export const appOrigin = (req: Request) => process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
