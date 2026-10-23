"use client";
// The big round mic on the "Tell us about your business" screen. While recording, the bars
// follow the owner's voice live (Web Audio analyser), so they can see it's listening.
import { useEffect, useRef } from "react";
import { useSpeech } from "../useSpeech";

const BARS = 32;

export function MicOrb({ language, onText, onAudio }: { language: string; onText: (t: string) => void; onAudio?: (b: Blob) => void }) {
  const { supported, state, seconds, error, start, stop, stream, maxSeconds } = useSpeech(language, onText, onAudio);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const orb = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!stream) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const draw = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < BARS; i++) {
        // Voices sit in the lower bins; spread them across the bars, mirrored from the middle.
        const v = data[Math.min(data.length - 1, 1 + Math.floor((Math.abs(i - BARS / 2) / (BARS / 2)) * 34))] / 255;
        sum += v;
        const el = bars.current[i];
        if (el) el.style.transform = `scaleY(${0.12 + v * 0.95})`;
      }
      orb.current?.style.setProperty("--level", String(Math.min(1, (sum / BARS) * 2.2)));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ctx.close().catch(() => {});
      bars.current.forEach((el) => el && (el.style.transform = ""));
      orb.current?.style.setProperty("--level", "0");
    };
  }, [stream]);

  if (!supported) return <p className="cf-muted">This browser can’t record audio. Type below instead.</p>;
  const recording = state === "recording";
  const left = maxSeconds - seconds;
  return (
    <div className={`cf-mic is-${state}`}>
      <button
        ref={orb}
        type="button"
        className="cf-orb"
        onClick={recording ? stop : start}
        disabled={state === "transcribing"}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        <span className="cf-orb-ring" aria-hidden="true" />
        <span className="cf-orb-ring r2" aria-hidden="true" />
        {recording ? (
          <span className="cf-orb-stop" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
            <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <div className="cf-wave" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} ref={(el) => void (bars.current[i] = el)} />
        ))}
      </div>
      <p className="cf-mic-label" aria-live="polite">
        {recording
          ? `Listening · 0:${String(seconds).padStart(2, "0")}${left <= 10 ? ` · ${left}s left` : ""} · tap to stop`
          : state === "transcribing"
            ? "Writing down what you said…"
            : "Tap and speak"}
      </p>
      {error && <p className="cf-error">{error}</p>}
    </div>
  );
}
