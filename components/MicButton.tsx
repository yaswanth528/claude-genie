"use client";
import { useSpeech } from "./useSpeech";

export function MicButton({ lang, onText }: { lang: string; onText: (t: string) => void }) {
  const { supported, listening, error, start, stop } = useSpeech(lang, onText);
  if (!supported)
    return <p className="hint">Voice input needs Chrome or Edge. You can type below instead.</p>;
  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic ${listening ? "on" : ""}`}
        onClick={listening ? stop : start}
        aria-pressed={listening}
      >
        <span className="mic-dot" aria-hidden />
        {listening ? "Stop" : "Tap and speak"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
