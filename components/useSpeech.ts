"use client";
// Browser speech-to-text (Web Speech API, works in Chrome/Edge on Android and desktop).
// The MVP scope lists Sarvam / IndicConformer as the open STT decision; this is the
// zero-cost stand-in until that is chosen. Owners can always type instead.
import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function useSpeech(lang: string, onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef("");

  useEffect(() => {
    const w = window as unknown as Record<string, new () => Recognition>;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    finalText.current = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      onText((finalText.current + interim).trim());
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone permission was blocked." : `Mic error: ${e.error}`);
    r.onend = () => setListening(false);
    setError(null);
    rec.current = r;
    r.start();
    setListening(true);
  }, [lang, onText]);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}

export const LANGUAGES = [
  { code: "kn-IN", label: "ಕನ್ನಡ Kannada" },
  { code: "hi-IN", label: "हिन्दी Hindi" },
  { code: "en-IN", label: "English (India)" },
  { code: "ta-IN", label: "தமிழ் Tamil" },
  { code: "te-IN", label: "తెలుగు Telugu" },
];
