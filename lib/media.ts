// Photo/video storage. Vercel Blob when BLOB_READ_WRITE_TOKEN is set (Vercel adds it when
// you create a Blob store); otherwise files are written to ./data/uploads and served
// by /api/media/<name> for local development.
import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localDir = join(process.cwd(), "data", "uploads");

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "image/heic": "heic", "image/heif": "heif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};

export const safeLocalName = (name: string) => /^[a-z0-9-]+\.[a-z0-9]{2,5}$/.test(name);

export async function saveMedia(bytes: Buffer, contentType: string, folder: "uploads" | "generated"): Promise<string> {
  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.${EXT[contentType] ?? "bin"}`;
  if (blobEnabled()) {
    const blob = await put(`${folder}/${name}`, bytes, { access: "public", contentType });
    return blob.url;
  }
  if (process.env.VERCEL)
    throw new Error("Photo storage isn't set up. In Vercel → Storage, create a Blob store for this project, then redeploy.");
  await mkdir(localDir, { recursive: true });
  await writeFile(join(localDir, name), bytes);
  return `/api/media/${name}`;
}

export async function readLocalMedia(name: string): Promise<Buffer | null> {
  if (!safeLocalName(name)) return null;
  try {
    return await readFile(join(localDir, name));
  } catch {
    return null;
  }
}

const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT).map(([type, ext]) => [ext, type]));
export const typeForName = (name: string) => TYPE_BY_EXT[name.split(".").pop() ?? ""] ?? "application/octet-stream";

// Bytes of a stored image, for sending to the model.
export async function mediaForModel(url: string): Promise<{ data: string; mime_type: string } | null> {
  if (url.startsWith("/api/media/")) {
    const name = url.slice("/api/media/".length);
    const bytes = await readLocalMedia(name);
    return bytes ? { data: bytes.toString("base64"), mime_type: typeForName(name) } : null;
  }
  if (!/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(url)) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const mime = (res.headers.get("content-type") ?? "").split(";")[0];
  if (!IMAGE_TYPES.includes(mime)) return null;
  return { data: Buffer.from(await res.arrayBuffer()).toString("base64"), mime_type: mime };
}
