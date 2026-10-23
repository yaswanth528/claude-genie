"use client";
// While the website is being built: a phone in which the page puts itself together, block by
// block, beside the steps. Real build time varies (20-60 s on the free Gemini tier), so the
// blocks follow the clock and the last step waits until the website arrives.
import { useEffect, useState } from "react";

const STEPS = ["Understanding what you said", "Choosing a design for your business", "Placing your photos", "Finding pictures", "Writing your website"];

export function Assembling({ withPhotos }: { withPhotos: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const steps = STEPS.filter((s) => withPhotos || s !== "Placing your photos");
  const active = Math.min(steps.length - 1, Math.floor(t / 6));
  const stage = Math.min(6, Math.floor(t / 3)); // how many blocks of the page have appeared
  return (
    <div className="cf-build" aria-live="polite">
      <div className="cf-build-phone" aria-hidden="true">
        <div className="cf-build-screen" data-stage={stage}>
          <div className="b-bar" />
          <div className="b-hero">
            <i className="b-eyebrow" />
            <i className="b-h1" />
            <i className="b-h1 short" />
            <i className="b-btns" />
          </div>
          <div className="b-band" />
          <div className="b-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="b-card" style={{ ["--i" as string]: i }}>
                <i className="b-img" />
                <i className="b-line" />
                <i className="b-line short" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="cf-build-copy">
        <h1>Building your website…</h1>
        <ol className="cf-steps">
          {steps.map((s, i) => (
            <li key={s} className={i < active ? "done" : i === active ? "now" : ""}>
              {s}
            </li>
          ))}
        </ol>
        <div className="cf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(95, Math.round((t / 45) * 100))}>
          <span style={{ width: `${Math.min(95, (t / 45) * 100)}%` }} />
        </div>
        <p className="cf-muted">Usually 20–60 seconds{t > 0 ? ` · ${t}s` : ""}</p>
      </div>
    </div>
  );
}
