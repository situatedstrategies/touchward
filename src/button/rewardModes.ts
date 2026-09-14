import type { Pulse } from "../haptics/patterns";
import type { PulsarPattern } from "../haptics/pulsar";
import type { RewardMode } from "../types";

/**
 * How each reward mode looks and feels. Labels and descriptions live in
 * REWARD_MODES in types.ts; this file holds the motion and the haptics.
 */
export interface RippleModeSpec {
  /**
   * bands: three standing rings around the core, and a tap sends a wave of
   * brightness and swell outward through them (the original look).
   * ripple: nothing at rest, and a tap emits ripples that travel out and fade.
   */
  kind: "bands" | "ripple";
  /** How long one ripple (or one wave through the bands) takes, in ms. */
  duration: number;
  /** How many ripples one tap emits. */
  count: number;
  /** Gap between ripples in a burst, in ms. */
  gap: number;
  /** How far a ripple travels, as a multiple of the core. */
  spread: number;
  /** bands only: peak scale of a standing ring as the wave passes. */
  swell?: number;
  /** Band thickness in path units (the shape lives in a 100 unit box). */
  width: number;
  /** The tap haptic when Pulsar is not available: built in pulses through expo-haptics. */
  pulses: Pulse[];
  /**
   * The tap haptic through Pulsar. amplitude is 0 to 1; frequency is sharpness,
   * 0 to 1, where low is a round thud and high is a crisp click.
   */
  pulsar: PulsarPattern;
}

const noRumble = { amplitude: [], frequency: [] };

function repeat(pulse: Pulse, times: number): Pulse[] {
  return Array.from({ length: times }, () => ({ ...pulse }));
}

export const REWARD_MODE_SPECS: Record<RewardMode, RippleModeSpec> = {
  original: {
    kind: "bands",
    duration: 1100,
    count: 1,
    gap: 0,
    spread: 2.8,
    width: 4.5,
    swell: 1.07,
    pulses: [{ ms: 40, gap: 0, intensity: "medium" }],
    pulsar: {
      discretePattern: [{ time: 0, amplitude: 0.8, frequency: 0.5 }],
      continuousPattern: noRumble,
    },
  },
  soft: {
    kind: "ripple",
    duration: 1600,
    count: 1,
    gap: 0,
    spread: 2.6,
    width: 5,
    pulses: [{ ms: 40, gap: 0, intensity: "soft" }],
    // A rounded swell rather than a tap.
    pulsar: {
      discretePattern: [],
      continuousPattern: {
        amplitude: [
          { time: 0, value: 0 },
          { time: 90, value: 0.55 },
          { time: 260, value: 0 },
        ],
        frequency: [
          { time: 0, value: 0.15 },
          { time: 260, value: 0.15 },
        ],
      },
    },
  },
  pulse: {
    kind: "ripple",
    duration: 1000,
    count: 1,
    gap: 0,
    spread: 2.2,
    width: 4,
    pulses: [{ ms: 40, gap: 0, intensity: "medium" }],
    pulsar: {
      discretePattern: [{ time: 0, amplitude: 0.8, frequency: 0.5 }],
      continuousPattern: noRumble,
    },
  },
  spark: {
    kind: "ripple",
    duration: 550,
    count: 1,
    gap: 0,
    spread: 1.7,
    width: 3,
    pulses: [{ ms: 30, gap: 0, intensity: "light" }],
    pulsar: {
      discretePattern: [{ time: 0, amplitude: 0.6, frequency: 0.95 }],
      continuousPattern: noRumble,
    },
  },
  deep: {
    kind: "ripple",
    duration: 1900,
    count: 1,
    gap: 0,
    spread: 3,
    width: 6,
    pulses: [{ ms: 45, gap: 0, intensity: "heavy" }],
    // A hard hit that decays into a low rumble.
    pulsar: {
      discretePattern: [{ time: 0, amplitude: 1, frequency: 0.25 }],
      continuousPattern: {
        amplitude: [
          { time: 0, value: 0.9 },
          { time: 380, value: 0 },
        ],
        frequency: [
          { time: 0, value: 0.2 },
          { time: 380, value: 0.05 },
        ],
      },
    },
  },
  double: {
    kind: "ripple",
    duration: 900,
    count: 2,
    gap: 170,
    spread: 2.2,
    width: 4,
    pulses: [
      { ms: 40, gap: 150, intensity: "medium" },
      { ms: 40, gap: 0, intensity: "medium" },
    ],
    pulsar: {
      discretePattern: [
        { time: 0, amplitude: 0.8, frequency: 0.5 },
        { time: 170, amplitude: 0.8, frequency: 0.5 },
      ],
      continuousPattern: noRumble,
    },
  },
  wave: {
    kind: "ripple",
    duration: 850,
    count: 3,
    gap: 130,
    spread: 2.4,
    width: 3.5,
    pulses: repeat({ ms: 30, gap: 85, intensity: "light" }, 4),
    // Four light taps that rise and fall, like the bands lighting up in turn.
    pulsar: {
      discretePattern: [
        { time: 0, amplitude: 0.45, frequency: 0.7 },
        { time: 95, amplitude: 0.6, frequency: 0.7 },
        { time: 190, amplitude: 0.75, frequency: 0.7 },
        { time: 285, amplitude: 0.55, frequency: 0.7 },
      ],
      continuousPattern: noRumble,
    },
  },
};
