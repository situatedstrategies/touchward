import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";
import {
  toAndroidPattern,
  toImpactSchedule,
  type Intensity,
  type Pattern,
  type Pulse,
} from "./patterns";
import {
  isPulsarAvailable,
  playPulsarPattern,
  playPulsarPreset,
  preparePulsarPattern,
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

function playPulses(pulses: Pulse[]): Playback {
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

export interface RewardHaptic {
  /** A Pulsar preset name chosen in settings. Wins when Pulsar is available. */
  preset?: string | null;
  /** A composed Pulsar pattern, used when there is no preset and Pulsar is available. */
  pattern?: PulsarPattern;
  /** Scales the composed pattern's amplitudes, 0 to 1. */
  strength?: number;
  /** What plays when Pulsar is not available: built in pulses through expo-haptics. */
  pulses: Pulse[];
}

/**
 * Parse a reward's Pulsar pattern ahead of time (see preparePulsarPattern).
 * Safe to call often; a pattern already parsed is a cache hit.
 */
export function prepareReward(h: RewardHaptic): void {
  if (h.preset || !h.pattern || !isPulsarAvailable()) return;
  preparePulsarPattern(h.pattern, h.strength ?? 1);
}

/**
 * Play the richest version of a haptic this build supports: a Pulsar preset,
 * then a Pulsar pattern, then the built-in pulses through expo-haptics.
 *
 * Pulsar is not stopped first: rewards are short and may overlap, and stopping
 * halts the Core Haptics engine, which then has to restart before the new
 * pattern plays (the first taps after a stop were often silent). It also ran
 * on the main thread at the same moment a pattern parse ran on the JavaScript
 * thread, which crashed inside Pulsar.
 */
export function playReward(h: RewardHaptic): Playback {
  const strength = h.strength ?? 1;
  if (isPulsarAvailable()) {
    current?.cancel();
    const played =
      (h.preset ? playPulsarPreset(h.preset) : false) ||
      (h.pattern ? playPulsarPattern(h.pattern, strength) : false);
    if (played) {
      current = { cancel: () => {} };
      return current;
    }
  }
  return playPulses(strength > 1 ? harden(h.pulses, strength) : h.pulses);
}

/** Without Pulsar: heavy impacts, and each pulse doubled (Hard) or tripled (Max). */
function harden(pulses: Pulse[], strength: number): Pulse[] {
  const copies = strength >= 2 ? 3 : 2;
  return pulses.flatMap((p) => {
    const hit: Pulse = { ms: Math.max(p.ms, 45), gap: 55, intensity: "heavy" };
    const out = Array.from({ length: copies }, () => ({ ...hit }));
    out[out.length - 1] = { ...hit, gap: p.gap };
    return out;
  });
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
