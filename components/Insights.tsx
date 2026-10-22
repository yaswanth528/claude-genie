"use client";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalogue";

type Data = {
  visits: { day: string; count: number }[] | null;
  orders: { week: number; weekTotal: number; month: number; monthTotal: number; all: number };
};

// The owner's dashboard: visits over the last 14 days and orders this week/month.
export function Insights({ slug, editKey, dynamic }: { slug: string; editKey: string; dynamic: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/insights/${slug}`, { headers: { "x-edit-key": editKey } })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError((e as Error).message || "Couldn't load your numbers."));
  }, [slug, editKey]);

  if (error) return <div className="errors"><p>{error}</p></div>;
  if (!data) return <p className="hint">Loading your numbers…</p>;

  const visits = data.visits;
  const week = visits?.slice(-7).reduce((s, v) => s + v.count, 0) ?? 0;
  const prevWeek = visits?.slice(0, 7).reduce((s, v) => s + v.count, 0) ?? 0;
  const max = Math.max(1, ...(visits ?? []).map((v) => v.count));

  return (
    <div className="insights">
      <div className="tiles">
        <div className="tile">
          <span>Visits this week</span>
          <strong>{visits ? week : "—"}</strong>
          {visits && prevWeek > 0 && <em className={week >= prevWeek ? "up" : "down"}>{week >= prevWeek ? "▲" : "▼"} vs last week ({prevWeek})</em>}
        </div>
        {dynamic ? (
          <>
            <div className="tile">
              <span>Orders this week</span>
              <strong>{data.orders.week}</strong>
              <em>{formatPrice(data.orders.weekTotal)}</em>
            </div>
            <div className="tile">
              <span>Orders in 30 days</span>
              <strong>{data.orders.month}</strong>
              <em>{formatPrice(data.orders.monthTotal)}</em>
            </div>
          </>
        ) : (
          <div className="tile">
            <span>Orders</span>
            <strong>WhatsApp</strong>
            <em>Static sites send orders straight to WhatsApp, so they aren’t counted here.</em>
          </div>
        )}
      </div>

      {visits ? (
        <figure className="chart">
          <figcaption>Visits per day, last 14 days</figcaption>
          <div className="bars" role="img" aria-label={`Visits per day: ${visits.map((v) => `${v.day} ${v.count}`).join(", ")}`}>
            {visits.map((v) => (
              <div key={v.day} className="bar-col" title={`${v.day}: ${v.count}`}>
                <span className="bar-n">{v.count || ""}</span>
                <div className="bar" style={{ height: `${(v.count / max) * 100}%` }} />
                <span className="bar-d">{new Date(v.day).toLocaleDateString("en-IN", { day: "numeric" })}</span>
              </div>
            ))}
          </div>
        </figure>
      ) : (
        <p className="hint">Visit counting starts once storage moves to Cloudflare.</p>
      )}
    </div>
  );
}
