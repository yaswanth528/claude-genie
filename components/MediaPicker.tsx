"use client";
import { useRef, useState } from "react";
import { uploadFile, type Uploaded } from "./upload";

type Pending = { id: string; name: string; pct: number; preview: string | null; error?: string };

// "Browse files" for photos and videos, with previews and per-file progress.
export function MediaPicker({ value, onChange, max = 12 }: { value: Uploaded[]; onChange: (m: Uploaded[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const latest = useRef(value);
  latest.current = value;

  async function add(files: FileList | File[]) {
    const list = Array.from(files).slice(0, Math.max(0, max - latest.current.length - pending.length));
    await Promise.all(
      list.map(async (file) => {
        const id = Math.random().toString(36).slice(2);
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        setPending((p) => [...p, { id, name: file.name, pct: 0, preview }]);
        try {
          const up = await uploadFile(file, (pct) => setPending((p) => p.map((x) => (x.id === id ? { ...x, pct } : x))));
          onChange([...latest.current, up]);
          setPending((p) => p.filter((x) => x.id !== id));
        } catch (err) {
          setPending((p) => p.map((x) => (x.id === id ? { ...x, error: (err as Error).message } : x)));
        } finally {
          if (preview) setTimeout(() => URL.revokeObjectURL(preview), 30_000);
        }
      }),
    );
  }

  const full = value.length + pending.length >= max;

  return (
    <div>
      <div
        className={`dropzone ${dragging ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
      >
        <p>
          <strong>Add photos or videos</strong> <span className="hint">(optional)</span>
        </p>
        <p className="hint">Shop front, products, your work. We’ll place them on your website. No photos? We’ll create pictures for you.</p>
        <button type="button" className="btn ghost" onClick={() => input.current?.click()} disabled={full}>
          Browse files
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(value.length > 0 || pending.length > 0) && (
        <ul className="thumbs">
          {value.map((m, i) => (
            <li key={m.url}>
              {m.kind === "video" ? (
                <video src={m.url} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.name} />
              )}
              {m.kind === "video" && <span className="thumb-tag">Video</span>}
              <button type="button" className="thumb-x" aria-label={`Remove ${m.name}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                ×
              </button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className={p.error ? "failed" : "loading"} title={p.error}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.preview ? <img src={p.preview} alt="" /> : <div className="thumb-ph">Video</div>}
              <span className="thumb-tag">{p.error ? "Failed" : `${Math.round(p.pct)}%`}</span>
              {p.error && (
                <button type="button" className="thumb-x" aria-label="Dismiss" onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {pending.some((p) => p.error) && <p className="error">{pending.find((p) => p.error)?.error}</p>}
    </div>
  );
}
