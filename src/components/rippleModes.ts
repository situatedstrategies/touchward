import type { Pulse } from "../haptics/patterns";
import type { PulsarPattern } from "../haptics/pulsar";
import type { RewardMode } from "../types";

/**
 * How each reward mode moves the ripple bands and what it plays on a tap.
 * The labels and descriptions live in REWARD_MODES in types.ts.
 */
export interface RippleModeSpec {
  /** One outward wave through all three bands, in ms. */
  duration: number;
  /** Gap between one band starting and the next, in ms. */
  stagger: number;
  /** Peak scale of a band as the wave passes. */
  swell: number;
  /** How many waves a single reward sends out. */
  repeats: number;
  /** The tap haptic for this mode on Expo Go and builds without Pulsar. */
  pulses: Pulse[];
  /**
   * The tap haptic on a build with Pulsar: amplitude is 0 to 1, frequency is
   * sharpness (low is a round thud, high is a crisp click).
   */
  pulsar: PulsarPattern;
}

const noRumble = { amplitude: [], frequency: [] };

function repeat(pulse: Pulse, times: number): Pulse[] {
  return Array.from({ length: times }, () => ({ ...pulse }));
}

export const RIPPLE_MODES: Record<RewardMode, RippleModeSpec> = {
  soft: {
    duration: 1500,
    stagger: 170,
    swell: 1.09,
    repeats: 1,
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
    duration: 900,
    stagger: 90,
    swell: 1.07,
    repeats: 1,
    pulses: [{ ms: 40, gap: 0, intensity: "medium" }],
    pulsar: {
      discretePattern: [{ time: 0, amplitude: 0.8, frequency: 0.5 }],
      continuousPattern: noRumble,
    },
  },
  spark: {
    duration: 450,
    stagger: 35,
    swell: 1.04,
    repeats: 1,
    pulses: [{ ms: 30, gap: 0, intensity: "light" }],
    pulsar: {
      discretePattern: [{ time: 0, amplitude: 0.6, frequency: 0.95 }],
      continuousPattern: noRumble,
    },
  },
  deep: {
    duration: 1700,
    stagger: 240,
    swell: 1.13,
    repeats: 1,
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
    duration: 650,
    stagger: 70,
    swell: 1.07,
    repeats: 2,
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
    duration: 550,
    stagger: 60,
    swell: 1.06,
    repeats: 3,
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
