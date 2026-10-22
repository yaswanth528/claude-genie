"use client";
// Uploads one photo or video. Photos are shrunk in the browser first (max 1600px JPEG),
// which makes uploads fast on slow mobile connections. Goes straight to Vercel Blob when
// it's configured, otherwise to this server's local store.
import { upload as blobUpload } from "@vercel/blob/client";

export type Uploaded = { url: string; kind: "image" | "video"; name: string };

type Mode = { mode: "blob" | "server"; maxBytes: number };
let modePromise: Promise<Mode> | null = null;
const uploadMode = () =>
  (modePromise ??= fetch("/api/upload")
    .then((r) => r.json())
    .then((d) => ({ mode: d.mode === "blob" ? ("blob" as const) : ("server" as const), maxBytes: Number(d.maxBytes) || 4 * 1024 * 1024 }))
    .catch(() => ({ mode: "server" as const, maxBytes: 4 * 1024 * 1024 })));

async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // e.g. a HEIC the browser can't decode; the server still accepts it
  }
}

export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<Uploaded> {
  const kind = file.type.startsWith("video/") ? "video" : "image";
  if (!file.type.startsWith("image/") && kind !== "video") throw new Error(`${file.name}: only photos and videos can be added.`);
  if (kind === "video" && file.size > 100 * 1024 * 1024) throw new Error(`${file.name} is over 100 MB. Try a shorter clip.`);
  const body = kind === "image" ? await shrinkImage(file) : file;
  const type = body === file ? file.type : "image/jpeg";
  const ext = type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || kind;

  const { mode, maxBytes } = await uploadMode();
  if (body.size > maxBytes)
    throw new Error(`${file.name} is too big (max ${Math.floor(maxBytes / 1024 / 1024)} MB).${kind === "video" ? " Try a shorter clip." : ""}`);
  if (mode === "blob") {
    const blob = await blobUpload(`uploads/${kind}.${ext}`, body, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType: type,
      multipart: body.size > 20 * 1024 * 1024,
      onUploadProgress: (p) => onProgress?.(p.percentage),
    });
    return { url: blob.url, kind, name };
  }

  const form = new FormData();
  form.append("file", new File([body], `${name}.${ext}`, { type }));
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Couldn't upload ${file.name}.`);
  onProgress?.(100);
  return { url: data.url, kind, name };
}
