import { AppState, Platform, TurboModuleRegistry } from "react-native";

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
 * Parsed patterns, keyed by their scaled contents. Parsing is the one Pulsar
 * call React Native runs synchronously on the JavaScript thread (it returns a
 * value); every other Pulsar call, including play, stop, and release, runs on
 * the main thread. Pulsar keeps its player table unsynchronized, so a parse
 * that overlaps a stop or release on the main thread can crash (a concurrent
 * Swift Dictionary mutation). Parsing each pattern once and never releasing
 * it keeps the JavaScript thread out of Pulsar during play.
 *
 * Pulsar recreates a parsed pattern's players on demand after its engine
 * stops or resets, so a cached id stays valid for the life of the app.
 */
const parsedPatterns = new Map<string, number>();
const PARSED_LIMIT = 48;
let appStateWatched = false;

/**
 * Pulsar builds a pattern's players only while the app is active (it reads
 * UIApplication's state when asked to parse). A pattern parsed a moment
 * before the app becomes active, as happens when the button mounts at launch,
 * comes back with no players and stays silent for good. So parses happen only
 * while active, and the cache is dropped whenever the app leaves the
 * foreground, which is also when Pulsar tears its players down.
 */
function watchAppState(): void {
  if (appStateWatched) return;
  appStateWatched = true;
  AppState.addEventListener("change", (state) => {
    if (state !== "active") dropParsedPatterns();
  });
}

function dropParsedPatterns(): void {
  const n = native();
  for (const id of parsedPatterns.values()) {
    try {
      n?.PatternComposer_release(id);
    } catch {
      // Already gone; nothing to do.
    }
  }
  parsedPatterns.clear();
}

/**
 * Parse a pattern at a given strength and cache the result. Call this when a
 * pattern is chosen (settings change, screen mount), not at tap time, so the
 * parse never overlaps a play in flight. Returns null when Pulsar is missing
 * or the app is not active; the next tap then parses on the spot.
 */
export function preparePulsarPattern(pattern: PulsarPattern, strength = 1): number | null {
  const n = native();
  if (!n) return null;
  watchAppState();
  if (AppState.currentState !== "active") return null;
  const scaled =
    strength > 1 ? amplifyPattern(pattern, strength) : scalePattern(pattern, strength);
  const key = JSON.stringify(scaled);
  const cached = parsedPatterns.get(key);
  if (cached !== undefined) return cached;
  if (parsedPatterns.size >= PARSED_LIMIT) return null;
  try {
    const id = n.PatternComposer_parsePattern(scaled);
    if (id < 0) return null;
    parsedPatterns.set(key, id);
    return id;
  } catch {
    return null;
  }
}

/**
 * Play a composed pattern once. `strength` up to 1 scales every amplitude;
 * above 1 the pattern is amplified instead (see amplifyPattern). Uses the
 * cached parse when there is one and parses on the spot otherwise.
 */
export function playPulsarPattern(pattern: PulsarPattern, strength = 1): boolean {
  const n = native();
  if (!n) return false;
  const id = preparePulsarPattern(pattern, strength);
  if (id === null) return false;
  try {
    n.PatternComposer_play(id);
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

/**
 * Strength below 1 scales amplitude, but not all the way down: motors stop
 * being felt somewhere around 0.3, so Gentle keeps roughly 70 percent of the
 * pattern and Normal about 90 percent.
 */
function scalePattern(p: PulsarPattern, strength: number): PulsarPattern {
  const s = 0.5 + 0.5 * clamp01(strength);
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

/**
 * More felt energy once amplitude is already at the ceiling: every tap goes to
 * full amplitude and gains echo taps 20 ms apart (one for Hard, two for Max),
 * and a short low rumble runs under the whole pattern. Existing rumble is
 * raised to full.
 */
function amplifyPattern(p: PulsarPattern, strength: number): PulsarPattern {
  const echoes = strength >= 2 ? 2 : 1;
  const taps = p.discretePattern.flatMap((d) => {
    const out = [{ ...d, amplitude: 1 }];
    for (let i = 1; i <= echoes; i++) {
      out.push({
        time: d.time + i * 20,
        amplitude: 1,
        frequency: Math.min(1, d.frequency + 0.1 * i),
      });
    }
    return out;
  });
  const end = patternLength(p);
  const rumbleLength = strength >= 2 ? 260 : 140;
  const existing = p.continuousPattern.amplitude.map((a) => ({
    ...a,
    value: a.value > 0 ? 1 : 0,
  }));
  const rumbleStart = existing.length ? end : 0;
  const amplitude = [
    ...existing,
    { time: rumbleStart, value: 1 },
    { time: rumbleStart + rumbleLength, value: 1 },
    { time: rumbleStart + rumbleLength + 60, value: 0 },
  ];
  const frequency = [
    ...p.continuousPattern.frequency,
    { time: rumbleStart, value: 0.35 },
    { time: rumbleStart + rumbleLength + 60, value: 0.2 },
  ];
  return { discretePattern: taps, continuousPattern: { amplitude, frequency } };
}

function patternLength(p: PulsarPattern): number {
  const times = [
    ...p.discretePattern.map((d) => d.time),
    ...p.continuousPattern.amplitude.map((a) => a.time),
    ...p.continuousPattern.frequency.map((f) => f.time),
  ];
  return times.length ? Math.max(...times) : 0;
}
