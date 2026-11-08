import type { LookSettings } from "../looks/looks";
import {
  DEFAULT_SETTINGS,
  type PatternId,
  type RewardMode,
  type Settings,
  type Shape,
} from "../types";

/**
 * What the free app includes: the default look, and nothing past it. One
 * purchase, Touchward Full (entitlement "full"), opens every other choice in
 * Customize, Reward and Colors, and lifts the daily limit (store/dailyCap.ts).
 *
 * Press style, the hold timer length, notifications, triggers, touch sounds,
 * the counter and support are not look settings and stay free, as do the
 * saved color libraries (data, not a look).
 *
 * Pure: no React and no native module, so the rules are unit tested.
 */
const d = DEFAULT_SETTINGS;

const sameHex = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();
const sameHexList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((hex, i) => sameHex(hex, b[i]));
const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

export const isFreeShape = (id: Shape) => id === d.shape;
export const isFreeRewardMode = (id: RewardMode) => id === d.rewardMode;
export const isFreePattern = (id: PatternId) => id === d.holdPattern;
export const isFreeStrength = (value: number) => near(value, d.hapticStrength);
export const isFreeRippleShape = (id: Settings["rippleShape"]) => id === d.rippleShape;
export const isFreeRippleWidth = (id: Settings["rippleWidth"]) => id === d.rippleWidth;
export const isFreeLinger = (value: number) => value === d.rippleLinger;
export const isFreeRippleMax = (n: number) => n === d.rippleMax;
export const isFreeBackdrop = (backdrop: string) => backdrop === d.backdrop;
/** The mode's own haptic (null) is the default; every Pulsar preset is Full. */
export const isFreePreset = (name: string | null) => name === null;
export const isFreeIdleColor = (hex: string) => sameHex(hex, d.idleColor);
export const isFreeTapColors = (colors: readonly string[]) => sameHexList(colors, d.tapColors);
export const isFreeRippleColors = (colors: readonly string[]) =>
  sameHexList(colors, d.rippleColors);
/** Shuffle, snap back and follow-the-button are off in the default look. */
export const isFreeColorBehavior = (look: {
  randomColors: boolean;
  returnToIdle: boolean;
  rippleFollowButton: boolean;
}) =>
  look.randomColors === d.randomColors &&
  look.returnToIdle === d.returnToIdle &&
  look.rippleFollowButton === d.rippleFollowButton;

/** Every setting in a look is one the free app allows: the default look. */
export function isFreeLook(look: LookSettings): boolean {
  return (
    isFreeShape(look.shape) &&
    isFreeRewardMode(look.rewardMode) &&
    isFreeRippleShape(look.rippleShape) &&
    isFreeRippleWidth(look.rippleWidth) &&
    isFreeLinger(look.rippleLinger) &&
    isFreeRippleMax(look.rippleMax) &&
    isFreeBackdrop(look.backdrop) &&
    isFreeStrength(look.hapticStrength) &&
    isFreePreset(look.tapPreset) &&
    isFreeIdleColor(look.idleColor) &&
    isFreeTapColors(look.tapColors) &&
    isFreeRippleColors(look.rippleColors) &&
    isFreeColorBehavior(look)
  );
}

/**
 * The parts of the settings the free app must not keep: each locked value is
 * replaced with the default. Returns only the keys that change, so an empty
 * object means nothing had to move.
 */
export function lockedToFree(settings: Settings): Partial<Settings> {
  const patch: Partial<Settings> = {};
  if (!isFreeShape(settings.shape)) patch.shape = d.shape;
  if (!isFreeRewardMode(settings.rewardMode)) patch.rewardMode = d.rewardMode;
  if (!isFreePattern(settings.holdPattern)) patch.holdPattern = d.holdPattern;
  if (!isFreeStrength(settings.hapticStrength)) patch.hapticStrength = d.hapticStrength;
  if (!isFreeRippleShape(settings.rippleShape)) patch.rippleShape = d.rippleShape;
  if (!isFreeRippleWidth(settings.rippleWidth)) patch.rippleWidth = d.rippleWidth;
  if (!isFreeLinger(settings.rippleLinger)) patch.rippleLinger = d.rippleLinger;
  if (!isFreeRippleMax(settings.rippleMax)) patch.rippleMax = d.rippleMax;
  if (!isFreeBackdrop(settings.backdrop)) patch.backdrop = d.backdrop;
  if (!isFreePreset(settings.tapPreset)) patch.tapPreset = null;
  if (!isFreePreset(settings.holdPreset)) patch.holdPreset = null;
  if (!isFreeIdleColor(settings.idleColor)) patch.idleColor = d.idleColor;
  if (!isFreeTapColors(settings.tapColors)) patch.tapColors = [...d.tapColors];
  if (!isFreeRippleColors(settings.rippleColors)) patch.rippleColors = [...d.rippleColors];
  if (settings.randomColors !== d.randomColors) patch.randomColors = d.randomColors;
  if (settings.returnToIdle !== d.returnToIdle) patch.returnToIdle = d.returnToIdle;
  if (settings.rippleFollowButton !== d.rippleFollowButton)
    patch.rippleFollowButton = d.rippleFollowButton;
  return patch;
}
