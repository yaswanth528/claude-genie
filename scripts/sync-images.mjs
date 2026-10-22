// Copies images dropped in the project root (or ./images) into public/images
// so the landing page can show them. Runs before `dev` and `build`.
import { readdirSync, mkdirSync, copyFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.cwd();
const out = join(root, "public", "images");
const exts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);

mkdirSync(out, { recursive: true });
let copied = 0;
for (const dir of [root, join(root, "images")]) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const src = join(dir, name);
    if (!statSync(src).isFile() || !exts.has(extname(name).toLowerCase())) continue;
    copyFileSync(src, join(out, name));
    copied++;
  }
}
console.log(`sync-images: ${copied} image(s) -> public/images`);
