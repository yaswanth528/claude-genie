// JSON storage. With GITHUB_TOKEN + GITHUB_REPO set, every save is a commit under
// catalogues/ (git history is the undo trail). Otherwise files go to ./data/.
// Sites:  catalogues/<slug>.json
// Orders: catalogues/orders/<slug>/<id>.json
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Order, Site } from "./schema";

const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH = "main" } = process.env;
const useGitHub = Boolean(GITHUB_TOKEN && GITHUB_REPO);
const localRoot = join(process.cwd(), "data");

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const newEditKey = () => randomBytes(18).toString("base64url");
export const newId = () => `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

export function keyMatches(site: Site, key: string | null): boolean {
  if (!key) return false;
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(site.editKeyHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const validSlug = (slug: string) => /^[a-z0-9-]{1,60}$/.test(slug);

async function gh(path: string, init?: RequestInit) {
  return fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

async function readGitHub<T>(path: string): Promise<{ doc: T; sha: string } | null> {
  const res = await gh(`${path}?ref=${GITHUB_BRANCH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const body = (await res.json()) as { content: string; sha: string };
  return { doc: JSON.parse(Buffer.from(body.content, "base64").toString("utf8")), sha: body.sha };
}

async function readDoc<T>(path: string): Promise<T | null> {
  if (useGitHub) return (await readGitHub<T>(path))?.doc ?? null;
  try {
    return JSON.parse(await readFile(join(localRoot, path), "utf8"));
  } catch {
    return null;
  }
}

async function writeDoc(path: string, doc: unknown, message: string): Promise<void> {
  const json = JSON.stringify(doc, null, 2) + "\n";
  if (useGitHub) {
    const existing = await readGitHub(path);
    const res = await gh(path, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: Buffer.from(json).toString("base64"),
        branch: GITHUB_BRANCH,
        ...(existing ? { sha: existing.sha } : {}),
      }),
    });
    if (!res.ok) throw new Error(`GitHub save failed: ${res.status}`);
    return;
  }
  if (process.env.VERCEL)
    throw new Error("Saving needs GITHUB_TOKEN and GITHUB_REPO in Vercel → Settings → Environment Variables (then redeploy).");
  const file = join(localRoot, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, json);
}

async function listDocs<T>(dir: string): Promise<T[]> {
  if (useGitHub) {
    const res = await gh(`${dir}?ref=${GITHUB_BRANCH}`);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GitHub list failed: ${res.status}`);
    const entries = (await res.json()) as { name: string; path: string; type: string }[];
    const files = entries.filter((e) => e.type === "file" && e.name.endsWith(".json"));
    return (await Promise.all(files.map((f) => readDoc<T>(f.path)))).filter((d): d is Awaited<T> => d !== null) as T[];
  }
  try {
    const names = (await readdir(join(localRoot, dir))).filter((n) => n.endsWith(".json"));
    return (await Promise.all(names.map((n) => readDoc<T>(`${dir}/${n}`)))).filter((d): d is Awaited<T> => d !== null) as T[];
  } catch {
    return [];
  }
}

// Pages saved before websites had themes were plain product lists; give them defaults.
function upgrade(doc: Site): Site {
  if (doc.theme) return doc;
  const old = doc as unknown as { tagline?: string | null; items: Site["items"] };
  return {
    ...doc,
    category: doc.category ?? "",
    siteType: "static",
    theme: { id: "bazaar", accent: 1, heroStyle: "split" },
    headline: doc.businessName,
    subheadline: old.tagline ?? "Order on WhatsApp.",
    about: null,
    highlights: [],
    area: null,
    address: null,
    hours: null,
    hero: null,
    gallery: [],
    items: old.items.map((it) => ({ ...it, description: it.description ?? "", image: it.image ?? null })),
  };
}

export async function getSite(slug: string): Promise<Site | null> {
  const doc = validSlug(slug) ? await readDoc<Site>(`catalogues/${slug}.json`) : null;
  return doc ? upgrade(doc) : null;
}

export async function saveSite(site: Site, message: string): Promise<void> {
  if (!validSlug(site.slug)) throw new Error("Invalid page name");
  await writeDoc(`catalogues/${site.slug}.json`, site, message);
}

export async function saveOrder(order: Order): Promise<void> {
  if (!validSlug(order.slug)) throw new Error("Invalid page name");
  await writeDoc(`catalogues/orders/${order.slug}/${order.id}.json`, order, `New order on ${order.slug}`);
}

export async function listOrders(slug: string): Promise<Order[]> {
  if (!validSlug(slug)) return [];
  const orders = await listDocs<Order>(`catalogues/orders/${slug}`);
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
