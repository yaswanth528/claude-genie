"use client";
import { useEffect } from "react";

// Counts one visit to a shop page (a number per day; nothing personal is stored).
export function VisitPing({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      navigator.sendBeacon?.(`/api/visit/${slug}`);
    } catch {}
  }, [slug]);
  return null;
}
