"use client";
import { use, useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { MicButton } from "@/components/MicButton";
import { SiteEditor } from "@/components/SiteEditor";
import { LANGUAGES } from "@/components/useSpeech";
import { formatPrice } from "@/lib/catalogue";
import type { Order, Patch, Product, SiteContent } from "@/lib/schema";

type Snapshot = { businessName: string; items: Product[] };
type Preview = { patch: Patch; before: Snapshot; after: Snapshot; errors: string[] };
type Owner = SiteContent & { slug: string; whatsapp: string; updatedAt: string; canUndo: boolean };
type Tab = "voice" | "site" | "orders";

export default function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [current, setCurrent] = useState<Owner | null>(null);
  const [form, setForm] = useState<Owner | null>(null);
  const [tab, setTab] = useState<Tab>("voice");
  const [lang, setLang] = useState("English");
  const [request, setRequest] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The key lives in the URL fragment so it never reaches server logs.
  useEffect(() => setKey(new URLSearchParams(window.location.hash.slice(1)).get("key")), []);
  const onText = useCallback((t: string) => setRequest(t), []);

  const call = useCallback(
    async (path: string, method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(path, {
          method,
          headers: { "Content-Type": "application/json", "x-edit-key": key ?? "" },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? data.errors?.join(" ") ?? "Something went wrong");
          return null;
        }
        return data;
      } catch {
        setError("Network error. Try again.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [key],
  );

  const loaded = (d: Owner) => {
    setCurrent(d);
    setForm(d);
  };

  useEffect(() => {
    if (key) call(`/api/pages/${slug}`, "GET").then((d) => d && loaded(d));
  }, [key, call, slug]);

  useEffect(() => {
    if (tab === "orders" && key) call(`/api/orders/${slug}`, "GET").then((d) => d && setOrders(d.orders));
  }, [tab, key, call, slug]);

  async function previewEdit() {
    setNotice(null);
    const data = await call(`/api/pages/${slug}`, "POST", { request });
    if (data) setPreview(data);
  }

  async function approve() {
    if (!preview) return;
    const data = await call(`/api/pages/${slug}`, "PUT", { patch: preview.patch });
    if (data) {
      loaded(data);
      setPreview(null);
      setRequest("");
      setNotice("Done. Your website is updated.");
    }
  }

  async function saveForm() {
    if (!form) return;
    const { slug: _s, whatsapp: _w, updatedAt: _u, canUndo: _c, ...content } = form;
    const data = await call(`/api/pages/${slug}`, "PUT", { content });
    if (data) {
      loaded(data);
      setNotice("Saved. Your website is updated.");
    }
  }

  async function undo() {
    setPreview(null);
    const data = await call(`/api/pages/${slug}`, "DELETE");
    if (data) {
      loaded(data);
      setNotice("Undone. Your website is back to how it was before the last change.");
    }
  }

  if (key === undefined) return null;
  if (key === null)
    return (
      <main className="narrow">
        <Logo />
        <p style={{ marginTop: 24 }}>Open this page using the private edit link you got when you published.</p>
      </main>
    );

  const changed = (after: Product) => {
    const b = preview?.before.items.find((x) => x.name === after.name);
    return !b || b.price !== after.price;
  };
  const removed = (before: Product) => !preview?.after.items.some((x) => x.name === before.name);
  const hasChanges = preview && preview.patch.ops.length > 0;
  const formDirty = form && current && JSON.stringify(form) !== JSON.stringify(current);

  return (
    <main className="narrow wide">
      <Logo />
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{current?.businessName ?? "Your website"}</h1>
        <div className="row tight" style={{ marginTop: 0 }}>
          {current?.canUndo && (
            <button className="btn ghost sm" onClick={undo} disabled={busy}>
              ↶ Undo last change
            </button>
          )}
          <a className="btn ghost sm" href={`/p/${slug}`} target="_blank" rel="noreferrer">
            View website ↗
          </a>
        </div>
      </div>

      <div className="seg tabs" role="tablist">
        <button role="tab" aria-selected={tab === "voice"} className={tab === "voice" ? "on" : ""} onClick={() => setTab("voice")}>
          Voice edit
        </button>
        <button role="tab" aria-selected={tab === "site"} className={tab === "site" ? "on" : ""} onClick={() => setTab("site")}>
          Edit website
        </button>
        {current?.siteType === "dynamic" && (
          <button role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>
            Orders
          </button>
        )}
      </div>

      {error && (
        <div className="errors">
          <p>{error}</p>
        </div>
      )}
      {notice && <div className="success">{notice}</div>}

      {tab === "voice" && (
        <>
          {current && (
            <div className="card" style={{ marginTop: 16 }}>
              <ul className="plain">
                {current.items.map((it, i) => (
                  <li key={i}>
                    <span>{it.name}</span>
                    <span>{formatPrice(it.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="hint" style={{ marginTop: 16 }}>
            Say something like “change the cotton kurti price to 849”, “remove dupatta” or “add bedsheet for 650”.
          </p>
          <label htmlFor="lang">Language</label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.name} value={l.name}>
                {l.label}
              </option>
            ))}
          </select>
          <MicButton language={lang} onText={onText} />
          <label htmlFor="req">What we heard (you can edit or type)</label>
          <textarea id="req" value={request} onChange={(e) => setRequest(e.target.value)} />
          <div className="row">
            <button className="btn" onClick={previewEdit} disabled={busy || !request.trim()}>
              {busy && !preview ? "Working it out…" : "Show me the change"}
            </button>
          </div>

          {preview?.patch.ambiguity && <div className="notice">{preview.patch.ambiguity}</div>}
          {preview && !hasChanges && !preview.patch.ambiguity && (
            <div className="notice">We didn’t find anything to change. Try naming the product and the new price.</div>
          )}
          {hasChanges && (
            <>
              <div className="diff">
                <div className="card">
                  <h3>Before</h3>
                  <ul>
                    {preview.before.items.map((it, i) => (
                      <li key={i} className={removed(it) ? "changed removed" : ""}>
                        {it.name} — {formatPrice(it.price)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card">
                  <h3>After</h3>
                  {preview.after.businessName !== preview.before.businessName && <p>Name: {preview.after.businessName}</p>}
                  <ul>
                    {preview.after.items.map((it, i) => (
                      <li key={i} className={changed(it) ? "changed" : ""}>
                        {it.name} — {formatPrice(it.price)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {preview.errors.length > 0 && (
                <div className="errors">
                  {preview.errors.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              )}
              <div className="row">
                <button className="btn" onClick={approve} disabled={busy || preview.errors.length > 0}>
                  {busy ? "Saving…" : "Approve and update"}
                </button>
                <button className="btn ghost" onClick={() => setPreview(null)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </>
      )}

      {tab === "site" && form && (
        <>
          <SiteEditor value={form} onChange={setForm} language={lang} />
          <div className="publish-bar">
            <div className="row">
              <button className="btn" onClick={saveForm} disabled={busy || !formDirty}>
                {busy ? "Saving…" : "Save changes"}
              </button>
              {formDirty && (
                <button className="btn ghost" onClick={() => setForm(current)} disabled={busy}>
                  Discard
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "orders" && (
        <div style={{ marginTop: 16 }}>
          {orders === null ? (
            <p className="hint">Loading orders…</p>
          ) : orders.length === 0 ? (
            <div className="card">
              <p>No orders yet. When customers check out on your website, their orders appear here.</p>
            </div>
          ) : (
            <div className="orders">
              {orders.map((o) => (
                <article key={o.id} className="card order">
                  <header>
                    <strong>{o.customer.name}</strong>
                    <span className="hint">{new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </header>
                  <ul className="plain">
                    {o.lines.map((l, i) => (
                      <li key={i}>
                        <span>
                          {l.name} × {l.qty}
                        </span>
                        <span>{formatPrice((l.price ?? 0) * l.qty)}</span>
                      </li>
                    ))}
                    <li>
                      <strong>Total</strong>
                      <strong>{formatPrice(o.total)}</strong>
                    </li>
                  </ul>
                  <p className="hint">
                    {o.customer.phone} · {o.customer.address}
                    {o.customer.note ? ` · “${o.customer.note}”` : ""}
                  </p>
                  <a className="btn wa sm" href={`https://wa.me/${o.customer.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer">
                    WhatsApp {o.customer.name.split(" ")[0]}
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
