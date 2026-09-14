import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { isHexColor } from "../design/palette";
import { configureCrashReports } from "../support/crashReports";
import {
  DEFAULT_SETTINGS,
  MAX_STRENGTH,
  PATTERN_IDS,
  REWARD_MODE_IDS,
  RIPPLE_COLOR_SLOTS,
  RIPPLE_SHAPES,
  SHAPES,
  COLOR_LIBRARY_LIMIT,
  type CalendarNudgeSettings,
  type ColorLibraryKey,
  type ReminderSettings,
  type Settings,
} from "../types";

const SETTINGS_KEY = "touchward.settings.v2";
const STATS_KEY = "touchward.stats.v1";
/**
 * Earlier keys. v1 settings predate the final button design, so when one is
 * migrated the look is reset to the icon (shape, mode, ripple colors) while
 * every other preference is kept.
 */
const PREVIOUS_SETTINGS_KEYS = ["touchward.settings.v1", "dopamine.settings.v1"];
const LEGACY_STATS_KEY = "dopamine.stats.v1";
const ICON_LOOK: Partial<Settings> = {
  shape: DEFAULT_SETTINGS.shape,
  rewardMode: DEFAULT_SETTINGS.rewardMode,
  rippleShape: DEFAULT_SETTINGS.rippleShape,
  rippleColors: DEFAULT_SETTINGS.rippleColors,
  rippleFollowButton: DEFAULT_SETTINGS.rippleFollowButton,
  idleColor: DEFAULT_SETTINGS.idleColor,
  tapColors: DEFAULT_SETTINGS.tapColors,
  backdrop: DEFAULT_SETTINGS.backdrop,
};
/** Taps and color drags come fast; storage is written at most this often. */
const STATS_WRITE_DELAY_MS = 400;
const SETTINGS_WRITE_DELAY_MS = 300;

export interface Stats {
  /** Calendar day (YYYY-MM-DD) the daily count belongs to. */
  day: string;
  rewardsToday: number;
  rewardsAllTime: number;
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  stats: Stats;
  recordReward: () => void;
  resetStats: () => void;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function freshStats(): Stats {
  return { day: today(), rewardsToday: 0, rewardsAllTime: 0 };
}

type Raw = Record<string, unknown>;

const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T =>
  isStr(v) && (allowed as readonly string[]).includes(v);

function sanitizeReminders(raw: unknown): ReminderSettings {
  const d = DEFAULT_SETTINGS.reminders;
  const r = (raw ?? {}) as Raw;
  const hour = (v: unknown, fallback: number) =>
    isNum(v) ? Math.min(23, Math.max(0, Math.round(v))) : fallback;
  return {
    enabled: isBool(r.enabled) ? r.enabled : d.enabled,
    everyHours: isNum(r.everyHours) && r.everyHours >= 1 ? r.everyHours : d.everyHours,
    startHour: hour(r.startHour, d.startHour),
    endHour: hour(r.endHour, d.endHour),
    timeSensitive: isBool(r.timeSensitive) ? r.timeSensitive : d.timeSensitive,
  };
}

function sanitizeNudges(raw: unknown): CalendarNudgeSettings {
  const d = DEFAULT_SETTINGS.calendarNudges;
  const r = (raw ?? {}) as Raw;
  return {
    enabled: isBool(r.enabled) ? r.enabled : d.enabled,
    minutesAfter:
      isNum(r.minutesAfter) && r.minutesAfter >= 0 ? r.minutesAfter : d.minutesAfter,
    calendarIds: isStrArray(r.calendarIds) ? r.calendarIds : null,
  };
}

/**
 * Turn whatever is in storage into a valid Settings object. Unknown keys are
 * dropped, missing keys take defaults, and out of range values are corrected,
 * so the app always starts no matter what an earlier version saved.
 */
export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  const r = (raw && typeof raw === "object" ? raw : {}) as Raw;
  const shapeIds = SHAPES.map((s) => s.id);
  const rippleShapeIds = RIPPLE_SHAPES.map((s) => s.id);
  let backdrop = isStr(r.backdrop) && r.backdrop.length > 0 ? r.backdrop : d.backdrop;
  if (r.neonBackdrop === false && !isStr(r.backdrop)) backdrop = "system";
  return {
    mode: oneOf(r.mode, ["tap", "hold", "both"] as const) ? r.mode : d.mode,
    shape: oneOf(r.shape, shapeIds) ? r.shape : d.shape,
    rewardMode: oneOf(r.rewardMode, REWARD_MODE_IDS) ? r.rewardMode : d.rewardMode,
    tapPreset: isStr(r.tapPreset) ? r.tapPreset : null,
    holdPreset: isStr(r.holdPreset) ? r.holdPreset : null,
    hapticStrength: isNum(r.hapticStrength)
      ? Math.min(MAX_STRENGTH, Math.max(0, r.hapticStrength))
      : d.hapticStrength,
    holdPattern: oneOf(r.holdPattern, PATTERN_IDS) ? r.holdPattern : d.holdPattern,
    holdSeconds: isNum(r.holdSeconds) && r.holdSeconds >= 1 ? r.holdSeconds : d.holdSeconds,
    idleColor: isStr(r.idleColor) ? r.idleColor : d.idleColor,
    tapColors: isStrArray(r.tapColors) && r.tapColors.length > 0 ? r.tapColors : d.tapColors,
    randomColors: isBool(r.randomColors) ? r.randomColors : d.randomColors,
    returnToIdle: isBool(r.returnToIdle) ? r.returnToIdle : d.returnToIdle,
    rippleColors: rippleSlots(r.rippleColors),
    rippleFollowButton: isBool(r.rippleFollowButton)
      ? r.rippleFollowButton
      : isStrArray(r.rippleColors) && r.rippleColors.length === 0,
    colorLibraries: sanitizeLibraries(r.colorLibraries),
    rippleShape: oneOf(r.rippleShape, rippleShapeIds) ? r.rippleShape : d.rippleShape,
    backdrop,
    reminders: sanitizeReminders(r.reminders),
    calendarNudges: sanitizeNudges(r.calendarNudges),
    volumeButtons: isBool(r.volumeButtons) ? r.volumeButtons : d.volumeButtons,
    pushEnabled: isBool(r.pushEnabled) ? r.pushEnabled : d.pushEnabled,
    crashReports: isBool(r.crashReports) ? r.crashReports : d.crashReports,
  };
}

const LIBRARY_KEYS: ColorLibraryKey[] = ["idleColor", "tapColors", "rippleColors", "backdrop"];

function sanitizeLibraries(raw: unknown): Partial<Record<ColorLibraryKey, string[]>> {
  const out: Partial<Record<ColorLibraryKey, string[]>> = {};
  const r = (raw && typeof raw === "object" ? raw : {}) as Raw;
  for (const key of LIBRARY_KEYS) {
    const list = r[key];
    if (isStrArray(list)) out[key] = list.filter(isHexColor).slice(0, COLOR_LIBRARY_LIMIT);
  }
  return out;
}

/** Exactly RIPPLE_COLOR_SLOTS colors: stored ones first, defaults filling any gap. */
function rippleSlots(raw: unknown): string[] {
  const stored = isStrArray(raw) ? raw.filter(isHexColor) : [];
  return Array.from(
    { length: RIPPLE_COLOR_SLOTS },
    (_, i) => stored[i] ?? DEFAULT_SETTINGS.rippleColors[i],
  );
}

function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function parseStats(raw: string | null): Stats {
  if (!raw) return freshStats();
  try {
    const r = JSON.parse(raw) as Raw;
    const allTime = isNum(r.rewardsAllTime) && r.rewardsAllTime >= 0 ? r.rewardsAllTime : 0;
    const sameDay = r.day === today();
    const todayCount = sameDay && isNum(r.rewardsToday) ? r.rewardsToday : 0;
    return { day: today(), rewardsToday: todayCount, rewardsAllTime: allTime };
  } catch {
    return freshStats();
  }
}

async function readWithFallback(key: string, legacyKey: string): Promise<string | null> {
  const value = await AsyncStorage.getItem(key);
  return value ?? (await AsyncStorage.getItem(legacyKey));
}

/** Current settings, or settings migrated from an earlier key with the icon look restored. */
async function readSettings(): Promise<Settings> {
  const current = await AsyncStorage.getItem(SETTINGS_KEY);
  if (current !== null) return parseSettings(current);
  for (const key of PREVIOUS_SETTINGS_KEYS) {
    const previous = await AsyncStorage.getItem(key);
    if (previous !== null) return { ...parseSettings(previous), ...ICON_LOOK };
  }
  return DEFAULT_SETTINGS;
}

/** Settings as stored, for code that runs outside React (the background calendar sync). */
export async function loadSettings(): Promise<Settings> {
  try {
    return await readSettings();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Stats>(freshStats);
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStats = useRef<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedSettings, rawStats] = await Promise.all([
          readSettings(),
          readWithFallback(STATS_KEY, LEGACY_STATS_KEY),
        ]);
        if (cancelled) return;
        setSettings(loadedSettings);
        setStats(parseStats(rawStats));
      } catch {
        // Storage unavailable: run with defaults until it is.
      } finally {
        if (!cancelled) {
          hydrated.current = true;
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSettings = useRef<Settings | null>(null);
  const flushSettings = useCallback(() => {
    if (settingsTimer.current) {
      clearTimeout(settingsTimer.current);
      settingsTimer.current = null;
    }
    const value = pendingSettings.current;
    if (!value) return;
    pendingSettings.current = null;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(value)).catch(() => {});
  }, []);

  useEffect(() => {
    configureCrashReports(settings);
  }, [settings]);

  useEffect(() => {
    if (!hydrated.current) return;
    pendingSettings.current = settings;
    if (!settingsTimer.current) {
      settingsTimer.current = setTimeout(flushSettings, SETTINGS_WRITE_DELAY_MS);
    }
  }, [settings, flushSettings]);

  const flushStats = useCallback(() => {
    if (statsTimer.current) {
      clearTimeout(statsTimer.current);
      statsTimer.current = null;
    }
    const value = pendingStats.current;
    if (!value) return;
    pendingStats.current = null;
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(value)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    pendingStats.current = stats;
    if (!statsTimer.current) statsTimer.current = setTimeout(flushStats, STATS_WRITE_DELAY_MS);
  }, [stats, flushStats]);

  useEffect(() => {
    const flushAll = () => {
      flushStats();
      flushSettings();
    };
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") flushAll();
    });
    return () => {
      sub.remove();
      flushAll();
    };
  }, [flushStats, flushSettings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const recordReward = useCallback(() => {
    setStats((prev) => {
      const day = today();
      const rewardsToday = prev.day === day ? prev.rewardsToday + 1 : 1;
      return { day, rewardsToday, rewardsAllTime: prev.rewardsAllTime + 1 };
    });
  }, []);

  const resetStats = useCallback(() => setStats(freshStats()), []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset, stats, recordReward, resetStats, loaded }),
    [settings, update, reset, stats, recordReward, resetStats, loaded],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
