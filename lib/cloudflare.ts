// Deploys a customer's website to its own Cloudflare Pages project (<name>.pages.dev).
// The whole site ships as a single _worker.js that serves the generated HTML, so one
// API call deploys it — no per-file asset upload.
const API = "https://api.cloudflare.com/client/v4";

export const cloudflareReady = () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

type CfResponse<T> = { success: boolean; errors: { code: number; message: string }[]; result: T };

async function cf<T>(path: string, init: RequestInit = {}): Promise<CfResponse<T>> {
  const res = await fetch(`${API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, ...init.headers },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({ success: false, errors: [{ code: res.status, message: res.statusText }] }))) as CfResponse<T>;
  return body;
}

// Pages project names: lowercase letters, digits and hyphens, at most 58 characters.
export const projectName = (slug: string) => `sg-${slug}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 58).replace(/-+$/, "");

async function ensureProject(name: string): Promise<string> {
  const existing = await cf<{ subdomain: string }>(`/pages/projects/${name}`);
  if (existing.success) return existing.result.subdomain;
  const created = await cf<{ subdomain: string }>("/pages/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, production_branch: "main" }),
  });
  if (!created.success) throw new Error(`Cloudflare: couldn't create the site (${created.errors.map((e) => e.message).join("; ")})`);
  return created.result.subdomain;
}

function workerFor(html: string) {
  return `const HTML = ${JSON.stringify(html)};
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\\nAllow: /\\n", { headers: { "content-type": "text/plain" } });
    return new Response(HTML, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" },
    });
  },
};`;
}

export async function deployToPages(slug: string, html: string): Promise<{ project: string; url: string }> {
  if (!cloudflareReady())
    throw new Error("Website hosting isn't set up. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to the environment variables.");
  const name = projectName(slug);
  const subdomain = await ensureProject(name);

  const form = new FormData();
  form.append("manifest", "{}");
  form.append("branch", "main");
  form.append("_worker.js", new Blob([workerFor(html)], { type: "application/javascript+module" }), "_worker.js");
  const deployed = await cf<{ url: string }>(`/pages/projects/${name}/deployments`, { method: "POST", body: form });
  if (!deployed.success) throw new Error(`Cloudflare: deployment failed (${deployed.errors.map((e) => e.message).join("; ")})`);
  return { project: name, url: `https://${subdomain}` };
}
