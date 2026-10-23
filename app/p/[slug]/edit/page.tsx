"use client";
import { use, useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { MicButton } from "@/components/MicButton";
import { AccountPanel } from "@/components/AccountPanel";
import { Insights } from "@/components/Insights";
import { OrderCard } from "@/components/OrderCard";
import { PayPanel } from "@/components/PayPanel";
import { SharePanel } from "@/components/SharePanel";
import { AmbientBg } from "@/components/AmbientBg";
import { ReviseMic } from "@/components/ReviseMic";
import { SiteView } from "@/components/site/SiteView";
import { SiteEditor } from "@/components/SiteEditor";
import { LANGUAGES } from "@/components/useSpeech";
import { formatPrice } from "@/lib/catalogue";
import type { Live, Order, OrderStatus, Patch, Payment, Product, SiteContent } from "@/lib/schema";

type Snapshot = { businessName: string; items: Product[] };
type Preview = { patch: Patch; before: Snapshot; after: Snapshot; errors: string[] };
type Owner = SiteContent & {
  slug: string;
  whatsapp: string;
  updatedAt: string;
  canUndo: boolean;
  payment: Payment | null;
  live: Live | null;
  due: number;
  ownerEmail: string | null;
  renewal: { state: "none" | "active" | "due" | "grace" | "lapsed"; paidUntil: string | null; due: number };
};
type Tab = "voice" | "site" | "orders" | "share" | "insights";

export default function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [current, setCurrent] = useState<Owner | null>(null);
  const [form, setForm] = useState<Owner | null>(null);
  const [tab, setTab] = useState<Tab>("voice");
  const [lang, setLang] = useState("English");
  const [request, setRequest] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [orders, setOrders] = useState<(Order & { status: OrderStatus })[] | null>(null);
  const [orderFilter, setOrderFilter] = useState<"open" | "all">("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The key lives in the URL fragment so it never reaches server logs.
  useEffect(() => setKey(new URLSearchParams(window.location.hash.slice(1)).get("key") ?? ""), []);
  const [denied, setDenied] = useState(false);
  const [loginAvailable, setLoginAvailable] = useState(false);
  useEffect(() => {
    if (denied) fetch("/api/auth/me").then((r) => r.json()).then((d) => setLoginAvailable(!!d.loginAvailable)).catch(() => {});
  }, [denied]);
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
    if (key === undefined || key === null) return;
    fetch(`/api/pages/${slug}`, { headers: { "x-edit-key": key } })
      .then(async (r) => (r.ok ? loaded(await r.json()) : setDenied(true)))
      .catch(() => setError("Network error. Try again."));
  }, [key, slug]);

  useEffect(() => {
    if (tab === "orders" && key !== undefined && key !== null) call(`/api/orders/${slug}`, "GET").then((d) => d && setOrders(d.orders));
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
    const { slug: _s, whatsapp: _w, updatedAt: _u, canUndo: _c, payment: _p, live: _l, due: _d, ownerEmail: _e, renewal: _r, ...content } = form;
    const data = await call(`/api/pages/${slug}`, "PUT", { content });
    if (data) {
      loaded(data);
      setNotice("Saved. Your website is updated.");
    }
  }

  async function pushLive() {
    const data = await call(`/api/deploy/${slug}`, "POST");
    if (data && current) {
      setCurrent({ ...current, live: data.live });
      setForm((f) => (f ? { ...f, live: data.live } : f));
      setNotice("Your live website is updated.");
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

  if (key === undefined || key === null) return null;
  if (denied)
    return (
      <main className="narrow ed">
        <Logo />
        <h1>Open your private edit link</h1>
        <p className="hint">
          To edit this website, open the private edit link you got when you published it (it ends with “#key=…”).
          {loginAvailable && " Or log in with the WhatsApp number on this website."}
        </p>
        {loginAvailable && (
          <div className="row">
            <a className="btn" href="/login">
              Log in with WhatsApp
            </a>
          </div>
        )}
      </main>
    );

  const changed = (after: Product) => {
    const b = preview?.before.items.find((x) => x.name === after.name);
    return !b || b.price !== after.price || (b.badge ?? null) !== (after.badge ?? null) || (b.inStock !== false) !== (after.inStock !== false);
  };
  // "· Bestseller", "· Out of stock": what a voice edit can change besides the price.
  const tags = (it: Product) =>
    [it.badge ? { bestseller: "Bestseller", new: "New", offer: "Offer" }[it.badge] : null, it.inStock === false ? "Out of stock" : null]
      .filter(Boolean)
      .map((t) => ` · ${t}`)
      .join("");
  const removed = (before: Product) => !preview?.after.items.some((x) => x.name === before.name);
  const hasChanges = preview && preview.patch.ops.length > 0;
  const formDirty = form && current && JSON.stringify(form) !== JSON.stringify(current);

  return (
    <>
    <AmbientBg />
    <main className="narrow wide ed">
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
            Preview ↗
          </a>
        </div>
      </div>

      {current && <LiveStatus owner={current} busy={busy} onPush={pushLive} />}
      {current && current.due === 0 && (
        <AccountPanel
          key={`${current.updatedAt}-${current.ownerEmail}`}
          slug={slug}
          editKey={key}
          renewal={current.renewal}
          ownerEmail={current.ownerEmail}
          onChanged={() => call(`/api/pages/${slug}`, "GET").then((d) => d && loaded(d))}
        />
      )}
      {current && current.due > 0 && (
        <PayPanel
          slug={slug}
          editKey={key}
          siteType={current.siteType}
          due={current.due}
          upgrade={!!current.payment}
          onLive={(l) => {
            call(`/api/pages/${slug}`, "GET").then((d) => d && loaded(d));
            setNotice(`Your website is live at ${l.url}`);
          }}
        />
      )}

      {!current && <p className="hint loading">Opening your website…</p>}
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
        <button role="tab" aria-selected={tab === "insights"} className={tab === "insights" ? "on" : ""} onClick={() => setTab("insights")}>
          Insights
        </button>
        <button role="tab" aria-selected={tab === "share"} className={tab === "share" ? "on" : ""} onClick={() => setTab("share")}>
          Share
        </button>
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
            Say something like “change the cotton kurti price to 849”, “remove dupatta”, “add bedsheet for 650”, “silk saree is sold out” or “mark mysore pak as bestseller”.
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
            <button className="btn" onClick={previewEdit} disabled={busy || !request.trim()} aria-busy={busy && !preview}>
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
                        {tags(it)}
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
                        {tags(it)}
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
                <button className="btn" onClick={approve} disabled={busy || preview.errors.length > 0} aria-busy={busy}>
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
          <ReviseMic value={form} onChange={setForm} language={lang} onLanguage={setLang} />
          {formDirty && (
            <details className="edit-preview" open>
              <summary>Preview of your changes (not saved yet)</summary>
              <div className="device phone">
                <div className="device-scroll">
                  <SiteView site={{ ...form, whatsapp: current?.whatsapp ?? "", slug }} preview />
                </div>
              </div>
            </details>
          )}
          <SiteEditor value={form} onChange={setForm} language={lang} />
          <div className="publish-bar">
            <div className="row">
              <button className="btn" onClick={saveForm} disabled={busy || !formDirty} aria-busy={busy}>
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

      {tab === "insights" && current && (
        <div style={{ marginTop: 16 }}>
          <Insights slug={slug} editKey={key} dynamic={current.siteType === "dynamic"} />
        </div>
      )}

      {tab === "share" && current && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong>Tell your customers</strong>
          {!current.live && <p className="hint">Your website isn’t live yet, so this uses your preview link.</p>}
          <SharePanel
            url={current.live?.url ?? `${window.location.origin}/p/${slug}`}
            businessName={current.businessName}
            headline={current.headline}
            themeId={current.theme.id}
            accent={current.theme.accent}
          />
        </div>
      )}

      {tab === "orders" && (
        <div style={{ marginTop: 16 }}>
          {orders === null ? (
            <p className="hint loading">Loading orders…</p>
          ) : orders.length === 0 ? (
            <div className="card">
              <p>No orders yet. When customers check out on your website, their orders appear here.</p>
            </div>
          ) : (
            <>
              <div className="seg" role="group" aria-label="Show orders" style={{ marginBottom: 12 }}>
                {(["open", "all"] as const).map((f) => (
                  <button key={f} className={orderFilter === f ? "on" : ""} onClick={() => setOrderFilter(f)}>
                    {f === "open" ? `Open (${orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length})` : `All (${orders.length})`}
                  </button>
                ))}
              </div>
              <div className="orders">
                {orders
                  .filter((o) => orderFilter === "all" || !["delivered", "cancelled"].includes(o.status))
                  .map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      slug={slug}
                      editKey={key}
                      businessName={current?.businessName ?? ""}
                      products={current?.items ?? []}
                      onSaved={(next) => setOrders((list) => (list ?? []).map((x) => (x.id === next.id ? next : x)))}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
    </>
  );
}

function LiveStatus({ owner, busy, onPush }: { owner: Owner; busy: boolean; onPush: () => void }) {
  if (!owner.live)
    return owner.payment ? (
      <div className="card live-card">
        <span className="pill warn">Paid · not live yet</span>
        <button className="btn" onClick={onPush} disabled={busy} aria-busy={busy}>
          {busy ? "Putting it live…" : "Put my website live"}
        </button>
      </div>
    ) : null;
  const behind = owner.live.updatedAt !== owner.updatedAt;
  return (
    <div className="card live-card">
      <div className="row tight" style={{ marginTop: 0, justifyContent: "space-between" }}>
        <span className={`pill ${behind ? "warn" : "ok"}`}>{behind ? "Changes not live yet" : "Live"}</span>
        <span className="hint small">Last put live {new Date(owner.live.deployedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      <a className="live-url" href={owner.live.url} target="_blank" rel="noreferrer">
        {owner.live.url} ↗
      </a>
      {behind && owner.due === 0 && (
        <button className="btn" onClick={onPush} disabled={busy} aria-busy={busy}>
          {busy ? "Updating…" : "Update live website"}
        </button>
      )}
    </div>
  );
}
