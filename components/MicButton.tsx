"use client";
import { useSpeech } from "./useSpeech";

export function MicButton({ language, onText }: { language: string; onText: (t: string) => void }) {
  const { supported, state, seconds, error, start, stop } = useSpeech(language, onText);
  if (!supported) return <p className="hint">This browser can't record audio. You can type below instead.</p>;
  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic ${state === "recording" ? "on" : ""}`}
        onClick={state === "recording" ? stop : start}
        disabled={state === "transcribing"}
        aria-pressed={state === "recording"}
      >
        <span className="mic-dot" aria-hidden />
        {state === "recording" ? `Stop · 0:${String(seconds).padStart(2, "0")}` : state === "transcribing" ? "Listening to your recording…" : "Tap and speak"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
