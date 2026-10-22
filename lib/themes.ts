import type { ThemeId } from "./schema";

type Palette = {
  name: string;
  bg: string; // page background
  surface: string; // cards
  ink: string; // main text
  muted: string; // secondary text
  line: string; // borders
  accent: string; // buttons, prices
  accentInk: string; // text on accent
  soft: string; // tinted section background
};

export type Theme = {
  id: ThemeId;
  label: string;
  display: string; // heading font stack
  body: string; // body font stack
  displayWeight: number;
  headingCase: "none" | "uppercase";
  tracking: string; // heading letter-spacing
  radius: string;
  palettes: [Palette, Palette, Palette];
};

const indic = 'var(--f-kannada), var(--f-devanagari), system-ui, sans-serif';

export const THEMES: Record<ThemeId, Theme> = {
  boutique: {
    id: "boutique",
    label: "Boutique",
    display: `var(--f-cormorant), Georgia, ${indic}`,
    body: `var(--f-jost), ${indic}`,
    displayWeight: 600,
    headingCase: "none",
    tracking: "-0.01em",
    radius: "2px",
    palettes: [
      { name: "Maroon", bg: "#fbf7f2", surface: "#ffffff", ink: "#2a1a1f", muted: "#6f5f63", line: "#eadfd8", accent: "#7a1f3d", accentInk: "#fff", soft: "#f4ebe4" },
      { name: "Emerald", bg: "#f7f8f4", surface: "#ffffff", ink: "#16241f", muted: "#5c6a64", line: "#dfe5df", accent: "#1f5c4a", accentInk: "#fff", soft: "#e9efe9" },
      { name: "Gold", bg: "#141214", surface: "#1d1a1d", ink: "#f4ece1", muted: "#b5a99a", line: "#332d30", accent: "#c9a35a", accentInk: "#141214", soft: "#1a1719" },
    ],
  },
  kitchen: {
    id: "kitchen",
    label: "Kitchen",
    display: `var(--f-fraunces), Georgia, ${indic}`,
    body: `var(--f-nunito), ${indic}`,
    displayWeight: 700,
    headingCase: "none",
    tracking: "-0.02em",
    radius: "18px",
    palettes: [
      { name: "Tomato", bg: "#fff8ef", surface: "#ffffff", ink: "#2b1d14", muted: "#6e5b4d", line: "#f0e0cc", accent: "#d9480f", accentInk: "#fff", soft: "#fdebd3" },
      { name: "Leaf", bg: "#f6f8ef", surface: "#ffffff", ink: "#1e2617", muted: "#5f6a54", line: "#e1e7d3", accent: "#4d7c0f", accentInk: "#fff", soft: "#e8efd6" },
      { name: "Cocoa", bg: "#f8f1ea", surface: "#fffaf5", ink: "#2a1b12", muted: "#715c4e", line: "#eadbcd", accent: "#7c3f1d", accentInk: "#fff", soft: "#efe1d3" },
    ],
  },
  fresh: {
    id: "fresh",
    label: "Fresh",
    display: `var(--f-baloo), ${indic}`,
    body: `var(--f-hind), ${indic}`,
    displayWeight: 800,
    headingCase: "none",
    tracking: "-0.01em",
    radius: "16px",
    palettes: [
      { name: "Green", bg: "#f5faf3", surface: "#ffffff", ink: "#13251a", muted: "#556b5c", line: "#dcebdc", accent: "#15803d", accentInk: "#fff", soft: "#e3f3e2" },
      { name: "Mango", bg: "#fffbeb", surface: "#ffffff", ink: "#271d06", muted: "#6b5c33", line: "#f3e6bd", accent: "#d97706", accentInk: "#fff", soft: "#fef0c7" },
      { name: "Teal", bg: "#f2faf9", surface: "#ffffff", ink: "#0f2523", muted: "#4f6866", line: "#d5ebe8", accent: "#0f766e", accentInk: "#fff", soft: "#dcf2ef" },
    ],
  },
  studio: {
    id: "studio",
    label: "Studio",
    display: `var(--f-sora), ${indic}`,
    body: `var(--f-manrope), ${indic}`,
    displayWeight: 700,
    headingCase: "none",
    tracking: "-0.03em",
    radius: "12px",
    palettes: [
      { name: "Navy", bg: "#f6f7fb", surface: "#ffffff", ink: "#111827", muted: "#5b6475", line: "#e3e6ef", accent: "#1d3fae", accentInk: "#fff", soft: "#e8ecf8" },
      { name: "Plum", bg: "#faf7fb", surface: "#ffffff", ink: "#1f1424", muted: "#6a5b70", line: "#ece3ef", accent: "#7e22ce", accentInk: "#fff", soft: "#f1e6f6" },
      { name: "Night", bg: "#0f1218", surface: "#171b24", ink: "#eef1f7", muted: "#9aa3b5", line: "#262c38", accent: "#38bdf8", accentInk: "#0f1218", soft: "#141821" },
    ],
  },
  craft: {
    id: "craft",
    label: "Craft",
    display: `var(--f-playfair), Georgia, ${indic}`,
    body: `var(--f-mulish), ${indic}`,
    displayWeight: 700,
    headingCase: "none",
    tracking: "-0.01em",
    radius: "8px",
    palettes: [
      { name: "Terracotta", bg: "#faf5ef", surface: "#fffdf9", ink: "#2b1f17", muted: "#72614f", line: "#ecdfcf", accent: "#b4532a", accentInk: "#fff", soft: "#f2e5d6" },
      { name: "Indigo", bg: "#f5f6fa", surface: "#ffffff", ink: "#1b1d33", muted: "#5f6283", line: "#e0e2ee", accent: "#3730a3", accentInk: "#fff", soft: "#e7e8f5" },
      { name: "Olive", bg: "#f6f5ee", surface: "#fffef8", ink: "#24241a", muted: "#67664f", line: "#e5e3d1", accent: "#6b6b1f", accentInk: "#fff", soft: "#ecebdb" },
    ],
  },
  bazaar: {
    id: "bazaar",
    label: "Bazaar",
    display: `var(--f-archivo), ${indic}`,
    body: `var(--f-archivo), ${indic}`,
    displayWeight: 800,
    headingCase: "uppercase",
    tracking: "-0.01em",
    radius: "10px",
    palettes: [
      { name: "Signal", bg: "#f7f7f5", surface: "#ffffff", ink: "#141414", muted: "#5c5c58", line: "#e4e4df", accent: "#e11d48", accentInk: "#fff", soft: "#ececE7" },
      { name: "Electric", bg: "#f5f7fa", surface: "#ffffff", ink: "#0d1220", muted: "#566074", line: "#e0e5ee", accent: "#2563eb", accentInk: "#fff", soft: "#e6ebf5" },
      { name: "Sun", bg: "#151515", surface: "#1f1f1f", ink: "#f6f6f3", muted: "#a8a8a2", line: "#2e2e2e", accent: "#facc15", accentInk: "#151515", soft: "#1a1a1a" },
    ],
  },
};

export function themeVars(id: ThemeId, accent: number): Record<string, string> {
  const t = THEMES[id] ?? THEMES.bazaar;
  const p = t.palettes[accent] ?? t.palettes[0];
  return {
    "--s-bg": p.bg,
    "--s-surface": p.surface,
    "--s-ink": p.ink,
    "--s-muted": p.muted,
    "--s-line": p.line,
    "--s-accent": p.accent,
    "--s-accent-ink": p.accentInk,
    "--s-soft": p.soft,
    "--s-display": t.display,
    "--s-body": t.body,
    "--s-display-weight": String(t.displayWeight),
    "--s-heading-case": t.headingCase,
    "--s-tracking": t.tracking,
    "--s-radius": t.radius,
  };
}
