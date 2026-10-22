// Prices from the MVP scope: creation ₹1,999 one-time; dynamic adds ₹3,000 a year.
export const PRICES = { static: 1999, dynamic: 1999 + 3000 } as const;
export const YEARLY = 3000; // dynamic plan renewal
export const GRACE_DAYS = 15; // online orders keep working this long after the paid year ends
export const REMIND_DAYS = 30; // remind the owner this many days before renewal

const DAY = 86_400_000;
export const addYear = (from: Date) => new Date(from.getTime() + 365 * DAY).toISOString();

type Paid = { plan: "static" | "dynamic"; paidUntil?: string | null } | null | undefined;

// "active" | "due" (renewal coming up) | "grace" (lapsed, still working) | "lapsed" (orders paused)
export function renewalState(payment: Paid, siteType: "static" | "dynamic", now = Date.now()): "none" | "active" | "due" | "grace" | "lapsed" {
  if (siteType !== "dynamic" || payment?.plan !== "dynamic" || !payment.paidUntil) return "none";
  const until = Date.parse(payment.paidUntil);
  if (now < until - REMIND_DAYS * DAY) return "active";
  if (now < until) return "due";
  if (now < until + GRACE_DAYS * DAY) return "grace";
  return "lapsed";
}
