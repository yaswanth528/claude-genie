"use client";
// Reads the extracted list aloud with the phone's built-in voice, so owners who
// prefer listening can confirm without reading. Hidden when the browser can't speak.
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalogue";
import type { Item } from "@/lib/schema";
import { LANGUAGES } from "./useSpeech";

export function ReadBack({ businessName, items, language }: { businessName: string; items: Item[]; language: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => setSupported(typeof window !== "undefined" && "speechSynthesis" in window), []);
  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  if (!supported || items.length === 0) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const lines = items.map((it) => `${it.name}, ${it.price === null ? "no price" : formatPrice(it.price).replace("₹", "") + " rupees"}`);
    const u = new SpeechSynthesisUtterance([businessName, ...lines].filter(Boolean).join(". "));
    const code = LANGUAGES.find((l) => l.name === language)?.code ?? "en-IN";
    u.lang = synth.getVoices().some((v) => v.lang === code) ? code : "en-IN";
    u.rate = 0.95;
    u.onend = u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }

  return (
    <button type="button" className="btn ghost" onClick={toggle} aria-pressed={speaking}>
      {speaking ? "Stop reading" : "🔊 Read it back to me"}
    </button>
  );
}
