/**
 * The neon look from the app icon: deep navy behind a glowing core and
 * pink, cyan, and violet ripples. Used for the backdrop, the timer ring, and
 * the default ripple colors. Everything else follows the user's color choices.
 */
export const NEON = {
  backgroundTop: "#12307C",
  backgroundBottom: "#040A26",
  centerGlow: "#2453E6",
  timer: "#8FE9FF",
  timerTrack: "rgba(255, 255, 255, 0.14)",
  pink: "#E6A9FF",
  cyan: "#8DEDFF",
  violet: "#BBA4FF",
  blue: "#2C66FF",
  sky: "#5FC4FF",
} as const;

/**
 * Solid backdrop choices: pale pastels, electric neons, black, and white.
 * "navy" (the icon's gradient) and "system" are handled separately.
 */
export const BACKDROP_COLORS: { hex: string; name: string }[] = [
  { hex: "#FFE4F1", name: "Pale pink" },
  { hex: "#E0F2FF", name: "Pale blue" },
  { hex: "#E3FFF3", name: "Pale mint" },
  { hex: "#EEE6FF", name: "Pale lavender" },
  { hex: "#FFF7CC", name: "Pale yellow" },
  { hex: "#FFE9D6", name: "Pale peach" },
  { hex: "#FF2D95", name: "Electric pink" },
  { hex: "#00E5FF", name: "Electric cyan" },
  { hex: "#7C3AFF", name: "Electric violet" },
  { hex: "#39FF14", name: "Electric green" },
  { hex: "#FFE600", name: "Electric yellow" },
  { hex: "#FF6A00", name: "Electric orange" },
  { hex: "#000000", name: "Black" },
  { hex: "#FFFFFF", name: "White" },
];

/** Relative luminance, 0 (black) to 1 (white). Non-hex input counts as dark. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDarkColor(hex: string): boolean {
  return luminance(hex) < 0.35;
}

/** "#RRGGBB" mixed toward white by `amount` (0 to 1). Non-hex input passes through. */
export function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) => Math.round(c + (255 - c) * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/** "#RRGGBB" mixed toward black by `amount` (0 to 1). Non-hex input passes through. */
export function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) => Math.round(c * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * `count` related tints of one color for cascades and rings drawn from a single
 * choice: the color itself, then paler and deeper takes, alternating.
 */
export function colorVariants(base: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) out.push(base);
    else if (i % 2 === 1) out.push(lighten(base, Math.min(0.75, 0.3 * ((i + 1) / 2))));
    else out.push(darken(base, Math.min(0.5, 0.2 * (i / 2))));
  }
  return out;
}

/** "#RRGGBB" or "#RGB" to "rgba(r, g, b, a)". Non-hex input passes through. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** True for "#RRGGBB" or "#RGB" (case insensitive). */
export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Any accepted hex form to upper case "#RRGGBB". Returns null for anything else. */
export function normalizeHex(value: string): string | null {
  const v = value.trim().replace(/^([0-9a-f]{3}|[0-9a-f]{6})$/i, "#$1");
  const rgb = parseHex(v);
  if (!rgb) return null;
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export interface Hsv {
  /** 0 to 360. */
  h: number;
  /** 0 to 1. */
  s: number;
  /** 0 to 1. */
  v: number;
}

export function hexToHsv(hex: string): Hsv {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
