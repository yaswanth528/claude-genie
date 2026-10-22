"use client";
import { use, useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { MicButton } from "@/components/MicButton";
import { LANGUAGES } from "@/components/useSpeech";
import { formatPrice } from "@/lib/catalogue";
import type { Item, Patch } from "@/lib/schema";

type Snapshot = { businessName: string; items: Item[] };
type Preview = { patch: Patch; before: Snapshot; after: Snapshot; errors: string[] };
type Current = Snapshot & { updatedAt: string; canUndo: boolean };

export default function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [current, setCurrent] = useState<Current | null>(null);
  const [lang, setLang] = useState("Kannada");
  const [request, setRequest] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The key lives in the URL fragment so it never reaches server logs.
  useEffect(() => setKey(new URLSearchParams(window.location.hash.slice(1)).get("key")), []);
  const onText = useCallback((t: string) => setRequest(t), []);

  const call = useCallback(
    async (method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/pages/${slug}`, {
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
    [key, slug],
  );

  useEffect(() => {
    if (key) call("GET").then((d) => d && setCurrent(d));
  }, [key, call]);

  async function previewEdit() {
    setNotice(null);
    const data = await call("POST", { request });
    if (data) setPreview(data);
  }

  async function approve() {
    if (!preview) return;
    const data = await call("PUT", { patch: preview.patch });
    if (data) {
      setCurrent(data);
      setPreview(null);
      setRequest("");
      setNotice("Done. Your page is updated.");
    }
  }

  async function undo() {
    setPreview(null);
    const data = await call("DELETE");
    if (data) {
      setCurrent(data);
      setNotice("Undone. Your page is back to how it was before the last change.");
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

  const changed = (after: Item) => {
    const b = preview?.before.items.find((x) => x.name === after.name);
    return !b || b.price !== after.price;
  };
  const removed = (before: Item) => !preview?.after.items.some((x) => x.name === before.name);
  const hasChanges = preview && preview.patch.ops.length > 0;

  return (
    <main className="narrow">
      <Logo />
      <h1>Change your page by voice</h1>
      <p className="hint">Example: “change the cotton kurti price to 849” or “remove dupatta”.</p>

      {current && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row" style={{ marginTop: 0, justifyContent: "space-between", alignItems: "center" }}>
            <strong>{current.businessName}</strong>
            <a className="hint" href={`/p/${slug}`} target="_blank" rel="noreferrer">
              View page ↗
            </a>
          </div>
          <ul className="plain">
            {current.items.map((it, i) => (
              <li key={i}>
                <span>{it.name}</span>
                <span>{formatPrice(it.price)}</span>
              </li>
            ))}
          </ul>
          {current.canUndo && (
            <button className="btn ghost" onClick={undo} disabled={busy} style={{ marginTop: 10 }}>
              ↶ Undo last change
            </button>
          )}
        </div>
      )}

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

      {error && (
        <div className="errors">
          <p>{error}</p>
        </div>
      )}
      {notice && <div className="success">{notice}</div>}
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
    </main>
  );
}
