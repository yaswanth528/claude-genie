"use client";
// "Not happy? Say what to change." The owner says anything about their website in their own
// words; /api/revise returns the changed website, which replaces the draft straight away (the
// preview updates), with a list of what changed and one-tap undo. Nothing is saved until the
// owner continues or saves as usual.
import { useState } from "react";
import type { SiteContent } from "@/lib/schema";
import { MicButton } from "./MicButton";
import { LANGUAGES } from "./useSpeech";

type Props<T extends SiteContent> = {
  value: T;
  onChange: (next: T) => void;
  language: string;
  onLanguage?: (l: string) => void;
  compact?: boolean; // inside the phone sheet
};

export function ReviseMic<T extends SiteContent>({ value, onChange, language, onLanguage, compact }: Props<T>) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: string[]; question: string | null; before: T } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(request = text) {
    if (request.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/revise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: value, request }) });
      const data = (await res.json()) as { content?: SiteContent; summary?: string[]; question?: string | null; error?: string };
      if (!res.ok || !data.content) return setError(data.error ?? "Couldn't change that. Try again.");
      const changed = (data.summary?.length ?? 0) > 0;
      // Keep what the revision doesn't know about (e.g. WhatsApp number, translation).
      if (changed) onChange({ ...value, ...data.content });
      setResult({ summary: data.summary ?? [], question: data.question ?? null, before: value });
      if (changed) setText("");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`revise ${compact ? "compact" : ""}`} aria-label="Change your website by voice">
      {!compact && (
        <>
          <h2>Not happy with something?</h2>
          <p className="hint">Say what you want changed, in your own words. Your website updates right away and you can undo it.</p>
        </>
      )}
      {onLanguage && (
        <select aria-label="Language you'll speak" value={language} onChange={(e) => onLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.name} value={l.name}>
              {l.label}
            </option>
          ))}
        </select>
      )}
      <MicButton
        language={language}
        label={busy ? "Changing your website…" : "Tap and say what to change"}
        onText={(t) => {
          setText(t);
          run(t);
        }}
      />
      <label htmlFor={compact ? "revise-text-sheet" : "revise-text"} className="small-label">
        Or type it
      </label>
      <textarea id={compact ? "revise-text-sheet" : "revise-text"} rows={2} value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
      <div className="row tight">
        <button className="btn sm" onClick={() => run()} disabled={busy || text.trim().length < 3}>
          {busy ? "Changing…" : "Change it"}
        </button>
      </div>
      {busy && <p className="revise-busy" aria-live="polite">Working on your website…</p>}
      {error && <p className="error">{error}</p>}
      {result && !busy && (
        <div className="revise-result" aria-live="polite">
          {result.summary.length > 0 ? (
            <>
              <p className="revise-done">✓ Done</p>
              <ul>
                {result.summary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <button
                className="btn ghost sm"
                onClick={() => {
                  onChange(result.before);
                  setResult(null);
                }}
              >
                ↶ Undo this change
              </button>
            </>
          ) : (
            <p>{result.question ?? "We didn’t find anything to change. Try saying it another way."}</p>
          )}
          {result.summary.length > 0 && result.question && <p className="hint small">{result.question}</p>}
        </div>
      )}
    </section>
  );
}
