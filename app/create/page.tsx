"use client";
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Logo } from "@/components/Logo";
import { MediaPicker } from "@/components/MediaPicker";
import { MicButton } from "@/components/MicButton";
import { SiteEditor } from "@/components/SiteEditor";
import { SiteView } from "@/components/site/SiteView";
import type { Uploaded } from "@/components/upload";
import { LANGUAGES } from "@/components/useSpeech";
import type { Draft } from "@/lib/schema";

type Stage = "speak" | "building" | "review" | "done";
type Result = { slug: string; editKey: string; whatsapp: string };

const BUILD_STEPS = ["Understanding what you said", "Choosing a design for your business", "Placing your photos", "Creating pictures", "Writing your website"];

function Building({ withPhotos }: { withPhotos: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const steps = BUILD_STEPS.filter((s) => withPhotos || s !== "Placing your photos");
  const active = Math.min(steps.length - 1, Math.floor(t / 6));
  return (
    <div className="building" aria-live="polite">
      <div className="spinner" aria-hidden />
      <h1>Building your website…</h1>
      <ol>
        {steps.map((s, i) => (
          <li key={s} className={i < active ? "done" : i === active ? "now" : ""}>
            {s}
          </li>
        ))}
      </ol>
      <p className="hint">This usually takes 20–40 seconds. {t > 0 && `(${t}s)`}</p>
    </div>
  );
}

export default function CreatePage() {
  const [stage, setStage] = useState<Stage>("speak");
  const [lang, setLang] = useState("English");
  const [transcript, setTranscript] = useState("");
  const [media, setMedia] = useState<Uploaded[]>([]);
  const [aiImages, setAiImages] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const onText = useCallback((t: string) => setTranscript((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t)), []);

  async function build() {
    setErrors([]);
    setStage("building");
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, media, generateImages: aiImages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "Couldn't build the website."]);
        setStage("speak");
        return;
      }
      setDraft({ ...(data as Draft), whatsapp: draft?.whatsapp ?? "" });
      setStage("review");
      window.scrollTo({ top: 0 });
    } catch {
      setErrors(["Network error. Check your connection and try again."]);
      setStage("speak");
    }
  }

  async function publish() {
    if (!draft) return;
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await res.json();
      if (!res.ok) return setErrors(data.errors ?? ["Couldn't publish."]);
      setResult(data);
      setStage("done");
      window.scrollTo({ top: 0 });
    } catch {
      setErrors(["Network error. Try again."]);
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const errorBox =
    errors.length > 0 ? (
      <div className="errors">
        {errors.map((e) => (
          <p key={e}>{e}</p>
        ))}
      </div>
    ) : null;

  if (stage === "review" && draft)
    return (
      <div className="review">
        <header className="review-bar">
          <Logo />
          <div className="seg mobile-only" role="tablist">
            <button role="tab" aria-selected={pane === "edit"} className={pane === "edit" ? "on" : ""} onClick={() => setPane("edit")}>
              Edit
            </button>
            <button role="tab" aria-selected={pane === "preview"} className={pane === "preview" ? "on" : ""} onClick={() => setPane("preview")}>
              Preview
            </button>
          </div>
          <div className="seg desktop-only" role="radiogroup" aria-label="Preview size">
            <button role="radio" aria-checked={device === "phone"} className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")}>
              Phone
            </button>
            <button role="radio" aria-checked={device === "desktop"} className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>
              Desktop
            </button>
          </div>
        </header>
        <div className="review-body">
          <aside className={`review-edit ${pane === "edit" ? "show" : ""}`}>
            <h1>Your website is ready</h1>
            <p className="hint">Check the details, change anything you like, then publish. Nothing goes live until you do.</p>
            <SiteEditor value={draft} onChange={setDraft} language={lang} showWhatsapp />
            <div className="publish-bar">
              {errorBox}
              <div className="row">
                <button className="btn" onClick={publish} disabled={busy}>
                  {busy ? "Publishing…" : "Publish my website"}
                </button>
                <button className="btn ghost" onClick={() => setStage("speak")} disabled={busy}>
                  Start again
                </button>
              </div>
            </div>
          </aside>
          <section className={`review-preview ${pane === "preview" ? "show" : ""}`} aria-label="Website preview">
            <div className={`device ${device}`}>
              <SiteView site={draft} preview />
            </div>
          </section>
        </div>
      </div>
    );

  return (
    <main className="narrow">
      <Logo />
      <div className="stepper-head" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i <= { speak: 0, building: 1, review: 1, done: 2 }[stage] ? "done" : ""} />
        ))}
      </div>

      {stage === "speak" && (
        <>
          <h1>Tell us about your business</h1>
          <p className="hint">
            Speak for 20–60 seconds: your shop’s name, what you sell with prices, and anything customers should know (area,
            timings, delivery).
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
          <label htmlFor="transcript">What we heard (you can edit or type)</label>
          <textarea id="transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} />

          <div style={{ marginTop: 20 }}>
            <MediaPicker value={media} onChange={setMedia} />
          </div>
          <label className="check">
            <input type="checkbox" checked={aiImages} onChange={(e) => setAiImages(e.target.checked)} />
            Create pictures with AI where I haven’t added a photo
          </label>

          {errorBox}
          <div className="row">
            <button className="btn" onClick={build} disabled={transcript.trim().length < 5}>
              Build my website
            </button>
          </div>
        </>
      )}

      {stage === "building" && <Building withPhotos={media.length > 0} />}

      {stage === "done" && result && (
        <>
          <h1>Your website is live 🎉</h1>
          <div className="success">
            <strong>Share this link</strong> in your WhatsApp status, Instagram bio and with customers:
            <div className="link-box">
              <input readOnly value={`${origin}/p/${result.slug}`} onFocus={(e) => e.target.select()} aria-label="Website link" />
              <CopyButton text={`${origin}/p/${result.slug}`} />
              <a className="btn" href={`/p/${result.slug}`} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
          </div>
          <div className="notice">
            <strong>Save your private edit link.</strong> Use it to change prices by voice, update photos and see orders. Anyone with
            it can change your website, so don’t share it.
            <div className="link-box">
              <input readOnly aria-label="Private edit link" value={`${origin}/p/${result.slug}/edit#key=${result.editKey}`} onFocus={(e) => e.target.select()} />
              <CopyButton text={`${origin}/p/${result.slug}/edit#key=${result.editKey}`} />
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <strong>Check that orders reach you</strong>
            <p className="hint">Send yourself a test order. If WhatsApp opens your own chat, you’re set.</p>
            <a
              className="btn wa"
              style={{ marginTop: 10 }}
              href={`https://wa.me/${result.whatsapp}?text=${encodeURIComponent(`Test order from my SiteGenie website (${origin}/p/${result.slug})`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Send a test order
            </a>
          </div>
        </>
      )}
    </main>
  );
}
