import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { RewardButton, type RewardButtonHandle } from "../components/RewardButton";
import { RIPPLE_PALETTE } from "../components/Ripples";
import { startVolumeButtonListener } from "../hardware/volumeButtons";
import { syncCalendarNudges } from "../notifications/calendar";
import { setCalendarSyncTaskEnabled } from "../notifications/calendarTask";
import { registerForPush } from "../notifications/push";
import { configureNotifications, syncReminders } from "../notifications/reminders";
import { useSettings } from "../store/settings";
import { RIPPLE_THEME, useTheme } from "../theme";
import { body, bodySemibold, heading } from "../typography";
import { SettingsScreen } from "./SettingsScreen";

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
  const { settings, stats, recordReward, loaded } = useSettings();
  // Ripples brings its own deep navy backdrop; the settings sheet keeps the system look.
  const isRipples = loaded && settings.shape === "ripples";
  const theme = isRipples ? RIPPLE_THEME : systemTheme;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const button = useRef<RewardButtonHandle>(null);

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

  const size = Math.round(Math.min(width * 0.62, height * 0.34, 300));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      {isRipples && <NavyBackdrop />}
      <View style={styles.top}>
        <Text style={[styles.brand, { color: theme.text }]}>Touchward</Text>
        <Text style={[styles.count, { color: theme.muted }]}>{stats.rewardsToday} today</Text>
      </View>

      <View style={styles.middle}>
        {loaded && (
          <RewardButton
            ref={button}
            settings={settings}
            size={size}
            ringTrackColor={theme.ringTrack}
            onReward={onReward}
          />
        )}
        <Text style={[styles.prompt, { color: theme.muted }]}>{PROMPTS[settings.mode]}</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={({ pressed }) => [
            styles.settingsButton,
            {
              borderColor: theme.border,
              backgroundColor: theme.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.settingsText, { color: theme.text }]}>Customize</Text>
        </Pressable>
      </View>

      <SettingsScreen
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={systemTheme}
      />
    </View>
  );
}

/** Top to bottom navy fade with a soft blue glow behind the button, like the icon. */
function NavyBackdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="navy" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={RIPPLE_PALETTE.backgroundTop} />
          <Stop offset="1" stopColor={RIPPLE_PALETTE.backgroundBottom} />
        </LinearGradient>
        <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={RIPPLE_PALETTE.centerGlow} stopOpacity={0.45} />
          <Stop offset="1" stopColor={RIPPLE_PALETTE.centerGlow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#navy)" />
      <Circle cx="50%" cy="48%" r="42%" fill="url(#centerGlow)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  top: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  brand: heading(24),
  count: { ...body(15), fontVariant: ["tabular-nums"] },
  middle: { flex: 1, alignItems: "center", justifyContent: "center" },
  prompt: { ...body(16), marginTop: 28, textAlign: "center" },
  bottom: { alignItems: "center" },
  settingsButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  settingsText: bodySemibold(16),
});
