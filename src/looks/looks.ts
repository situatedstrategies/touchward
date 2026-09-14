import { BACKDROP_COLORS, rgbToHex } from "../design/palette";
import {
  REWARD_MODES,
  RIPPLE_COLOR_SLOTS,
  RIPPLE_LINGERS,
  RIPPLE_MAX_MAX,
  RIPPLE_MAX_MIN,
  RIPPLE_SHAPES,
  RIPPLE_WIDTHS,
  SHAPES,
  STRENGTHS,
  type Settings,
} from "../types";

/** The settings that make up a look: everything you see, plus the tap's strength. */
export const LOOK_KEYS = [
  "shape",
  "rewardMode",
  "rippleShape",
  "rippleLinger",
  "rippleMax",
  "rippleWidth",
  "idleColor",
  "tapColors",
  "randomColors",
  "returnToIdle",
  "rippleColors",
  "rippleFollowButton",
  "backdrop",
  "hapticStrength",
] as const;

export type LookKey = (typeof LOOK_KEYS)[number];
export type LookSettings = Pick<Settings, LookKey>;

export interface SavedLook {
  id: string;
  name: string;
  /** ISO timestamp. */
  savedAt: string;
  look: LookSettings;
}

export function pickLook(settings: Settings): LookSettings {
  const out = {} as Record<LookKey, unknown>;
  for (const key of LOOK_KEYS) out[key] = settings[key];
  return out as LookSettings;
}

export function sameLook(a: LookSettings, b: LookSettings): boolean {
  return JSON.stringify(pickOrdered(a)) === JSON.stringify(pickOrdered(b));
}

function pickOrdered(look: LookSettings): unknown[] {
  return LOOK_KEYS.map((k) => look[k]);
}

const rand = (n: number) => Math.floor(Math.random() * n);
const chance = (p: number) => Math.random() < p;
const pickOne = <T>(list: readonly T[]): T => list[rand(list.length)];

/** Any color at all: each channel drawn uniformly from 0 to 255. */
function randomHex(): string {
  return rgbToHex(rand(256), rand(256), rand(256));
}

const MAX_TAP_COLORS = 6;
const MAX_ATTEMPTS = 6;

/**
 * A truly random look. Every field is drawn independently from the app's own
 * option lists (shapes, modes, ripple outlines, backdrops, strengths) and
 * every color from the full hex space, so no two presses share a palette. The
 * result is checked against the current look and redrawn if it matches.
 */
export function randomLook(current?: LookSettings): LookSettings {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const backdropRoll = rand(4);
    const look: LookSettings = {
      shape: pickOne(SHAPES).id,
      rewardMode: pickOne(REWARD_MODES).id,
      rippleShape: pickOne(RIPPLE_SHAPES).id,
      rippleLinger: pickOne(RIPPLE_LINGERS).value,
      rippleMax: RIPPLE_MAX_MIN + rand(RIPPLE_MAX_MAX - RIPPLE_MAX_MIN + 1),
      rippleWidth: pickOne(RIPPLE_WIDTHS).id,
      idleColor: randomHex(),
      tapColors: Array.from({ length: 1 + rand(MAX_TAP_COLORS) }, randomHex),
      randomColors: chance(0.5),
      returnToIdle: chance(0.5),
      rippleColors: Array.from({ length: RIPPLE_COLOR_SLOTS }, randomHex),
      rippleFollowButton: chance(0.25),
      backdrop:
        backdropRoll === 0
          ? "navy"
          : backdropRoll === 1
            ? "system"
            : backdropRoll === 2
              ? pickOne(BACKDROP_COLORS).hex
              : randomHex(),
      hapticStrength: pickOne(STRENGTHS).value,
    };
    if (!current || !sameLook(look, current)) return look;
  }
  return randomLook();
}

/** A default name for a new saved look: the shape and the mode, numbered if taken. */
export function suggestName(look: LookSettings, existing: SavedLook[]): string {
  const shape = SHAPES.find((s) => s.id === look.shape)?.label ?? "Look";
  const mode = REWARD_MODES.find((m) => m.id === look.rewardMode)?.label ?? "";
  const base = `${shape} ${mode}`.trim();
  if (!existing.some((l) => l.name === base)) return base;
  let n = 2;
  while (existing.some((l) => l.name === `${base} ${n}`)) n++;
  return `${base} ${n}`;
}
