// Cloudflare D1 (SQLite) over Cloudflare's REST API, so the app can use it from Vercel.
// The database is found or created automatically (name: CLOUDFLARE_D1_NAME, default
// "sitegenie"); set CLOUDFLARE_D1_DATABASE_ID to pin a specific one.
const API = "https://api.cloudflare.com/client/v4";
const account = () => process.env.CLOUDFLARE_ACCOUNT_ID;
const token = () => process.env.CLOUDFLARE_API_TOKEN;

export const d1Ready = () => Boolean(account() && token() && process.env.STORAGE !== "github" && process.env.STORAGE !== "local");

type CfResponse<T> = { success: boolean; errors: { code: number; message: string }[]; result: T };

async function cf<T>(path: string, init: RequestInit = {}): Promise<CfResponse<T>> {
  const res = await fetch(`${API}/accounts/${account()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  return (await res.json().catch(() => ({ success: false, errors: [{ code: res.status, message: res.statusText }] }))) as CfResponse<T>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, body TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS visits (slug TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (slug, day))`,
];

let dbIdPromise: Promise<string> | null = null;

async function databaseId(): Promise<string> {
  if (process.env.CLOUDFLARE_D1_DATABASE_ID) return process.env.CLOUDFLARE_D1_DATABASE_ID;
  const name = process.env.CLOUDFLARE_D1_NAME || "sitegenie";
  const found = await cf<{ uuid: string; name: string }[]>(`/d1/database?name=${encodeURIComponent(name)}`);
  if (!found.success) throw new Error(`Cloudflare D1: ${found.errors.map((e) => e.message).join("; ")} (does the API token have D1 Edit?)`);
  let id = found.result.find((d) => d.name === name)?.uuid;
  if (!id) {
    const created = await cf<{ uuid: string }>("/d1/database", { method: "POST", body: JSON.stringify({ name }) });
    if (!created.success) throw new Error(`Cloudflare D1: couldn't create the database (${created.errors.map((e) => e.message).join("; ")})`);
    id = created.result.uuid;
  }
  for (const sql of SCHEMA) await raw(id, sql, []);
  return id;
}

async function raw<T>(id: string, sql: string, params: unknown[]): Promise<T[]> {
  const res = await cf<{ results: T[]; success: boolean }[]>(`/d1/database/${id}/query`, {
    method: "POST",
    body: JSON.stringify({ sql, params }),
  });
  if (!res.success) throw new Error(`Cloudflare D1 query failed: ${res.errors.map((e) => e.message).join("; ")}`);
  return res.result[0]?.results ?? [];
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  dbIdPromise ??= databaseId().catch((err) => {
    dbIdPromise = null; // retry next time
    throw err;
  });
  return raw<T>(await dbIdPromise, sql, params);
}
