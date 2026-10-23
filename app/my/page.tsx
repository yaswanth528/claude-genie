"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import type { Live } from "@/lib/schema";

type SiteRow = { slug: string; businessName: string; siteType: "static" | "dynamic"; live: Live | null; paid: boolean; updatedAt: string };

// The logged-in owner's websites.
export default function MyPage() {
  const [data, setData] = useState<{ phone: string; sites: SiteRow[] } | null>(null);
  const [out, setOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return setOut(true);
        setData(await r.json());
      })
      .catch(() => setOut(true));
  }, []);

  if (out)
    return (
      <main className="narrow">
        <Logo />
        <h1>My websites</h1>
        <p className="hint">You’re not logged in.</p>
        <div className="row">
          <Link className="btn" href="/login">
            Log in with WhatsApp
          </Link>
        </div>
      </main>
    );
  if (!data) return <main className="narrow"><Logo /><p className="hint loading" style={{ marginTop: 24 }}>Loading your websites…</p></main>;

  return (
    <main className="narrow">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 0 }}>
        <Logo />
        <button
          className="btn ghost sm"
          onClick={async () => {
            await fetch("/api/auth/me", { method: "DELETE" });
            window.location.href = "/login";
          }}
        >
          Log out
        </button>
      </div>
      <h1>My websites</h1>
      <p className="hint">Logged in as +{data.phone}</p>
      <div className="my-list">
        {data.sites.map((s) => (
          <article key={s.slug} className="card my-site">
            <div>
              <strong>{s.businessName}</strong>
              <p className="hint small">
                {s.siteType === "dynamic" ? "Dynamic" : "Static"} ·{" "}
                {s.live ? <span className="pill ok">Live</span> : s.paid ? <span className="pill warn">Paid · not live</span> : <span className="pill warn">Not published</span>}
              </p>
              {s.live && (
                <a className="live-url" href={s.live.url} target="_blank" rel="noreferrer">
                  {s.live.url.replace("https://", "")} ↗
                </a>
              )}
            </div>
            <Link className="btn sm" href={`/p/${s.slug}/edit`}>
              Edit
            </Link>
          </article>
        ))}
      </div>
      <div className="row">
        <Link className="btn ghost" href="/create">
          + Make another website
        </Link>
      </div>
    </main>
  );
}
