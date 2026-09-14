import { Platform, TurboModuleRegistry } from "react-native";

/**
 * Optional richer haptics through Pulsar (react-native-pulsar by Software
 * Mansion): over 150 presets and composed patterns with amplitude and
 * sharpness envelopes, on iOS Core Haptics and Android VibrationEffect.
 *
 * Pulsar is a native module, so it exists only in builds that include it. The
 * package resolves its native module at import time and throws when it is
 * missing, so everything here checks TurboModuleRegistry first and only then
 * requires the package. Without it, callers fall back to expo-haptics.
 */

export interface PulsarPattern {
  /** Taps: when (ms), how hard (0 to 1), how sharp (0 to 1). */
  discretePattern: { time: number; amplitude: number; frequency: number }[];
  /** Rumble: amplitude and sharpness envelopes over time (ms). */
  continuousPattern: {
    amplitude: { time: number; value: number }[];
    frequency: { time: number; value: number }[];
  };
}

/** The slice of Pulsar's native spec this app calls directly (see NativeRNPulsar.ts in the package). */
interface NativePulsar {
  Pulsar_play(name: string): void;
  Pulsar_stopHaptics(): void;
  Pulsar_hapticSupport(): number;
  PatternComposer_parsePattern(data: PulsarPattern): number;
  PatternComposer_play(patternId: number): void;
  PatternComposer_stop(patternId: number): void;
  PatternComposer_release(patternId: number): void;
}

type PulsarModule = typeof import("react-native-pulsar");

let nativeCached: NativePulsar | null | undefined;
let moduleCached: PulsarModule | null | undefined;

function native(): NativePulsar | null {
  if (nativeCached !== undefined) return nativeCached;
  if (Platform.OS === "web") {
    nativeCached = null;
    return nativeCached;
  }
  try {
    nativeCached = (TurboModuleRegistry.get("RNPulsar") as NativePulsar | null) ?? null;
  } catch {
    nativeCached = null;
  }
  return nativeCached;
}

function loadModule(): PulsarModule | null {
  if (moduleCached !== undefined) return moduleCached;
  if (!native()) {
    moduleCached = null;
    return moduleCached;
  }
  try {
    // Required lazily so a build without the native module still boots.
    moduleCached = require("react-native-pulsar") as PulsarModule;
  } catch {
    moduleCached = null;
  }
  return moduleCached;
}

/** True when the Pulsar native module is part of this build. Always false on web. */
export function isPulsarAvailable(): boolean {
  return native() !== null;
}

/**
 * Pulsar's support level on this device: 0 none, 1 limited (on/off vibration
 * only), 2 standard, 3 advanced (amplitude and sharpness control).
 */
export function pulsarSupportLevel(): number {
  try {
    return native()?.Pulsar_hapticSupport() ?? 0;
  } catch {
    return 0;
  }
}

let presetNamesCached: string[] | null = null;

/** Every named Pulsar preset (the System impacts and Android effects are left out), sorted. */
export function pulsarPresetNames(): string[] {
  if (presetNamesCached) return presetNamesCached;
  const mod = loadModule();
  if (!mod) return [];
  const presets = mod.Presets as unknown as Record<string, unknown>;
  presetNamesCached = Object.keys(presets)
    .filter((k) => k !== "System" && typeof presets[k] === "function")
    .sort();
  return presetNamesCached;
}

/** "balloonPop" to "Balloon pop", for chips and hints. */
export function presetLabel(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Play a named preset. Returns false when Pulsar is missing or the name is unknown. */
export function playPulsarPreset(name: string): boolean {
  const mod = loadModule();
  if (!mod) return false;
  const presets = mod.Presets as unknown as Record<string, unknown>;
  const fn = presets[name];
  if (typeof fn !== "function") return false;
  try {
    (fn as () => void)();
    return true;
  } catch {
    return false;
  }
}

/**
 * Play a composed pattern once. `strength` scales every amplitude (0 to 1).
 * The parsed pattern is released after it has had time to finish.
 */
export function playPulsarPattern(pattern: PulsarPattern, strength = 1): boolean {
  const n = native();
  if (!n) return false;
  const scaled = scalePattern(pattern, strength);
  try {
    const id = n.PatternComposer_parsePattern(scaled);
    if (id < 0) return false;
    n.PatternComposer_play(id);
    setTimeout(
      () => {
        try {
          n.PatternComposer_release(id);
        } catch {
          // Already gone; nothing to do.
        }
      },
      patternLength(scaled) + 1000,
    );
    return true;
  } catch {
    return false;
  }
}

export function stopPulsar(): void {
  try {
    native()?.Pulsar_stopHaptics();
  } catch {
    // Nothing playing.
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function scalePattern(p: PulsarPattern, strength: number): PulsarPattern {
  const s = clamp01(strength);
  return {
    discretePattern: p.discretePattern.map((d) => ({
      ...d,
      amplitude: clamp01(d.amplitude * s),
    })),
    continuousPattern: {
      amplitude: p.continuousPattern.amplitude.map((a) => ({
        ...a,
        value: clamp01(a.value * s),
      })),
      frequency: p.continuousPattern.frequency,
    },
  };
}

function patternLength(p: PulsarPattern): number {
  const times = [
    ...p.discretePattern.map((d) => d.time),
    ...p.continuousPattern.amplitude.map((a) => a.time),
    ...p.continuousPattern.frequency.map((f) => f.time),
  ];
  return times.length ? Math.max(...times) : 0;
}
