"use client";
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Logo } from "@/components/Logo";
import { MediaPicker } from "@/components/MediaPicker";
import ShinyText from "@/components/bits/ShinyText/ShinyText";
import { Assembling } from "@/components/create/Assembling";
import { Confetti } from "@/components/create/Confetti";
import { MicOrb } from "@/components/create/MicOrb";
import { MicButton } from "@/components/MicButton";
import { ReviseMic } from "@/components/ReviseMic";
import { PayPanel } from "@/components/PayPanel";
import { SharePanel } from "@/components/SharePanel";
import { SiteEditor } from "@/components/SiteEditor";
import { SiteView } from "@/components/site/SiteView";
import type { Uploaded } from "@/components/upload";
import { LANGUAGES } from "@/components/useSpeech";
import { normaliseWhatsapp } from "@/lib/catalogue";
import { PRICES } from "@/lib/prices";
import type { Draft, Live } from "@/lib/schema";
import "./create.css";

type Stage = "speak" | "checking" | "ask" | "building" | "review" | "pay" | "done";
type Question = { question: string; reason: string };
type Result = { slug: string; editKey: string; whatsapp: string };

// What a good description covers. Prices and timings are ticked off when we hear them.
const SAY: { label: string; heard: RegExp | null }[] = [
  { label: "Your shop’s name", heard: /\b(name|called)\b|ಹೆಸರು|नाम|பெயர்|పేరు/i },
  { label: "What you sell, with prices", heard: /\d{2,}|₹|\brupees?\b|\brs\b|ರೂ|रुपय|ரூ|రూ/i },
  { label: "Area and timings", heard: /\b(am|pm)\b|\d+\s*(to|-)\s*\d+|timing|ಗಂಟೆ|बजे|மணி|గంట/i },
  { label: "Delivery or anything special", heard: /deliver|home/i },
];

const Kicker = ({ text }: { text: string }) => <ShinyText text={text} color="#c24a2e" shineColor="#ffb08a" speed={3} className="cf-kicker" />;

export default function CreatePage() {
  const [stage, setStage] = useState<Stage>("speak");
  const [lang, setLang] = useState("English");
  const [transcript, setTranscript] = useState("");
  const [media, setMedia] = useState<Uploaded[]>([]);
  const [aiImages, setAiImages] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  // Phones show the website first (the "magic moment"); the editor is one tap away.
  const [pane, setPane] = useState<"edit" | "preview">("preview");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [confirmWa, setConfirmWa] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false); // phone: "Change by voice" sheet over the preview // the "Where should orders come?" sheet
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<string[]>([]);
  const onText = useCallback((t: string) => setTranscript((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t)), []);
  const onAudio = useCallback((b: Blob) => setRecordings((r) => [...r, URL.createObjectURL(b)].slice(-5)), []);

  // Step 1: ask the AI what's missing (name, prices) before building.
  async function check() {
    setErrors([]);
    setStage("checking");
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = (await res.json()) as { questions?: Question[] };
      const qs = data.questions ?? [];
      if (qs.length) {
        setQuestions(qs);
        setAnswers(qs.map(() => ""));
        setStage("ask");
        return;
      }
    } catch {
      // If the check fails or is slow, just build.
    }
    build(transcript);
  }

  function buildWithAnswers() {
    const extra = questions
      .map((q, i) => (answers[i].trim() ? `${q.question} ${answers[i].trim()}` : ""))
      .filter(Boolean)
      .join("\n");
    const full = extra ? `${transcript.trim()}\n${extra}` : transcript;
    setTranscript(full);
    build(full);
  }

  async function build(text: string) {
    setErrors([]);
    setStage("building");
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, media, generateImages: aiImages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "Couldn't build the website."]);
        setStage("speak");
        return;
      }
      setDraft({ ...(data as Draft), whatsapp: draft?.whatsapp || (data as Draft).whatsapp || "" });
      setStage("review");
      window.scrollTo({ top: 0 });
    } catch {
      setErrors(["Network error. Check your connection and try again."]);
      setStage("speak");
    }
  }

  async function publish(whatsappNumber?: string) {
    if (!draft) return;
    const toSave = whatsappNumber !== undefined ? { ...draft, whatsapp: whatsappNumber } : draft;
    if (whatsappNumber !== undefined) setDraft(toSave);
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toSave) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? ["Couldn't publish."]);
        setPane("edit"); // show the errors next to the fields that need fixing
        setConfirmWa(false);
        return;
      }
      setConfirmWa(false);
      setResult(data);
      setStage("pay");
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
            <p className="hint">This is a preview. Change anything you like, then continue to get your own website.</p>
            <ReviseMic value={draft} onChange={setDraft} language={lang} onLanguage={setLang} />
            <SiteEditor value={draft} onChange={setDraft} language={lang} showWhatsapp recordings={recordings} />
            <div className="publish-bar">
              {errorBox}
              <div className="row">
                <button className="btn" onClick={() => setConfirmWa(true)} disabled={busy}>
                  {busy ? "Saving…" : `Continue · ₹${PRICES[draft.siteType].toLocaleString("en-IN")}`}
                </button>
                <button
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => window.confirm("Go back and build again? Changes you made here will be lost.") && setStage("speak")}
                >
                  Start again
                </button>
              </div>
            </div>
          </aside>
          {confirmWa && (
            <WhatsappSheet
              initial={draft.whatsapp}
              busy={busy}
              error={errors.find((e) => /whatsapp/i.test(e)) ?? null}
              onCancel={() => setConfirmWa(false)}
              onConfirm={(n) => publish(n)}
            />
          )}
          <section className={`review-preview ${pane === "preview" ? "show" : ""}`} aria-label="Website preview">
            <div className={`device ${device}`}>
              <div className="device-scroll">
                <SiteView site={draft} preview />
              </div>
            </div>
            <div className="preview-cta mobile-only">
              <button className="btn" onClick={() => setConfirmWa(true)} disabled={busy}>
                {busy ? "Saving…" : `Continue · ₹${PRICES[draft.siteType].toLocaleString("en-IN")}`}
              </button>
              <button className="btn ghost" onClick={() => setReviseOpen(true)} aria-label="Change by voice">
                🎤 Change
              </button>
              <button className="btn ghost" onClick={() => setPane("edit")}>
                Edit
              </button>
            </div>
          </section>
          {reviseOpen && (
            <div className="sheet-wrap revise-sheet" role="dialog" aria-modal="true" aria-label="Change your website by voice">
              <button className="sheet-scrim" onClick={() => setReviseOpen(false)} aria-label="Close" />
              <div className="sheet">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 0 }}>
                  <h2>What should we change?</h2>
                  <button className="btn ghost sm" onClick={() => setReviseOpen(false)}>
                    See website
                  </button>
                </div>
                <ReviseMic value={draft} onChange={setDraft} language={lang} onLanguage={setLang} compact />
              </div>
            </div>
          )}
        </div>
      </div>
    );

  const stepNow = { speak: 0, checking: 0, ask: 0, building: 1, review: 1, pay: 2, done: 2 }[stage];
  return (
    <div className="cf">
      <header className="cf-nav">
        <div className="cf-nav-row">
          <Logo />
          <ol className="cf-track" aria-label="Steps">
            {["Speak", "Check", "Go live"].map((label, i) => (
              <li key={label} className={i < stepNow ? "done" : i === stepNow ? "now" : ""} aria-current={i === stepNow ? "step" : undefined}>
                <span>{i < stepNow ? "✓" : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="cf-main">
        {stage === "speak" && (
          <>
            <section className="cf-hero">
              <Kicker text="Step 1 of 3" />
              <h1>Tell us about your business.</h1>
              <p className="cf-lead">Speak for 20–60 seconds, in your own language. We’ll turn it into your website.</p>
            </section>

            <div className="cf-langs" role="radiogroup" aria-label="Language you’ll speak">
              {LANGUAGES.map((l) => (
                <button key={l.name} type="button" role="radio" aria-checked={lang === l.name} className={lang === l.name ? "on" : ""} onClick={() => setLang(l.name)}>
                  {l.label}
                </button>
              ))}
            </div>

            <MicOrb language={lang} onText={onText} onAudio={onAudio} />

            <ul className="cf-say" aria-label="What to talk about">
              {SAY.map((x) => {
                const done = !!x.heard && x.heard.test(transcript);
                return (
                  <li key={x.label} className={done ? "done" : ""}>
                    <span aria-hidden="true">{done ? "✓" : "•"}</span>
                    {x.label}
                  </li>
                );
              })}
            </ul>

            <section className="cf-card">
              <div className="cf-card-head">
                <label htmlFor="transcript">What we heard</label>
                <span className="cf-muted small">Edit it, or type instead</span>
              </div>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="For example: we sell Mysore silk sarees from 4,500 rupees and cotton sarees for 1,200. We’re in Jayanagar, open 10 am to 9 pm…"
              />
            </section>

            <section className="cf-card">
              <MediaPicker value={media} onChange={setMedia} />
              <label className="check">
                <input type="checkbox" checked={aiImages} onChange={(e) => setAiImages(e.target.checked)} />
                Find pictures for products I haven’t added a photo for
              </label>
            </section>

            {errorBox}
            <div className="cf-cta">
              <button className="cf-pill block" onClick={check} disabled={transcript.trim().length < 5}>
                Build my website
              </button>
              {transcript.trim().length < 5 && <p className="cf-muted small">Speak or type a little about your shop first.</p>}
            </div>
          </>
        )}

        {stage === "checking" && (
          <div className="cf-center" aria-live="polite">
            <div className="cf-pulse" aria-hidden="true" />
            <h1>Checking what you said…</h1>
            <p className="cf-lead">Making sure we have your products and prices right.</p>
          </div>
        )}

        {stage === "ask" && (
          <>
            <section className="cf-hero">
              <Kicker text="Almost there" />
              <h1>A few quick questions.</h1>
              <p className="cf-lead">So your website is right. Answer by voice or typing, or skip any.</p>
            </section>
            <div className="cf-questions">
              {questions.map((q, i) => (
                <div key={i} className="cf-card cf-question">
                  <span className="cf-q-num">{i + 1}</span>
                  <p className="cf-q-text">{q.question}</p>
                  <MicButton language={lang} label="Answer by voice" onAudio={onAudio} onText={(t) => setAnswers((a) => a.map((x, j) => (j === i ? t : x)))} />
                  <input
                    aria-label={`Answer: ${q.question}`}
                    placeholder="Or type the answer"
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                </div>
              ))}
            </div>
            <div className="cf-cta">
              <button className="cf-pill block" onClick={buildWithAnswers}>
                Build my website
              </button>
              <button className="cf-pill ghost block" onClick={() => build(transcript)}>
                Skip and build
              </button>
            </div>
          </>
        )}

        {stage === "building" && <Assembling withPhotos={media.length > 0} />}

        {stage === "pay" && result && draft && (
          <>
            <section className="cf-hero">
              <Kicker text="Step 3 of 3" />
              <h1>Get your website.</h1>
              <p className="cf-lead">It’s saved. After payment it goes live at its own address, and you can keep changing it with your private edit link.</p>
            </section>
            <section className="cf-card">
              <PayPanel
                slug={result.slug}
                editKey={result.editKey}
                siteType={draft.siteType}
                due={PRICES[draft.siteType]}
                onLive={(l) => {
                  setLive(l);
                  setStage("done");
                  window.scrollTo({ top: 0 });
                }}
              />
            </section>
            <p className="cf-muted cf-center-text">
              Want another look first?{" "}
              <a href={`/p/${result.slug}`} target="_blank" rel="noreferrer">
                Open the preview ↗
              </a>
            </p>
          </>
        )}

        {stage === "done" && result && (
          <>
            <Confetti />
            <section className="cf-hero">
              <Kicker text="You’re online" />
              <h1>Your website is live.</h1>
              <p className="cf-lead">Share it everywhere your customers are.</p>
            </section>
            <section className="cf-card">
              <label htmlFor="live-url">Your website address</label>
              <div className="link-box">
                <input id="live-url" readOnly value={live?.url ?? ""} onFocus={(e) => e.target.select()} />
                <CopyButton text={live?.url ?? ""} />
                <a className="cf-pill sm" href={live?.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            </section>
            <section className="cf-card cf-warn">
              <label htmlFor="edit-url">Save your private edit link</label>
              <p className="cf-muted small">Use it to change prices by voice, update photos, see orders and put changes live. Anyone with it can change your website, so don’t share it.</p>
              <div className="link-box">
                <input id="edit-url" readOnly value={`${origin}/p/${result.slug}/edit#key=${result.editKey}`} onFocus={(e) => e.target.select()} />
                <CopyButton text={`${origin}/p/${result.slug}/edit#key=${result.editKey}`} />
              </div>
            </section>
            {live && draft && (
              <section className="cf-card">
                <h2>Tell your customers</h2>
                <p className="cf-muted small">Post the status image on WhatsApp and print the poster for your counter.</p>
                <SharePanel url={live.url} businessName={draft.businessName} headline={draft.headline} themeId={draft.theme.id} accent={draft.theme.accent} />
              </section>
            )}
            <section className="cf-card">
              <h2>Check that orders reach you</h2>
              <p className="cf-muted small">Send yourself a test order. If WhatsApp opens your own chat, you’re set.</p>
              <a
                className="cf-pill wa"
                href={`https://wa.me/${result.whatsapp}?text=${encodeURIComponent(`Test order from my website (${live?.url ?? ""})`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Send a test order
              </a>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// "Where should orders come?" — confirms the owner's WhatsApp number right before publishing.
function WhatsappSheet({
  initial,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  initial: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (n: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const ok = normaliseWhatsapp(value) !== null;
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="wa-sheet-title">
      <button className="sheet-scrim" onClick={onCancel} aria-label="Close" />
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onConfirm(value);
        }}
      >
        <h2 id="wa-sheet-title">Where should orders come?</h2>
        <p className="hint">Customers’ orders and messages will come to this WhatsApp number. It’s shown on your website.</p>
        <label htmlFor="wa-sheet">Your WhatsApp number</label>
        <input id="wa-sheet" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        {value && !ok && <p className="error">Enter a 10-digit mobile number.</p>}
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button className="btn" disabled={!ok || busy}>
            {busy ? "Saving…" : "Confirm and continue"}
          </button>
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
