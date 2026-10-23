"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { formatPrice } from "@/lib/catalogue";
import type { Live, Payment } from "@/lib/schema";
import "./admin.css";

type Row = {
  slug: string;
  businessName: string;
  siteType: "static" | "dynamic";
  theme: string;
  products: number;
  whatsapp: string;
  updatedAt: string;
  payment: Payment | null;
  live: Live | null;
  orders: number | null;
};

type Filter = "all" | "paid" | "unpaid" | "live" | "dynamic" | "static";
type Sort = "recent" | "name" | "orders";
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["live", "Live"],
  ["paid", "Paid"],
  ["unpaid", "Not paid"],
  ["dynamic", "Online store"],
  ["static", "Showcase"],
];

const date = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [storage, setStorage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [open, setOpen] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sites");
    if (res.status === 401) return setState("login");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return setState("login");
    }
    setRows(data.sites);
    setStorage(data.backend);
    setState("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setPassword("");
    load();
  }

  async function remove(r: Row) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sites?slug=${encodeURIComponent(r.slug)}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setNotice(`Deleted ${r.businessName || r.slug}.`);
    setOpen(null);
    setRows((x) => x.filter((y) => y.slug !== r.slug));
  }

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.payment);
    const live = rows.filter((r) => r.live);
    const dynamic = rows.filter((r) => r.siteType === "dynamic");
    const revenue = paid.reduce((s, r) => s + (r.payment?.amount ?? 0), 0);
    const testRevenue = paid.some((r) => r.payment?.mode === "test");
    const orders = rows.reduce((s, r) => s + (r.orders ?? 0), 0);
    // Shops changed per day, last 14 days.
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    const activity = days.map((d) => ({
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      n: rows.filter((r) => {
        const t = new Date(r.updatedAt);
        return t >= d && t.getTime() < d.getTime() + 86400000;
      }).length,
    }));
    const themes = Object.entries(rows.reduce<Record<string, number>>((m, r) => ((m[r.theme] = (m[r.theme] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
    return { paid, live, dynamic, revenue, testRevenue, orders, activity, themes };
  }, [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (needle && !`${r.businessName} ${r.slug} ${r.whatsapp}`.toLowerCase().includes(needle)) return false;
      if (filter === "paid") return !!r.payment;
      if (filter === "unpaid") return !r.payment;
      if (filter === "live") return !!r.live;
      if (filter === "dynamic" || filter === "static") return r.siteType === filter;
      return true;
    });
    return list.sort((a, b) =>
      sort === "name" ? a.businessName.localeCompare(b.businessName) : sort === "orders" ? (b.orders ?? 0) - (a.orders ?? 0) : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [rows, q, filter, sort]);

  function exportCsv() {
    const head = ["name", "slug", "type", "theme", "products", "whatsapp", "paid_amount", "payment_mode", "live_url", "orders", "updated_at"];
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = shown.map((r) =>
      [r.businessName, r.slug, r.siteType, r.theme, r.products, `+${r.whatsapp}`, r.payment?.amount ?? "", r.payment?.mode ?? "", r.live?.url ?? "", r.orders ?? "", r.updatedAt].map(cell).join(","),
    );
    const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `sitegenie-shops-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (state === "loading")
    return (
      <div className="ad-login">
        <p className="ad-muted">Loading…</p>
      </div>
    );

  if (state === "login")
    return (
      <div className="ad-login">
        <form onSubmit={login} className="ad-login-card">
          <Logo tone="light" />
          <h1>Admin</h1>
          <p className="ad-muted">Sign in to see every shop.</p>
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          {error && <p className="ad-error">{error}</p>}
          <button className="ad-btn primary block">Sign in</button>
        </form>
      </div>
    );

  const max = Math.max(1, ...stats.activity.map((a) => a.n));
  const funnel: [string, number][] = [
    ["Websites made", rows.length],
    ["Put live", stats.live.length],
    ["Paid", stats.paid.length],
  ];

  return (
    <div className="ad">
      <header className="ad-bar">
        <div className="ad-bar-row">
          <Logo tone="light" />
          <span className="ad-bar-title">Admin</span>
          <span className="ad-storage">
            <i className={storage === "d1" ? "ok" : "warn"} /> {storage === "d1" ? "Cloudflare D1" : storage === "github" ? "GitHub" : "Local files"}
          </span>
          <button
            className="ad-btn ghost sm"
            onClick={async () => {
              await fetch("/api/admin/login", { method: "DELETE" });
              setState("login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="ad-main">
        <section className="ad-hero">
          <h1>Overview</h1>
          <p className="ad-muted">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </section>

        {error && <p className="ad-banner error">{error}</p>}
        {notice && <p className="ad-banner ok">{notice}</p>}

        <section className="ad-kpis">
          <div className="ad-kpi">
            <span>Websites</span>
            <strong>{rows.length}</strong>
            <em>{stats.dynamic.length} online stores</em>
          </div>
          <div className="ad-kpi">
            <span>Live</span>
            <strong>{stats.live.length}</strong>
            <em>{pct(stats.live.length, rows.length)}% of websites</em>
          </div>
          <div className="ad-kpi">
            <span>Revenue</span>
            <strong>{formatPrice(stats.revenue)}</strong>
            <em>{stats.paid.length} paid{stats.testRevenue ? " · includes test" : ""}</em>
          </div>
          <div className="ad-kpi dark">
            <span>Orders</span>
            <strong>{stats.orders}</strong>
            <em>across all online stores</em>
          </div>
        </section>

        <section className="ad-grid">
          <div className="ad-card">
            <h2>Funnel</h2>
            <div className="ad-funnel">
              {funnel.map(([label, n], i) => (
                <div key={label} className="ad-funnel-row">
                  <div className="ad-funnel-label">
                    <span>{label}</span>
                    <strong>{n}</strong>
                  </div>
                  <div className="ad-track">
                    <div className="ad-fill" style={{ width: `${Math.max(2, pct(n, rows.length))}%`, opacity: 1 - i * 0.22 }} />
                  </div>
                  {i > 0 && <p className="ad-muted small">{pct(n, funnel[i - 1][1])}% of the step before</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="ad-card">
            <h2>Activity</h2>
            <p className="ad-muted small">Websites created or changed, last 14 days</p>
            <div className="ad-bars" role="img" aria-label="Websites changed per day over the last 14 days">
              {stats.activity.map((a) => (
                <div key={a.label} className="ad-bar-col" title={`${a.label}: ${a.n}`}>
                  <div className="ad-bar-fill" style={{ height: `${(a.n / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="ad-bars-axis">
              <span>{stats.activity[0].label}</span>
              <span>Today</span>
            </div>
          </div>

          <div className="ad-card">
            <h2>Mix</h2>
            <div className="ad-split" aria-label="Showcase vs online store">
              <div style={{ flex: Math.max(1, rows.length - stats.dynamic.length) }} className="s">
                Showcase · {rows.length - stats.dynamic.length}
              </div>
              <div style={{ flex: Math.max(1, stats.dynamic.length) }} className="d">
                Store · {stats.dynamic.length}
              </div>
            </div>
            <ul className="ad-themes">
              {stats.themes.map(([t, n]) => (
                <li key={t}>
                  <span>{t}</span>
                  <strong>{n}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="ad-shops">
          <div className="ad-shops-head">
            <h2>Shops</h2>
            <div className="ad-tools">
              <input className="ad-search" type="search" aria-label="Search shops" placeholder="Search name, link or phone" value={q} onChange={(e) => setQ(e.target.value)} />
              <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="recent">Recent</option>
                <option value="name">Name</option>
                <option value="orders">Most orders</option>
              </select>
              <button className="ad-btn ghost sm" onClick={exportCsv} disabled={!shown.length}>
                Export CSV
              </button>
            </div>
          </div>
          <div className="ad-filters" role="group" aria-label="Filter shops">
            {FILTERS.map(([f, label]) => (
              <button key={f} className={filter === f ? "on" : ""} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {label}
              </button>
            ))}
          </div>

          <div className="ad-list">
            {shown.map((r) => (
              <button key={r.slug} className="ad-row" onClick={() => setOpen(r)}>
                <span className="ad-avatar" aria-hidden="true">
                  {(r.businessName || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="ad-row-main">
                  <strong>{r.businessName || "(no name)"}</strong>
                  <small>
                    {r.siteType === "dynamic" ? "Online store" : "Showcase"} · {r.products} products · {ago(r.updatedAt)}
                  </small>
                </span>
                <span className="ad-row-tags">
                  {r.live && <span className="ad-tag live">Live</span>}
                  {r.payment ? <span className={`ad-tag ${r.payment.mode === "test" ? "test" : "paid"}`}>{r.payment.mode === "test" ? "Test paid" : "Paid"}</span> : <span className="ad-tag">Not paid</span>}
                  {r.orders ? <span className="ad-tag">{r.orders} orders</span> : null}
                </span>
                <span className="ad-chev" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
            {shown.length === 0 && <p className="ad-empty">{rows.length ? "No shops match." : "No shops yet."}</p>}
          </div>
        </section>
      </main>

      {open && <Drawer row={open} busy={busy} onClose={() => setOpen(null)} onDelete={() => remove(open)} />}
    </div>
  );
}

function Drawer({ row: r, busy, onClose, onDelete }: { row: Row; busy: boolean; onClose: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const facts: [string, React.ReactNode][] = [
    ["Type", r.siteType === "dynamic" ? "Online store" : "Showcase"],
    ["Theme", r.theme],
    ["Products", r.products],
    ["WhatsApp", `+${r.whatsapp}`],
    ["Payment", r.payment ? `${formatPrice(r.payment.amount)} · ${r.payment.mode}${r.payment.paidUntil ? ` · until ${r.payment.paidUntil.slice(0, 10)}` : ""}` : "Not paid"],
    ["Orders", r.orders ?? "—"],
    ["Updated", date(r.updatedAt)],
    ["Link", r.slug],
  ];
  return (
    <div className="ad-drawer-wrap" role="dialog" aria-modal="true" aria-labelledby="ad-drawer-title">
      <button className="ad-scrim" onClick={onClose} aria-label="Close" />
      <aside className="ad-drawer">
        <div className="ad-drawer-head">
          <span className="ad-avatar lg" aria-hidden="true">
            {(r.businessName || "?").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2 id="ad-drawer-title">{r.businessName || "(no name)"}</h2>
            <p className="ad-muted small">{r.live ? "Live" : "Not live"}</p>
          </div>
          <button className="ad-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ad-drawer-actions">
          {r.live && (
            <a className="ad-btn primary" href={r.live.url} target="_blank" rel="noreferrer">
              Open live site ↗
            </a>
          )}
          <a className="ad-btn ghost" href={`/p/${r.slug}`} target="_blank" rel="noreferrer">
            Preview ↗
          </a>
          <a className="ad-btn ghost" href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noreferrer">
            WhatsApp owner ↗
          </a>
        </div>
        <dl className="ad-facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="ad-danger">
          <h3>Delete this shop</h3>
          <p className="ad-muted small">Removes its data and orders{r.live ? " and takes its website offline" : ""}. This can’t be undone.</p>
          {confirm ? (
            <div className="ad-confirm">
              <button className="ad-btn danger" onClick={onDelete} disabled={busy}>
                {busy ? "Deleting…" : "Yes, delete it"}
              </button>
              <button className="ad-btn ghost" onClick={() => setConfirm(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="ad-btn ghost danger-text" onClick={() => setConfirm(true)}>
              Delete…
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
