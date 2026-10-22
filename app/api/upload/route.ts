import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { blobEnabled, IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, saveMedia, VIDEO_TYPES } from "@/lib/media";

// Tells the browser how to upload: straight to Vercel Blob, or to this server (local dev).
export async function GET() {
  return NextResponse.json({ mode: blobEnabled() ? "blob" : "local" });
}

export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? "";

  // Vercel Blob client-upload handshake: hand the browser a short-lived token.
  if (type.includes("application/json")) {
    if (!blobEnabled()) return NextResponse.json({ error: "Blob storage isn't configured." }, { status: 400 });
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

  // Local development: the file comes to this server and is saved under ./data/uploads.
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "No file received." }, { status: 400 });
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) return NextResponse.json({ error: `Files of type ${file.type || "unknown"} aren't supported.` }, { status: 415 });
  if (file.size > (isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES))
    return NextResponse.json({ error: "That file is too big." }, { status: 413 });
  try {
    const url = await saveMedia(Buffer.from(await file.arrayBuffer()), file.type, "uploads");
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
