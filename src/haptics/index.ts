import { PATTERNS, type Pattern } from "./patterns";
import type { PatternId } from "../types";

export { playPattern, playReward, stopHaptics, tick, type RewardHaptic } from "./engine";
export {
  isPulsarAvailable,
  playPulsarPreset,
  presetLabel,
  pulsarPresetNames,
  pulsarSupportLevel,
  type PulsarPattern,
} from "./pulsar";
export { PATTERNS, getPattern, patternDuration } from "./patterns";
export type { Pattern, Pulse, Intensity } from "./patterns";

export const PATTERNS_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<
  PatternId,
  Pattern
>;
