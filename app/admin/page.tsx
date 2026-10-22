"use client";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { formatPrice } from "@/lib/catalogue";
import type { Live, Payment } from "@/lib/schema";

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

const date = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [storage, setStorage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

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
    if (!window.confirm(`Delete "${r.businessName}" (${r.slug})? This removes its data and orders${r.live ? " and takes its website offline" : ""}. This can't be undone.`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sites?slug=${encodeURIComponent(r.slug)}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setNotice(`Deleted ${r.businessName}.`);
    setRows((x) => x.filter((y) => y.slug !== r.slug));
  }

  async function importGitHub() {
    if (!window.confirm("Copy all shops and orders from GitHub into the current storage? Existing entries with the same name are overwritten.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/import", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setNotice(`Imported ${data.sites} shops and ${data.orders} orders.`);
    load();
  }

  if (state === "loading") return <main className="narrow"><Logo /><p className="hint" style={{ marginTop: 24 }}>Loading…</p></main>;

  if (state === "login")
    return (
      <main className="narrow">
        <Logo />
        <h1>Admin</h1>
        <form onSubmit={login}>
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="errors"><p>{error}</p></div>}
          <div className="row">
            <button className="btn">Log in</button>
          </div>
        </form>
      </main>
    );

  const shown = rows.filter((r) => !q || `${r.businessName} ${r.slug} ${r.whatsapp}`.toLowerCase().includes(q.toLowerCase()));
  const paid = rows.filter((r) => r.payment);
  const revenue = paid.reduce((s, r) => s + (r.payment?.amount ?? 0), 0);

  return (
    <main className="admin">
      <header className="admin-head">
        <Logo />
        <div className="row tight" style={{ marginTop: 0 }}>
          <span className="hint small">Storage: {storage === "d1" ? "Cloudflare D1" : storage === "github" ? "GitHub" : "local files"}</span>
          {storage === "d1" && (
            <button className="btn ghost sm" onClick={importGitHub} disabled={busy}>
              Import from GitHub
            </button>
          )}
          <button
            className="btn ghost sm"
            onClick={async () => {
              await fetch("/api/admin/login", { method: "DELETE" });
              setState("login");
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="tiles">
        <div className="tile"><span>Shops</span><strong>{rows.length}</strong></div>
        <div className="tile"><span>Paid</span><strong>{paid.length}</strong><em>{formatPrice(revenue)} {paid.some((r) => r.payment?.mode === "test") ? "(includes test payments)" : ""}</em></div>
        <div className="tile"><span>Live websites</span><strong>{rows.filter((r) => r.live).length}</strong></div>
        <div className="tile"><span>Dynamic shops</span><strong>{rows.filter((r) => r.siteType === "dynamic").length}</strong></div>
      </div>

      {error && <div className="errors"><p>{error}</p></div>}
      {notice && <div className="success">{notice}</div>}

      <input aria-label="Search shops" placeholder="Search by name, link or phone" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: "16px 0 8px" }} />

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Type</th>
              <th>Payment</th>
              <th>Website</th>
              <th>Orders</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.slug}>
                <td>
                  <strong>{r.businessName || "(no name)"}</strong>
                  <div className="hint small">
                    {r.slug} · +{r.whatsapp} · {r.products} products · {r.theme}
                  </div>
                </td>
                <td>{r.siteType}</td>
                <td>
                  {r.payment ? (
                    <span className={`pill ${r.payment.mode === "test" ? "warn" : "ok"}`}>
                      {formatPrice(r.payment.amount)} {r.payment.mode}
                    </span>
                  ) : (
                    <span className="hint small">Not paid</span>
                  )}
                </td>
                <td>
                  {r.live ? (
                    <a href={r.live.url} target="_blank" rel="noreferrer">
                      {r.live.url.replace("https://", "")}
                    </a>
                  ) : (
                    <span className="hint small">Not live</span>
                  )}
                  <div>
                    <a className="hint small" href={`/p/${r.slug}`} target="_blank" rel="noreferrer">
                      Preview ↗
                    </a>
                  </div>
                </td>
                <td>{r.orders ?? "—"}</td>
                <td className="hint small">{date(r.updatedAt)}</td>
                <td>
                  <button className="btn ghost sm danger" onClick={() => remove(r)} disabled={busy}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="hint" style={{ padding: 16 }}>No shops yet.</p>}
      </div>
    </main>
  );
}
