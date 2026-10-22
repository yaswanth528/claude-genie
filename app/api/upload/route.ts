import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { limit } from "@/lib/ratelimit";
import { directUploads, IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, saveMedia, VIDEO_TYPES } from "@/lib/media";

// Through-server uploads are capped by Vercel's request size limit.
const SERVER_LIMIT = process.env.VERCEL ? 4 * 1024 * 1024 : MAX_VIDEO_BYTES;

// Tells the browser how to upload: straight to Vercel Blob, or through this server.
export async function GET() {
  return NextResponse.json({ mode: directUploads() ? "blob" : "server", maxBytes: directUploads() ? MAX_VIDEO_BYTES : SERVER_LIMIT });
}

export async function POST(req: Request) {
  const stop = await limit(req, "upload");
  if (stop) return stop;
  const type = req.headers.get("content-type") ?? "";

  // Vercel Blob client-upload handshake: hand the browser a short-lived token.
  if (type.includes("application/json")) {
    if (!directUploads()) return NextResponse.json({ error: "Direct uploads need BLOB_READ_WRITE_TOKEN." }, { status: 400 });
    try {
      const body = (await req.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith("uploads/")) throw new Error("Bad upload path");
          return {
            allowedContentTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
            maximumSizeInBytes: MAX_VIDEO_BYTES,
            addRandomSuffix: true,
          };
        },
      });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  // Through this server: saved to Blob (store-ID sign-in) or ./data/uploads in local dev.
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "No file received." }, { status: 400 });
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) return NextResponse.json({ error: `Files of type ${file.type || "unknown"} aren't supported.` }, { status: 415 });
  if (file.size > Math.min(isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES, SERVER_LIMIT))
    return NextResponse.json({ error: isVideo ? "That video is too big. Try a clip under 4 MB (about 10 seconds)." : "That file is too big." }, { status: 413 });
  try {
    const url = await saveMedia(Buffer.from(await file.arrayBuffer()), file.type, "uploads");
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
