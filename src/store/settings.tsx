import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  REWARD_MODE_IDS,
  PATTERN_IDS,
  SHAPES,
  type Settings,
} from "../types";

const SETTINGS_KEY = "touchward.settings.v1";
const STATS_KEY = "touchward.stats.v1";
/** Keys from before the rename. Read once so an existing install keeps its settings and counter. */
const LEGACY_SETTINGS_KEY = "dopamine.settings.v1";
const LEGACY_STATS_KEY = "dopamine.stats.v1";

interface Stats {
  /** ISO date (YYYY-MM-DD) the counter belongs to. */
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

/** Merge stored JSON over defaults so new fields get sane values after an update. */
function mergeSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged: Settings = { ...DEFAULT_SETTINGS, ...parsed };
    if (!Array.isArray(merged.tapColors) || merged.tapColors.length === 0) {
      merged.tapColors = DEFAULT_SETTINGS.tapColors;
    }
    if (!Number.isFinite(merged.holdSeconds) || merged.holdSeconds < 1) {
      merged.holdSeconds = DEFAULT_SETTINGS.holdSeconds;
    }
    merged.reminders = { ...DEFAULT_SETTINGS.reminders, ...(parsed.reminders ?? {}) };
    merged.calendarNudges = {
      ...DEFAULT_SETTINGS.calendarNudges,
      ...(parsed.calendarNudges ?? {}),
    };
    if (
      merged.calendarNudges.calendarIds !== null &&
      !Array.isArray(merged.calendarNudges.calendarIds)
    ) {
      merged.calendarNudges.calendarIds = null;
    }
    if (!Number.isFinite(merged.hapticStrength)) {
      merged.hapticStrength = DEFAULT_SETTINGS.hapticStrength;
    }
    if (typeof merged.tapPreset !== "string") merged.tapPreset = null;
    if (typeof merged.holdPreset !== "string") merged.holdPreset = null;
    if (!Array.isArray(merged.rippleColors))
      merged.rippleColors = DEFAULT_SETTINGS.rippleColors;
    if (!["match", "wavy", "round"].includes(merged.rippleShape)) {
      merged.rippleShape = DEFAULT_SETTINGS.rippleShape;
    }
    if (typeof merged.backdrop !== "string" || merged.backdrop.length === 0) {
      // Older builds stored a boolean neonBackdrop.
      const legacy = (parsed as { neonBackdrop?: unknown }).neonBackdrop;
      merged.backdrop = legacy === false ? "system" : DEFAULT_SETTINGS.backdrop;
    }
    // Enum fields: anything unknown (an old value, a typo in a backup) falls back to the default.
    if (!SHAPES.some((s) => s.id === merged.shape)) merged.shape = DEFAULT_SETTINGS.shape;
    if (!REWARD_MODE_IDS.includes(merged.rewardMode)) {
      merged.rewardMode = DEFAULT_SETTINGS.rewardMode;
    }
    if (!["tap", "hold", "both"].includes(merged.mode)) merged.mode = DEFAULT_SETTINGS.mode;
    if (!PATTERN_IDS.includes(merged.tapPattern))
      merged.tapPattern = DEFAULT_SETTINGS.tapPattern;
    if (!PATTERN_IDS.includes(merged.holdPattern))
      merged.holdPattern = DEFAULT_SETTINGS.holdPattern;
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Settings as stored, for code that runs outside React (the background calendar sync). */
export async function loadSettings(): Promise<Settings> {
  try {
    let raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw === null) raw = await AsyncStorage.getItem(LEGACY_SETTINGS_KEY);
    return mergeSettings(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Stats>(freshStats);
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let [rawSettings, rawStats] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(STATS_KEY),
        ]);
        if (rawSettings === null) rawSettings = await AsyncStorage.getItem(LEGACY_SETTINGS_KEY);
        if (rawStats === null) rawStats = await AsyncStorage.getItem(LEGACY_STATS_KEY);
        if (cancelled) return;
        setSettings(mergeSettings(rawSettings));
        if (rawStats) {
          const parsed = JSON.parse(rawStats) as Stats;
          setStats(
            parsed.day === today() ? parsed : { ...parsed, day: today(), rewardsToday: 0 },
          );
        }
      } catch {
        // Corrupt or unavailable storage: fall through with defaults.
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

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats)).catch(() => {});
  }, [stats]);

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
