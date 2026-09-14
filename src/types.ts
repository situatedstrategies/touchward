export type Shape =
  "circle" | "squircle" | "square" | "hexagon" | "star" | "heart" | "blob" | "ripples";

export type PatternId = "short" | "long" | "staccato" | "heartbeat" | "ramp" | "purr";

/** One pick that sets both the ripple motion and the tap haptic, for every shape. */
export type RewardMode = "original" | "pulse" | "soft" | "spark" | "deep" | "double" | "wave";

/**
 * tap: a press plays the tap pattern and changes color.
 * hold: only holding through the timer rewards you.
 * both: quick press = tap reward, long press = timer.
 */
export type Mode = "tap" | "hold" | "both";

export interface Settings {
  mode: Mode;
  shape: Shape;
  /** The visual and haptic character of a tap. */
  rewardMode: RewardMode;
  /** Pulsar preset name that replaces the tap haptic. Null means use the pattern or mode. Needs a dev build. */
  tapPreset: string | null;
  /** Pulsar preset name that replaces the timer-done haptic. Null means use the pattern. Needs a dev build. */
  holdPreset: string | null;
  /** How hard Pulsar plays the reward mode patterns, 0 to 1. */
  hapticStrength: number;
  /** Legacy: the pre-modes tap pattern. Kept so old settings still parse; taps now follow rewardMode. */
  tapPattern: PatternId;
  /** Pattern played back at you when the hold timer completes. */
  holdPattern: PatternId;
  /** Length of the circular hold timer, in seconds. */
  holdSeconds: number;
  /** Color of the button at rest. */
  idleColor: string;
  /** Colors the button cycles through on each reward. */
  tapColors: string[];
  /** Pick the next color at random instead of in order. */
  randomColors: boolean;
  /** Snap back to the idle color after a moment instead of staying. */
  returnToIdle: boolean;
  /** Colors the ripples cycle through, one per tap. Empty means follow the button color. */
  rippleColors: string[];
  /** Outline used for ripples: the button's shape, the icon's wavy ring, or a circle. */
  rippleShape: "match" | "wavy" | "round";
  /** Behind the button: "navy" (the icon's gradient and glow), "system" (phone light or dark), or a hex color. */
  backdrop: string;
  reminders: ReminderSettings;
  /** Nudge to tap shortly after each calendar event ends. */
  calendarNudges: CalendarNudgeSettings;
  /** Pressing a volume button while the app is open counts as a tap. Needs a dev build. */
  volumeButtons: boolean;
  /** Register this device for remote push. Needs a real device and a dev or store build. */
  pushEnabled: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  /** Hours between reminders inside the window. */
  everyHours: number;
  /** First reminder hour (0 to 23), local time. */
  startHour: number;
  /** No reminders after this hour (0 to 23), local time. */
  endHour: number;
  /** iOS: deliver as a time-sensitive notification that breaks through Focus. */
  timeSensitive: boolean;
}

export interface CalendarNudgeSettings {
  enabled: boolean;
  /** Minutes after an event's end time to nudge. */
  minutesAfter: number;
  /** Calendar ids to watch. Null means every calendar on the phone. */
  calendarIds: string[] | null;
}

export const NUDGE_DELAYS = [0, 5, 15, 30];

export const REMINDER_INTERVALS = [1, 2, 3, 4, 6];

export const SHAPES: { id: Shape; label: string }[] = [
  { id: "circle", label: "Circle" },
  { id: "squircle", label: "Squircle" },
  { id: "square", label: "Square" },
  { id: "hexagon", label: "Hexagon" },
  { id: "star", label: "Star" },
  { id: "heart", label: "Heart" },
  { id: "blob", label: "Blob" },
  { id: "ripples", label: "Wavy" },
];

export const REWARD_MODES: {
  id: RewardMode;
  label: string;
  visual: string;
  haptic: string;
}[] = [
  {
    id: "original",
    label: "Original",
    visual: "Three standing rings, a wave rolls outward",
    haptic: "one medium impact",
  },
  {
    id: "pulse",
    label: "Ripple",
    visual: "One ripple radiates out",
    haptic: "one medium impact",
  },
  { id: "soft", label: "Soft", visual: "Slow, wide ripples", haptic: "one soft impact" },
  { id: "spark", label: "Spark", visual: "Fast, tight ripples", haptic: "one light impact" },
  { id: "deep", label: "Deep", visual: "Large, slow waves", haptic: "one heavy impact" },
  { id: "double", label: "Double", visual: "Two ripple waves", haptic: "two impacts" },
  {
    id: "wave",
    label: "Wave",
    visual: "Several cascading ripples",
    haptic: "repeated light impacts",
  },
];

/** Every RewardMode id, for validating stored settings. */
export const REWARD_MODE_IDS: RewardMode[] = REWARD_MODES.map((m) => m.id);
export const PATTERN_IDS: PatternId[] = [
  "short",
  "long",
  "staccato",
  "heartbeat",
  "ramp",
  "purr",
];

export const HOLD_PRESETS = [3, 5, 10, 15, 30, 60];

export const STRENGTHS: { value: number; label: string }[] = [
  { value: 0.45, label: "Gentle" },
  { value: 0.8, label: "Normal" },
  { value: 1, label: "Full" },
];

export const RIPPLE_SHAPES: { id: "match" | "wavy" | "round"; label: string }[] = [
  { id: "match", label: "Match the button" },
  { id: "wavy", label: "Wavy rings" },
  { id: "round", label: "Circles" },
];

export const SWATCHES = [
  "#2C66FF", // icon blue
  "#5FC4FF", // icon sky
  "#8DEDFF", // neon cyan
  "#BBA4FF", // neon violet
  "#E6A9FF", // neon pink
  "#C41200", // cherry
  "#F97316", // orange
  "#FACC15", // yellow
  "#22C55E", // green
  "#14B8A6", // teal
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F43F5E", // rose
  "#A3E635", // lime
  "#F4F4F5", // off white
  "#71717A", // gray
  "#18181B", // near black
];

export const DEFAULT_SETTINGS: Settings = {
  mode: "both",
  shape: "ripples",
  rewardMode: "original",
  tapPreset: null,
  holdPreset: null,
  hapticStrength: 0.8,
  tapPattern: "short",
  holdPattern: "heartbeat",
  holdSeconds: 5,
  idleColor: "#2C66FF",
  tapColors: ["#2C66FF", "#5FC4FF", "#8B5CF6", "#EC4899"],
  randomColors: false,
  returnToIdle: false,
  rippleColors: ["#E6A9FF", "#8DEDFF", "#BBA4FF"],
  rippleShape: "match",
  backdrop: "navy",
  reminders: {
    enabled: false,
    everyHours: 2,
    startHour: 9,
    endHour: 21,
    timeSensitive: true,
  },
  calendarNudges: {
    enabled: false,
    minutesAfter: 5,
    calendarIds: null,
  },
  volumeButtons: false,
  pushEnabled: false,
};
