// Catalogue storage. With GITHUB_TOKEN + GITHUB_REPO set, each save is a commit
// to catalogues/<slug>.json (git history is the undo). Otherwise ./data/catalogues.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Catalogue } from "./schema";

const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH = "main" } = process.env;
const useGitHub = Boolean(GITHUB_TOKEN && GITHUB_REPO);
const localDir = join(process.cwd(), "data", "catalogues");

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const newEditKey = () => randomBytes(18).toString("base64url");

export function keyMatches(catalogue: Catalogue, key: string | null): boolean {
  if (!key) return false;
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(catalogue.editKeyHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const validSlug = (slug: string) => /^[a-z0-9-]{1,60}$/.test(slug);

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

async function readGitHub(slug: string): Promise<{ catalogue: Catalogue; sha: string } | null> {
  const res = await gh(`catalogues/${slug}.json?ref=${GITHUB_BRANCH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const body = (await res.json()) as { content: string; sha: string };
  return { catalogue: JSON.parse(Buffer.from(body.content, "base64").toString("utf8")), sha: body.sha };
}

export async function getCatalogue(slug: string): Promise<Catalogue | null> {
  if (!validSlug(slug)) return null;
  if (useGitHub) return (await readGitHub(slug))?.catalogue ?? null;
  try {
    return JSON.parse(await readFile(join(localDir, `${slug}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function saveCatalogue(catalogue: Catalogue, message: string): Promise<void> {
  if (!validSlug(catalogue.slug)) throw new Error("Invalid page name");
  const json = JSON.stringify(catalogue, null, 2) + "\n";
  if (useGitHub) {
    const existing = await readGitHub(catalogue.slug);
    const res = await gh(`catalogues/${catalogue.slug}.json`, {
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
  await mkdir(localDir, { recursive: true });
  await writeFile(join(localDir, `${catalogue.slug}.json`), json);
}
