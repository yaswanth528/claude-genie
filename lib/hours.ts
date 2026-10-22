// Opening hours: turns the owner's words ("10 am – 9 pm, closed Tuesday") into a weekly
// schedule, so the website can say "Open now · closes 9 pm". If the words can't be read
// reliably, parseHours returns null and no badge is shown (the text is still shown as said).

// Week[day] (0 = Sunday) is a list of [open, close] in minutes after midnight. A close
// past 1440 runs into the next day (e.g. 6 pm – 2 am = [1080, 1560]).
export type Week = [number, number][][];

const DAY_RE = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/g;
const DAY_IDX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const TIME_RANGE =
  /(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/g;

function daysIn(seg: string): number[] {
  if (/\b(daily|every\s?day|all days|all week|7 days|seven days)\b/.test(seg)) return [0, 1, 2, 3, 4, 5, 6];
  const out = new Set<number>();
  if (/\bweekdays?\b/.test(seg)) [1, 2, 3, 4, 5].forEach((d) => out.add(d));
  if (/\bweekends?\b/.test(seg)) [0, 6].forEach((d) => out.add(d));
  // "mon-sat" (after " to " became "-"), cycling past Sunday if needed.
  const range = seg.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*-\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
  let rest = seg;
  if (range) {
    const a = DAY_IDX[range[1]];
    const b = DAY_IDX[range[2]];
    for (let d = a; ; d = (d + 1) % 7) {
      out.add(d);
      if (d === b) break;
    }
    rest = seg.replace(range[0], " ");
  }
  for (const m of rest.matchAll(DAY_RE)) out.add(DAY_IDX[m[1]]);
  return [...out];
}

function rangesIn(seg: string): [number, number][] {
  const evening = /\b(evening|night)\b/.test(seg) && !/\bmorning\b/.test(seg);
  const out: [number, number][] = [];
  for (const m of seg.matchAll(TIME_RANGE)) {
    const h1 = +m[1], m1 = +(m[2] ?? 0), h2 = +m[4], m2 = +(m[5] ?? 0);
    const ap1 = m[3]?.[0], ap2 = m[6]?.[0];
    if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59) continue;
    const to24 = (h: number, ap: string | undefined) => (ap === "p" ? (h % 12) + 12 : ap === "a" ? h % 12 : h);
    // Without am/pm: 6–11 is morning, 12 is noon, 1–5 is afternoon ("4 to 9" = 4 pm).
    const open = (ap1 ? to24(h1, ap1) : h1 > 12 ? h1 : evening || h1 < 6 ? (h1 % 12) + 12 : h1) * 60 + m1;
    let close = (ap2 ? to24(h2, ap2) : h2) * 60 + m2;
    if (!ap2 && h2 <= 12) while (close <= open && close < open + 1440) close += 720; // "10-8" = 8 pm
    if (close <= open) close += 1440; // past midnight
    if (close - open < 30 || close - open > 1440) continue;
    out.push([open, close]);
  }
  return out;
}

export function parseHours(text: string | null | undefined): Week | null {
  if (!text) return null;
  const s = text
    .toLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/\s+(to|till|until)\s+/g, "-")
    .replace(/\bnoon\b/g, "12 pm")
    .replace(/\bmidnight\b/g, "12 am");
  if (/\b(24\s*(hours|hrs|x\s*7|\/\s*7)|open 24|round the clock)\b/.test(s)) return Array.from({ length: 7 }, () => [[0, 1440]]);

  const set: ([number, number][] | null)[] = Array(7).fill(null);
  const closed = new Set<number>();
  let general: [number, number][] = [];
  for (const seg of s.split(/[,;\n]|\.\s/)) {
    const days = daysIn(seg);
    const ranges = rangesIn(seg);
    if (!ranges.length) {
      if (/\b(closed|holiday|off|shut)\b/.test(seg)) days.forEach((d) => closed.add(d));
      continue;
    }
    if (days.length) days.forEach((d) => (set[d] = [...(set[d] ?? []), ...ranges]));
    else general = [...general, ...ranges];
  }
  if (!general.length && set.every((d) => d === null)) return null;
  return set.map((d, i) => (closed.has(i) ? [] : (d ?? general).slice().sort((a, b) => a[0] - b[0])));
}

export type OpenWords = { openNow: string; closes: string; closedNow: string; opens: string; tomorrow: string };

// "Open now · closes 9 pm" / "Closed · opens 10 am" / "Closed · opens Wed 10 am", in India
// time. Self-contained (no imports, no outside helpers): lib/standalone.ts ships this exact
// function to the browser as text.
export function openStatus(week: [number, number][][], nowMs: number, w: OpenWords): { open: boolean; text: string } | null {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const t = new Date(nowMs + 330 * 60000); // India is UTC+5:30 all year
  const day = t.getUTCDay();
  const min = t.getUTCHours() * 60 + t.getUTCMinutes();
  const fmt = function (m: number) {
    m = m % 1440;
    const h = Math.floor(m / 60), mm = m % 60;
    return (h % 12 || 12) + (mm ? ":" + (mm < 10 ? "0" : "") + mm : "") + (h < 12 ? " am" : " pm");
  };
  const prev = week[(day + 6) % 7] || [];
  for (let i = 0; i < prev.length; i++) if (prev[i][1] > 1440 && min < prev[i][1] - 1440) return { open: true, text: w.openNow + " · " + w.closes + " " + fmt(prev[i][1]) };
  const today = week[day] || [];
  for (let i = 0; i < today.length; i++) {
    if (min >= today[i][0] && min < today[i][1]) return { open: true, text: w.openNow + " · " + w.closes + " " + fmt(today[i][1]) };
  }
  for (let i = 0; i < today.length; i++) if (today[i][0] > min) return { open: false, text: w.closedNow + " · " + w.opens + " " + fmt(today[i][0]) };
  for (let k = 1; k <= 7; k++) {
    const d = week[(day + k) % 7] || [];
    if (d.length) return { open: false, text: w.closedNow + " · " + w.opens + " " + (k === 1 ? w.tomorrow : days[(day + k) % 7]) + " " + fmt(d[0][0]) };
  }
  return null;
}
