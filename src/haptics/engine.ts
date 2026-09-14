import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";
import {
  getPattern,
  toAndroidPattern,
  toImpactSchedule,
  type Intensity,
  type Pattern,
  type Pulse,
} from "./patterns";
import type { PatternId } from "../types";
import {
  isPulsarAvailable,
  playPulsarPattern,
  playPulsarPreset,
  stopPulsar,
  type PulsarPattern,
} from "./pulsar";

export interface Playback {
  cancel: () => void;
}

const IMPACT_STYLE: Record<Intensity, Haptics.ImpactFeedbackStyle> = {
  soft: Haptics.ImpactFeedbackStyle.Soft,
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

let current: Playback | null = null;

/**
 * Play a pattern on whatever this device supports.
 * Starting a new pattern cancels the one still playing so taps never pile up.
 */
export function playPattern(pattern: Pattern): Playback {
  return playPulses(pattern.pulses);
}

/** Play a bare list of pulses, for haptics that are not one of the named patterns. */
export function playPulses(pulses: Pulse[]): Playback {
  current?.cancel();

  if (Platform.OS === "android") {
    Vibration.vibrate(toAndroidPattern(pulses), false);
    current = { cancel: () => Vibration.cancel() };
    return current;
  }

  // iOS (and web, where impacts are a no-op) get a timed run of impacts.
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const step of toImpactSchedule(pulses)) {
    timers.push(
      setTimeout(() => {
        Haptics.impactAsync(IMPACT_STYLE[step.intensity]).catch(() => {});
      }, step.at),
    );
  }
  current = {
    cancel: () => {
      for (const t of timers) clearTimeout(t);
    },
  };
  return current;
}

export function playPatternById(id: PatternId): Playback {
  return playPattern(getPattern(id));
}

export interface RewardHaptic {
  /** A Pulsar preset name chosen in settings. Wins when Pulsar is available. */
  preset?: string | null;
  /** A composed Pulsar pattern, used when there is no preset and Pulsar is available. */
  pattern?: PulsarPattern;
  /** Scales the composed pattern's amplitudes, 0 to 1. */
  strength?: number;
  /** What plays everywhere else: Expo Go, web, or a build without Pulsar. */
  pulses: Pulse[];
}

/**
 * Play the richest version of a haptic this build supports: a Pulsar preset,
 * then a Pulsar pattern, then the built-in pulses through expo-haptics.
 */
export function playReward(h: RewardHaptic): Playback {
  if (isPulsarAvailable()) {
    current?.cancel();
    stopPulsar();
    const played =
      (h.preset ? playPulsarPreset(h.preset) : false) ||
      (h.pattern ? playPulsarPattern(h.pattern, h.strength ?? 1) : false);
    if (played) {
      current = { cancel: stopPulsar };
      return current;
    }
  }
  return playPulses(h.pulses);
}

/** A barely-there tick, used for "that did nothing" feedback like an early release. */
export function tick(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function stopHaptics(): void {
  current?.cancel();
  current = null;
  stopPulsar();
}
