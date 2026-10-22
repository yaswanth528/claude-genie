import { countVisit } from "@/lib/store";

// Customer websites ping this once per page view (navigator.sendBeacon), for the owner's
// visits chart. No cookies and nothing personal is stored: just a count per day.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await countVisit(slug);
  } catch (err) {
    console.error("visit count failed:", (err as Error).message);
  }
  return new Response(null, { status: 204, headers: CORS });
}
