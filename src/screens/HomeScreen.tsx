import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RewardButton, type RewardButtonHandle } from "../button/RewardButton";
import { NavyBackdrop } from "../components/Backdrop";
import { startVolumeButtonListener } from "../hardware/volumeButtons";
import { syncCalendarNudges } from "../notifications/calendar";
import { setCalendarSyncTaskEnabled } from "../notifications/calendarTask";
import { registerForPush } from "../notifications/push";
import { configureNotifications, syncReminders } from "../notifications/reminders";
import { pickLook, randomLook, suggestName, type LookSettings } from "../looks/looks";
import { useLooks } from "../store/looks";
import { useSettings } from "../store/settings";
import { onWatchReward, sendSettingsToWatch } from "../../modules/watch-sync";
import { themeForBackdrop, useTheme } from "../design/theme";
import { body, bodySemibold, heading } from "../design/typography";
import { LibraryScreen } from "./LibraryScreen";
import { SaveLookSheet } from "./SaveLookSheet";
import { SettingsScreen } from "./settings/SettingsScreen";

/** The bottom row buttons are always off white with dark text. */
const PILL_BACKGROUND = "#F4F4F5";
const PILL_TEXT = "#18181B";

/** A settings change reaches the watch after this pause, so drags send once. */
const WATCH_SYNC_DELAY_MS = 600;

/** Shortest side at or above this is laid out as a tablet. */
const TABLET_MIN_SIDE = 700;

const PROMPTS = {
  both: "Did the thing? Tap it. Or hold it.",
  tap: "Did the thing? Tap it.",
  hold: "Did the thing? Hold it.",
};

/** Opening touchward://reward (or any link with ?reward=1) fires a tap on arrival. */
function linkAsksForReward(url: string): boolean {
  const parsed = Linking.parse(url);
  const path = (parsed.path ?? parsed.hostname ?? "").replace(/^\/+|\/+$/g, "");
  return path === "reward" || parsed.queryParams?.reward === "1";
}

export function HomeScreen() {
  const systemTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { settings, update, stats, recordReward, loaded } = useSettings();
  // The neon backdrop brings its own dark theme; the settings sheet keeps the system look.
  const backdrop = loaded ? settings.backdrop : "navy";
  const neon = backdrop === "navy";
  const theme = themeForBackdrop(backdrop, systemTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const { looks, save } = useLooks();
  const button = useRef<RewardButtonHandle>(null);

  const currentLook = pickLook(settings);
  const applyLook = useCallback((look: LookSettings) => update(look), [update]);
  const shuffleLook = useCallback(
    () => update(randomLook(pickLook(settings))),
    [update, settings],
  );
  const saveLook = useCallback(
    (name: string) => {
      save(name, pickLook(settings));
      setSaveOpen(false);
    },
    [save, settings],
  );

  const onReward = useCallback(() => recordReward(), [recordReward]);

  // External triggers all land here so they behave exactly like a finger tap.
  const triggerTap = useCallback(() => button.current?.reward("tap"), []);

  // Notifications: one-time setup, then keep the schedule in step with settings.
  useEffect(() => {
    configureNotifications().catch(() => {});
  }, []);
  useEffect(() => {
    if (!loaded) return;
    syncReminders(settings.reminders).catch(() => {});
  }, [loaded, settings.reminders]);
  // Calendar nudges: rescan when settings change and each time the app comes back.
  useEffect(() => {
    if (!loaded) return;
    const run = () =>
      syncCalendarNudges(settings.calendarNudges, settings.reminders.timeSensitive).catch(
        () => {},
      );
    run();
    setCalendarSyncTaskEnabled(settings.calendarNudges.enabled).catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => sub.remove();
  }, [loaded, settings.calendarNudges, settings.reminders.timeSensitive]);
  // Apple Watch: mirror the look and the reminder schedule, debounced so a color
  // drag sends one update, and only when something the watch uses has changed.
  const lastWatchPayload = useRef("");
  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({
      shape: settings.shape,
      rewardMode: settings.rewardMode,
      rippleShape: settings.rippleShape,
      idleColor: settings.idleColor,
      tapColors: settings.tapColors,
      rippleColors: settings.rippleColors,
      rippleFollowButton: settings.rippleFollowButton,
      backdrop: settings.backdrop,
      remindersEnabled: settings.reminders.enabled,
      reminderEveryHours: settings.reminders.everyHours,
      reminderStartHour: settings.reminders.startHour,
      reminderEndHour: settings.reminders.endHour,
      hapticStrength: settings.hapticStrength,
    });
    if (payload === lastWatchPayload.current) return;
    const timer = setTimeout(() => {
      lastWatchPayload.current = payload;
      sendSettingsToWatch(JSON.parse(payload) as Record<string, unknown>);
    }, WATCH_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loaded, settings]);
  useEffect(() => onWatchReward(() => recordReward()), [recordReward]);
  // Push tokens can rotate, so re-register on every launch while push is on.
  useEffect(() => {
    if (!loaded || !settings.pushEnabled) return;
    registerForPush().catch(() => {});
  }, [loaded, settings.pushEnabled]);

  // Tapping a reminder (or its "I did it" button) counts as the tap.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);
  useEffect(() => {
    if (!lastResponse || !loaded) return;
    const key = `${lastResponse.notification.request.identifier}:${lastResponse.notification.date}`;
    if (handledResponse.current === key) return;
    handledResponse.current = key;
    const data = lastResponse.notification.request.content.data as
      { reward?: boolean } | undefined;
    if (data?.reward) triggerTap();
  }, [lastResponse, loaded, triggerTap]);

  // Deep link from an iOS Action Button / Back Tap shortcut or an Android remap.
  const url = Linking.useURL();
  const handledUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!url || !loaded || handledUrl.current === url) return;
    handledUrl.current = url;
    if (linkAsksForReward(url)) triggerTap();
  }, [url, loaded, triggerTap]);

  // Volume buttons while the app is in the foreground.
  useEffect(() => {
    if (!loaded || !settings.volumeButtons) return;
    let stop: (() => void) | null = null;
    const start = () => {
      stop?.();
      stop = startVolumeButtonListener(triggerTap);
    };
    if (AppState.currentState === "active") start();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") start();
      else {
        stop?.();
        stop = null;
      }
    });
    return () => {
      sub.remove();
      stop?.();
    };
  }, [loaded, settings.volumeButtons, triggerTap]);

  // Tablets get a larger button and type; the layout otherwise stays the same.
  const tablet = Math.min(width, height) >= TABLET_MIN_SIDE;
  const size = Math.round(Math.min(width * 0.62, height * 0.34, tablet ? 520 : 300));
  const scale = tablet ? 1.4 : 1;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + 16 * scale,
          paddingBottom: insets.bottom + 16 * scale,
          paddingHorizontal: 24 * scale,
        },
      ]}
    >
      {neon && <NavyBackdrop />}
      <View style={styles.top}>
        <Text style={[styles.brand, { color: theme.text, fontSize: 24 * scale }]}>
          Touchward
        </Text>
        <Text style={[styles.count, { color: theme.muted, fontSize: 15 * scale }]}>
          {stats.rewardsToday} today
        </Text>
      </View>

      <View style={styles.middle}>
        {loaded && (
          <RewardButton ref={button} settings={settings} size={size} onReward={onReward} />
        )}
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.prompt, { color: theme.text, fontSize: 16 * scale }]}>
          {PROMPTS[settings.mode]}
        </Text>
        <View style={styles.toolbar}>
          <Pill label="Random" onPress={shuffleLook} scale={scale} />
          <Pill label="Save" onPress={() => setSaveOpen(true)} scale={scale} />
          <Pill
            label={looks.length > 0 ? `Library ${looks.length}` : "Library"}
            onPress={() => setLibraryOpen(true)}
            scale={scale}
          />
          <Pill label="Customize" onPress={() => setSettingsOpen(true)} scale={scale} />
        </View>
      </View>

      <SettingsScreen
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={systemTheme}
      />
      <SaveLookSheet
        visible={saveOpen}
        look={currentLook}
        suggestedName={suggestName(currentLook, looks)}
        theme={systemTheme}
        onSave={saveLook}
        onClose={() => setSaveOpen(false)}
      />
      <LibraryScreen
        visible={libraryOpen}
        current={currentLook}
        theme={systemTheme}
        onApply={(look) => {
          applyLook(look);
          setLibraryOpen(false);
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </View>
  );
}

/** The bottom row buttons: always off white, whatever the backdrop. */
function Pill({
  label,
  onPress,
  scale,
}: {
  label: string;
  onPress: () => void;
  scale: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pill,
        {
          opacity: pressed ? 0.7 : 1,
          paddingHorizontal: 14 * scale,
          paddingVertical: 10 * scale,
        },
      ]}
    >
      <Text style={[styles.pillText, { fontSize: 14 * scale }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  brand: heading(24),
  count: { ...body(15), fontVariant: ["tabular-nums"] },
  middle: { flex: 1, alignItems: "center", justifyContent: "center" },
  prompt: { ...body(16), marginBottom: 16, textAlign: "center" },
  bottom: { alignItems: "center" },
  toolbar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    backgroundColor: PILL_BACKGROUND,
  },
  pillText: { ...bodySemibold(14), color: PILL_TEXT },
});
