import { pulsarPresetNames } from "../haptics";
import type { LookSettings } from "../looks/looks";
import {
  DEFAULT_SETTINGS,
  PATTERN_IDS,
  REWARD_MODES,
  RIPPLE_LINGERS,
  RIPPLE_SHAPES,
  RIPPLE_WIDTHS,
  SHAPES,
  STRENGTHS,
  type PatternId,
  type RewardMode,
  type Settings,
  type Shape,
} from "../types";

/**
 * What the free app includes. The rule is "the first three of everything":
 * the first three options in every list, all button and ripple colors, the
 * navy and phone backdrops, reminders, and the shortcut link. Everything past
 * that, plus custom backdrops, calendar nudges, and volume button taps, needs
 * the unlock. When a list has three options or fewer nothing in it is locked.
 */
export const FREE_COUNT = 3;
/** How many looks the free app keeps in the library. */
export const FREE_SAVED_LOOKS = 3;

function firstFree<T>(list: readonly T[], match: (item: T) => boolean): boolean {
  const index = list.findIndex(match);
  return index === -1 || index < FREE_COUNT;
}

export const isFreeShape = (id: Shape) => firstFree(SHAPES, (s) => s.id === id);
export const isFreeRewardMode = (id: RewardMode) => firstFree(REWARD_MODES, (m) => m.id === id);
export const isFreePattern = (id: PatternId) => firstFree(PATTERN_IDS, (p) => p === id);
export const isFreeStrength = (value: number) =>
  firstFree(STRENGTHS, (s) => Math.abs(s.value - value) < 0.01);
export const isFreeRippleShape = (id: Settings["rippleShape"]) =>
  firstFree(RIPPLE_SHAPES, (s) => s.id === id);
export const isFreeRippleWidth = (id: Settings["rippleWidth"]) =>
  firstFree(RIPPLE_WIDTHS, (w) => w.id === id);
export const isFreeLinger = (value: number) =>
  firstFree(RIPPLE_LINGERS, (l) => l.value === value);
export const isFreeRippleMax = (n: number) => n <= FREE_COUNT;
/** Navy and the phone's own look are free; any color is not. */
export const isFreeBackdrop = (backdrop: string) =>
  backdrop === "navy" || backdrop === "system";

/** The first three Pulsar presets in the picker's order. Null (the mode's own haptic) is free. */
export function isFreePreset(name: string | null): boolean {
  if (name === null) return true;
  return firstFree(pulsarPresetNames(), (n) => n === name);
}

/** Every setting in a look is one the free app allows. */
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
    isFreePreset(look.tapPreset)
  );
}

/**
 * The parts of the settings the free app must not keep: each locked value is
 * replaced with a free one. Returns only the keys that change, so an empty
 * object means nothing had to move.
 */
export function lockedToFree(settings: Settings): Partial<Settings> {
  const d = DEFAULT_SETTINGS;
  const patch: Partial<Settings> = {};
  if (!isFreeShape(settings.shape)) patch.shape = d.shape;
  if (!isFreeRewardMode(settings.rewardMode)) patch.rewardMode = d.rewardMode;
  if (!isFreePattern(settings.holdPattern)) patch.holdPattern = PATTERN_IDS[0];
  if (!isFreeStrength(settings.hapticStrength))
    patch.hapticStrength = STRENGTHS[FREE_COUNT - 1].value;
  if (!isFreeRippleShape(settings.rippleShape)) patch.rippleShape = d.rippleShape;
  if (!isFreeRippleWidth(settings.rippleWidth)) patch.rippleWidth = d.rippleWidth;
  if (!isFreeLinger(settings.rippleLinger))
    patch.rippleLinger = RIPPLE_LINGERS[FREE_COUNT - 1].value;
  if (!isFreeRippleMax(settings.rippleMax)) patch.rippleMax = FREE_COUNT;
  if (!isFreeBackdrop(settings.backdrop)) patch.backdrop = d.backdrop;
  if (!isFreePreset(settings.tapPreset)) patch.tapPreset = null;
  if (!isFreePreset(settings.holdPreset)) patch.holdPreset = null;
  if (settings.calendarNudges.enabled) {
    patch.calendarNudges = { ...settings.calendarNudges, enabled: false };
  }
  if (settings.volumeButtons) patch.volumeButtons = false;
  return patch;
}

/** A look with every locked choice swapped for a free one, for the free app's Random button. */
export function lookToFree(look: LookSettings): LookSettings {
  return {
    ...look,
    shape: isFreeShape(look.shape) ? look.shape : SHAPES[0].id,
    rewardMode: isFreeRewardMode(look.rewardMode) ? look.rewardMode : REWARD_MODES[0].id,
    rippleShape: isFreeRippleShape(look.rippleShape) ? look.rippleShape : RIPPLE_SHAPES[0].id,
    rippleWidth: isFreeRippleWidth(look.rippleWidth) ? look.rippleWidth : RIPPLE_WIDTHS[0].id,
    rippleLinger: isFreeLinger(look.rippleLinger)
      ? look.rippleLinger
      : RIPPLE_LINGERS[FREE_COUNT - 1].value,
    rippleMax: Math.min(look.rippleMax, FREE_COUNT),
    backdrop: isFreeBackdrop(look.backdrop)
      ? look.backdrop
      : Math.random() < 0.5
        ? "navy"
        : "system",
    hapticStrength: isFreeStrength(look.hapticStrength)
      ? look.hapticStrength
      : STRENGTHS[FREE_COUNT - 1].value,
    tapPreset: isFreePreset(look.tapPreset) ? look.tapPreset : null,
  };
}
