// Serves locally stored uploads during development. On Vercel, media lives in Blob storage.
import { readLocalMedia, typeForName } from "@/lib/media";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const bytes = await readLocalMedia(name);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": typeForName(name), "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
