"use client";
import { use, useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { MicButton } from "@/components/MicButton";
import { LANGUAGES } from "@/components/useSpeech";
import { formatPrice } from "@/lib/catalogue";
import type { Item, Patch } from "@/lib/schema";

type Snapshot = { businessName: string; items: Item[] };
type Preview = { patch: Patch; before: Snapshot; after: Snapshot; errors: string[] };

export default function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [lang, setLang] = useState("kn-IN");
  const [request, setRequest] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The key lives in the URL fragment so it never reaches server logs.
  useEffect(() => setKey(new URLSearchParams(window.location.hash.slice(1)).get("key")), []);
  const onText = useCallback((t: string) => setRequest(t), []);

  async function call(method: "POST" | "PUT", body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method,
        headers: { "Content-Type": "application/json", "x-edit-key": key ?? "" },
        body: JSON.stringify(body),
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
  }

  async function previewEdit() {
    setSaved(false);
    const data = await call("POST", { request });
    if (data) setPreview(data);
  }

  async function approve() {
    if (!preview) return;
    const data = await call("PUT", { patch: preview.patch });
    if (data) {
      setSaved(true);
      setPreview(null);
      setRequest("");
    }
  }

  if (key === undefined) return null;
  if (key === null)
    return (
      <main className="narrow">
        <p>Open this page using the private edit link you got when you published.</p>
      </main>
    );

  const changed = (after: Item, i: number) => {
    const b = preview?.before.items[i];
    return !b || b.name !== after.name || b.price !== after.price;
  };
  const hasChanges = preview && preview.patch.ops.length > 0;

  return (
    <main className="narrow">
      <Logo />
      <h1>Change your page by voice</h1>
      <p className="hint">Example: “change the cotton kurti price to 849” or “remove dupatta”.</p>

      <label htmlFor="lang">Language</label>
      <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <MicButton lang={lang} onText={onText} />
      <label htmlFor="req">What we heard</label>
      <textarea id="req" value={request} onChange={(e) => setRequest(e.target.value)} />
      <div className="row">
        <button className="btn" onClick={previewEdit} disabled={busy || !request.trim()}>
          {busy && !preview ? "Working it out…" : "Show me the change"}
        </button>
        <a className="btn ghost" href={`/p/${slug}`} target="_blank" rel="noreferrer">
          View page
        </a>
      </div>

      {error && <div className="errors"><p>{error}</p></div>}
      {saved && <div className="success">Done — your page is updated.</div>}

      {preview?.patch.ambiguity && <div className="notice">{preview.patch.ambiguity}</div>}

      {hasChanges && (
        <>
          <div className="diff">
            <div className="card">
              <h3>Before</h3>
              <ul>
                {preview.before.items.map((it, i) => (
                  <li key={i}>
                    {it.name} — {formatPrice(it.price)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3>After</h3>
              {preview.after.businessName !== preview.before.businessName && (
                <p>Name: {preview.after.businessName}</p>
              )}
              <ul>
                {preview.after.items.map((it, i) => (
                  <li key={i} className={changed(it, i) ? "changed" : ""}>
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
