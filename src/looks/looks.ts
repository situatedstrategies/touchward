import { BACKDROP_COLORS, hsvToHex } from "../design/palette";
import {
  REWARD_MODES,
  RIPPLE_COLOR_SLOTS,
  RIPPLE_SHAPES,
  SHAPES,
  SWATCHES,
  type Settings,
} from "../types";

/** The settings that make up a look: everything you see, plus the tap's strength. */
export const LOOK_KEYS = [
  "shape",
  "rewardMode",
  "rippleShape",
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
const wrapHue = (h: number) => ((h % 360) + 360) % 360;

/** A vivid color near a hue. */
function vivid(hue: number): string {
  return hsvToHex({
    h: wrapHue(hue),
    s: 0.65 + Math.random() * 0.35,
    v: 0.85 + Math.random() * 0.15,
  });
}

/** A pale, luminous color near a hue, like the icon's rings. */
function pale(hue: number): string {
  return hsvToHex({
    h: wrapHue(hue),
    s: 0.3 + Math.random() * 0.3,
    v: 0.95 + Math.random() * 0.05,
  });
}

/**
 * A fresh look. Colors are built around one base hue so the result reads as a
 * palette rather than noise: the button cycles through related hues and the
 * ripples take pale neighbors of the same family.
 */
export function randomLook(): LookSettings {
  const base = Math.random() * 360;
  const schemes = [
    [0, 30, 60],
    [0, 120, 240],
    [0, 150, 210],
    [0, 40, 180],
    [0, 90],
  ];
  const offsets = pickOne(schemes);
  const tapColors = offsets.map((o) => (chance(0.3) ? pickOne(SWATCHES) : vivid(base + o)));
  const rippleColors = Array.from({ length: RIPPLE_COLOR_SLOTS }, (_, i) =>
    pale(base + [0, 35, -35][i % 3] + (chance(0.5) ? 180 : 0)),
  );

  let backdrop: string;
  const roll = Math.random();
  if (roll < 0.5) backdrop = "navy";
  else if (roll < 0.65) backdrop = "system";
  else if (roll < 0.85) backdrop = pickOne(BACKDROP_COLORS).hex;
  else backdrop = hsvToHex({ h: wrapHue(base + 180), s: 0.7, v: 0.16 + Math.random() * 0.14 });

  const rippleShapeRoll = Math.random();
  return {
    shape: pickOne(SHAPES).id,
    rewardMode: pickOne(REWARD_MODES).id,
    rippleShape:
      rippleShapeRoll < 0.4 ? "match" : rippleShapeRoll < 0.8 ? "wavy" : RIPPLE_SHAPES[2].id,
    idleColor: chance(0.5) ? vivid(base) : tapColors[0],
    tapColors,
    randomColors: chance(0.3),
    returnToIdle: chance(0.25),
    rippleColors,
    rippleFollowButton: chance(0.2),
    backdrop,
    hapticStrength: pickOne([0.45, 0.8, 1]),
  };
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
