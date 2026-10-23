"use client";
// Words that change every few seconds while something slow happens, so a wait never looks stuck.
import { useEffect, useState } from "react";

export function Rotating({ lines, every = 2600, className = "" }: { lines: string[]; every?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % lines.length), every);
    return () => clearInterval(id);
  }, [lines.length, every]);
  // The key restarts the fade-in each time the words change (see .rotating in app.css).
  return (
    <p key={i} className={`rotating ${className}`}>
      {lines[i % lines.length]}
    </p>
  );
}
