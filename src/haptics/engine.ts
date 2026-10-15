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
  pulsarPresetNames,
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

/**
 * The berserk rumble: three seconds of the motor at full tilt, its amplitude
 * and sharpness lurching every 150 ms, with a hard tap on every lurch. One
 * fixed pattern, so Pulsar parses it once and the cache stays small; the
 * randomness comes from the presets fired on top of it.
 */
export const BERSERK_MS = 3200;
const BERSERK_STEP_MS = 150;
const BERSERK_RUMBLE: PulsarPattern = (() => {
  const steps = Math.floor(BERSERK_MS / BERSERK_STEP_MS);
  const amplitude = [];
  const frequency = [];
  const discretePattern = [];
  for (let i = 0; i < steps; i++) {
    const time = i * BERSERK_STEP_MS;
    amplitude.push({ time, value: i % 2 === 0 ? 1 : 0.55 });
    frequency.push({ time, value: ((i * 7) % 10) / 10 });
    discretePattern.push({ time, amplitude: 1, frequency: i % 3 === 0 ? 0.2 : 0.9 });
  }
  amplitude.push({ time: BERSERK_MS, value: 0 });
  frequency.push({ time: BERSERK_MS, value: 0.5 });
  return { discretePattern, continuousPattern: { amplitude, frequency } };
})();

const berserkTimers = new Set<ReturnType<typeof setTimeout>>();

/** Parse the berserk rumble ahead of time (see preparePulsarPattern). */
export function prepareBerserk(): void {
  if (isPulsarAvailable()) preparePulsarPattern(BERSERK_RUMBLE, 1);
}

/**
 * Every 500 rewards: the phone buzzes like crazy for BERSERK_MS. With Pulsar,
 * the rumble above plus a random preset every 70 to 180 ms on top of it.
 * Without it, a run of random pulses through the built-in haptics. Taps that
 * land during the burst play as usual over it; `stopBerserk` ends it early.
 */
export function playBerserk(): void {
  stopBerserk();
  if (isPulsarAvailable()) {
    playPulsarPattern(BERSERK_RUMBLE, 1);
    const names = pulsarPresetNames();
    const started = Date.now();
    const next = () => {
      const timer = setTimeout(
        () => {
          berserkTimers.delete(timer);
          if (Date.now() - started >= BERSERK_MS) return;
          if (names.length > 0)
            playPulsarPreset(names[Math.floor(Math.random() * names.length)]);
          next();
        },
        70 + Math.random() * 110,
      );
      berserkTimers.add(timer);
    };
    next();
    return;
  }
  const pulses: Pulse[] = [];
  let total = 0;
  while (total < BERSERK_MS) {
    const pulse: Pulse = {
      ms: 30 + Math.floor(Math.random() * 80),
      gap: 15 + Math.floor(Math.random() * 55),
      intensity: Math.random() < 0.7 ? "heavy" : "medium",
    };
    pulses.push(pulse);
    total += pulse.ms + pulse.gap;
  }
  playPulses(pulses);
}

export function stopBerserk(): void {
  for (const t of berserkTimers) clearTimeout(t);
  berserkTimers.clear();
}

/** A barely-there tick, used for "that did nothing" feedback like an early release. */
export function tick(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function stopHaptics(): void {
  current?.cancel();
  current = null;
  stopBerserk();
  stopPulsar();
}
