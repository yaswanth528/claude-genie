// JSON document storage with three backends, chosen automatically:
//   1. Cloudflare D1, when CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN are set (lib/d1.ts)
//   2. GitHub, when GITHUB_TOKEN + GITHUB_REPO are set: every save is a commit under catalogues/
//   3. Local files under ./data (development)
// Set STORAGE=github or STORAGE=local to force a backend.
// Paths: sites "catalogues/<slug>.json", orders "catalogues/orders/<slug>/<id>.json".
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { d1Ready, query } from "./d1";
import type { Order, Site } from "./schema";

const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH = "main" } = process.env;
const githubReady = () => Boolean(GITHUB_TOKEN && GITHUB_REPO) && process.env.STORAGE !== "local";
export const backend = (): "d1" | "github" | "local" => (d1Ready() ? "d1" : githubReady() ? "github" : "local");
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

// ---------- GitHub ----------

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

async function listGitHub(dir: string): Promise<string[]> {
  const res = await gh(`${dir}?ref=${GITHUB_BRANCH}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list failed: ${res.status}`);
  const entries = (await res.json()) as { name: string; path: string; type: string }[];
  return entries.filter((e) => e.type === "file" && e.name.endsWith(".json")).map((e) => e.path);
}

// ---------- Generic documents ----------

async function readDoc<T>(path: string): Promise<T | null> {
  switch (backend()) {
    case "d1": {
      const rows = await query<{ body: string }>("SELECT body FROM docs WHERE path = ?", [path]);
      return rows[0] ? (JSON.parse(rows[0].body) as T) : null;
    }
    case "github":
      return (await readGitHub<T>(path))?.doc ?? null;
    default:
      try {
        return JSON.parse(await readFile(join(localRoot, path), "utf8"));
      } catch {
        return null;
      }
  }
}

async function writeDoc(path: string, doc: unknown, message: string): Promise<void> {
  const json = JSON.stringify(doc, null, 2) + "\n";
  switch (backend()) {
    case "d1":
      await query(
        "INSERT INTO docs (path, body, updated_at) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at",
        [path, json, new Date().toISOString()],
      );
      return;
    case "github": {
      const existing = await readGitHub(path);
      const res = await gh(path, {
        method: "PUT",
        body: JSON.stringify({ message, content: Buffer.from(json).toString("base64"), branch: GITHUB_BRANCH, ...(existing ? { sha: existing.sha } : {}) }),
      });
      if (!res.ok) throw new Error(`GitHub save failed: ${res.status}`);
      return;
    }
    default: {
      if (process.env.VERCEL)
        throw new Error("Saving needs Cloudflare (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN) or GitHub storage in Vercel → Settings → Environment Variables (then redeploy).");
      const file = join(localRoot, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, json);
    }
  }
}

async function deleteDoc(path: string): Promise<void> {
  switch (backend()) {
    case "d1":
      await query("DELETE FROM docs WHERE path = ?", [path]);
      return;
    case "github": {
      const existing = await readGitHub(path);
      if (!existing) return;
      const res = await gh(path, { method: "DELETE", body: JSON.stringify({ message: `Delete ${path}`, sha: existing.sha, branch: GITHUB_BRANCH }) });
      if (!res.ok) throw new Error(`GitHub delete failed: ${res.status}`);
      return;
    }
    default:
      await rm(join(localRoot, path), { force: true });
  }
}

// Paths of the JSON documents directly inside a folder (not in subfolders).
async function listPaths(dir: string): Promise<string[]> {
  switch (backend()) {
    case "d1": {
      const rows = await query<{ path: string }>("SELECT path FROM docs WHERE path LIKE ? AND path NOT LIKE ?", [`${dir}/%`, `${dir}/%/%`]);
      return rows.map((r) => r.path);
    }
    case "github":
      return listGitHub(dir);
    default:
      try {
        return (await readdir(join(localRoot, dir))).filter((n) => n.endsWith(".json")).map((n) => `${dir}/${n}`);
      } catch {
        return [];
      }
  }
}

async function listDocs<T>(dir: string): Promise<T[]> {
  if (backend() === "d1") {
    const rows = await query<{ body: string }>("SELECT body FROM docs WHERE path LIKE ? AND path NOT LIKE ?", [`${dir}/%`, `${dir}/%/%`]);
    return rows.map((r) => JSON.parse(r.body) as T);
  }
  const docs = await Promise.all((await listPaths(dir)).map((p) => readDoc<T>(p)));
  return docs.filter((d): d is Awaited<T> => d !== null) as T[];
}

// ---------- Sites and orders ----------

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

export async function listSites(): Promise<Site[]> {
  return (await listDocs<Site>("catalogues")).map(upgrade).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteSite(slug: string): Promise<void> {
  if (!validSlug(slug)) throw new Error("Invalid page name");
  for (const path of await listPaths(`catalogues/orders/${slug}`)) await deleteDoc(path);
  await deleteDoc(`catalogues/${slug}.json`);
  if (backend() === "d1") await query("DELETE FROM visits WHERE slug = ?", [slug]);
}

export async function saveOrder(order: Order): Promise<void> {
  if (!validSlug(order.slug)) throw new Error("Invalid page name");
  await writeDoc(`catalogues/orders/${order.slug}/${order.id}.json`, order, `New order on ${order.slug}`);
}

export async function getOrder(slug: string, id: string): Promise<Order | null> {
  if (!validSlug(slug) || !/^[a-z0-9-]{6,40}$/.test(id)) return null;
  return readDoc<Order>(`catalogues/orders/${slug}/${id}.json`);
}

export async function listOrders(slug: string): Promise<Order[]> {
  if (!validSlug(slug)) return [];
  const orders = await listDocs<Order>(`catalogues/orders/${slug}`);
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- Login codes (short-lived; stored with the other documents) ----------

export type Challenge = { id: string; phone: string; hash: string; expires: number; attempts: number; sentAt: number };
const challengePath = (id: string) => `catalogues/auth/${id}.json`;
const lastSentPath = (phone: string) => `catalogues/auth/last-${phone}.json`;

export async function saveChallenge(c: Challenge): Promise<void> {
  await writeDoc(challengePath(c.id), c, "Login code");
  await writeDoc(lastSentPath(c.phone), { at: c.sentAt }, "Login code");
}
export const getChallenge = (id: string) => (/^[a-z0-9-]{8,40}$/.test(id) ? readDoc<Challenge>(challengePath(id)) : Promise.resolve(null));
export const updateChallenge = (c: Challenge) => writeDoc(challengePath(c.id), c, "Login attempt");
export const deleteChallenge = (id: string) => deleteDoc(challengePath(id));
export async function lastCodeSentAt(phone: string): Promise<number> {
  return (await readDoc<{ at: number }>(lastSentPath(phone)))?.at ?? 0;
}

export async function sitesForPhone(phone: string): Promise<Site[]> {
  return (await listSites()).filter((s) => s.whatsapp === phone);
}

// ---------- Visits (D1 or local only; a commit per visit on GitHub would be too much) ----------

const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // India date

export async function countVisit(slug: string): Promise<void> {
  if (!validSlug(slug)) return;
  const b = backend();
  if (b === "d1") {
    await query("INSERT INTO visits (slug, day, count) VALUES (?, ?, 1) ON CONFLICT(slug, day) DO UPDATE SET count = count + 1", [slug, today()]);
  } else if (b === "local") {
    const file = join(localRoot, "visits.json");
    let all: Record<string, Record<string, number>> = {};
    try {
      all = JSON.parse(await readFile(file, "utf8"));
    } catch {}
    all[slug] ??= {};
    all[slug][today()] = (all[slug][today()] ?? 0) + 1;
    await mkdir(localRoot, { recursive: true });
    await writeFile(file, JSON.stringify(all));
  }
}

export async function visitsByDay(slug: string, days: number): Promise<{ day: string; count: number }[] | null> {
  const since = new Date(Date.now() + 5.5 * 3600 * 1000 - (days - 1) * 86400000).toISOString().slice(0, 10);
  const b = backend();
  let rows: { day: string; count: number }[] = [];
  if (b === "d1") rows = await query<{ day: string; count: number }>("SELECT day, count FROM visits WHERE slug = ? AND day >= ? ORDER BY day", [slug, since]);
  else if (b === "local") {
    try {
      const all = JSON.parse(await readFile(join(localRoot, "visits.json"), "utf8")) as Record<string, Record<string, number>>;
      rows = Object.entries(all[slug] ?? {}).map(([day, count]) => ({ day, count })).filter((r) => r.day >= since);
    } catch {}
  } else return null; // not tracked on GitHub storage
  // Fill missing days with zero so charts have every day.
  const map = new Map(rows.map((r) => [r.day, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(Date.parse(since) + i * 86400000).toISOString().slice(0, 10);
    return { day, count: map.get(day) ?? 0 };
  });
}

// ---------- One-time move from GitHub to the current backend ----------

export async function importFromGitHub(): Promise<{ sites: number; orders: number }> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) throw new Error("GitHub isn't configured, so there's nothing to import.");
  if (backend() === "github") throw new Error("Storage is already GitHub.");
  let sites = 0;
  let orders = 0;
  for (const path of await listGitHub("catalogues")) {
    const doc = await readGitHub<Site>(path);
    if (!doc) continue;
    await writeDoc(path, doc.doc, "import");
    sites++;
    for (const opath of await listGitHub(`catalogues/orders/${doc.doc.slug}`)) {
      const o = await readGitHub(opath);
      if (o) {
        await writeDoc(opath, o.doc, "import");
        orders++;
      }
    }
  }
  return { sites, orders };
}
