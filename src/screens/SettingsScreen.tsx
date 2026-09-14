import * as Application from "expo-application";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  Linking as RNLinking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "../components/Chip";
import { Swatch } from "../components/Swatch";
import { RIPPLE_MODES } from "../components/rippleModes";
import {
  isPulsarAvailable,
  playPattern,
  playPulsarPreset,
  playPulses,
  playReward,
  presetLabel,
  pulsarPresetNames,
  pulsarSupportLevel,
  PATTERNS_BY_ID,
} from "../haptics";
import { isVolumeButtonSupportAvailable } from "../hardware/volumeButtons";
import {
  countScheduledNudges,
  listCalendars,
  requestCalendarPermission,
  syncCalendarNudges,
  type CalendarChoice,
} from "../notifications/calendar";
import { PRIVACY_URL, SOURCE_URL, SUPPORT_EMAIL, TERMS_URL } from "../links";
import { BACKDROP_COLORS } from "../palette";
import {
  clearPushRegistration,
  getStoredPushRegistration,
  isPushSupported,
  registerForPush,
  type PushRegistration,
} from "../notifications/push";
import {
  formatHour,
  reminderTimes,
  requestReminderPermission,
} from "../notifications/reminders";
import { useSettings } from "../store/settings";
import type { Theme } from "../theme";
import { SupportScreen } from "./SupportScreen";
import { body, bodyMedium, bodySemibold, heading } from "../typography";
import {
  REWARD_MODES,
  HOLD_PRESETS,
  NUDGE_DELAYS,
  REMINDER_INTERVALS,
  RIPPLE_SHAPES,
  SHAPES,
  STRENGTHS,
  SWATCHES,
  type RewardMode,
  type CalendarNudgeSettings,
  type Mode,
  type PatternId,
  type ReminderSettings,
} from "../types";

export const REWARD_LINK = "touchward://reward";

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
}

const MODES: { id: Mode; label: string; hint: string }[] = [
  {
    id: "both",
    label: "Tap or hold",
    hint: "Quick press taps. Keep holding to run the timer.",
  },
  { id: "tap", label: "Tap only", hint: "Every press is a reward. No timer." },
  { id: "hold", label: "Hold only", hint: "Only finishing the timer pays out." },
];

export function SettingsScreen({ visible, onClose, theme }: Props) {
  const { settings, update, reset, stats, resetStats } = useSettings();
  const insets = useSafeAreaInsets();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const volumeSupported = isVolumeButtonSupportAvailable();
  const [supportOpen, setSupportOpen] = useState(false);

  // Calendar nudges: permission, the calendar list, and how many are queued.
  const [calendars, setCalendars] = useState<CalendarChoice[]>([]);
  const [calendarDenied, setCalendarDenied] = useState(false);
  const [nudgeCount, setNudgeCount] = useState<number | null>(null);
  const updateNudges = (patch: Partial<CalendarNudgeSettings>) =>
    update({ calendarNudges: { ...settings.calendarNudges, ...patch } });
  useEffect(() => {
    if (!visible || !settings.calendarNudges.enabled) return;
    listCalendars().then(setCalendars);
    countScheduledNudges().then(setNudgeCount);
  }, [visible, settings.calendarNudges]);
  const toggleNudges = async (on: boolean) => {
    if (!on) {
      updateNudges({ enabled: false });
      return;
    }
    const notifications = await requestReminderPermission();
    setPermissionDenied(!notifications);
    const calendar = notifications && (await requestCalendarPermission());
    setCalendarDenied(!calendar);
    if (!notifications || !calendar) return;
    updateNudges({ enabled: true });
    const count = await syncCalendarNudges(
      { ...settings.calendarNudges, enabled: true },
      settings.reminders.timeSensitive,
    );
    setNudgeCount(count);
  };
  const toggleCalendar = (id: string) => {
    const current = settings.calendarNudges.calendarIds;
    if (current === null) {
      // From "all" to "all but this one".
      updateNudges({ calendarIds: calendars.map((c) => c.id).filter((c) => c !== id) });
      return;
    }
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    updateNudges({ calendarIds: next.length === calendars.length ? null : next });
  };

  // Push: the toggle registers the device and shows the tokens a sender needs.
  const pushSupported = isPushSupported();
  const [push, setPush] = useState<PushRegistration | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushDenied, setPushDenied] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    getStoredPushRegistration().then(setPush);
  }, []);
  const togglePush = async (on: boolean) => {
    if (!on) {
      update({ pushEnabled: false });
      setPush(null);
      await clearPushRegistration();
      return;
    }
    setPushBusy(true);
    const reg = await registerForPush();
    setPushBusy(false);
    setPushDenied(reg === null);
    setPush(reg);
    update({ pushEnabled: reg !== null });
  };
  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };
  const open = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => RNLinking.openURL(url));
  };
  const version = Application.nativeApplicationVersion ?? "dev";
  const buildNumber = Application.nativeBuildVersion ?? "";

  const updateReminders = (patch: Partial<ReminderSettings>) =>
    update({ reminders: { ...settings.reminders, ...patch } });

  const toggleReminders = async (on: boolean) => {
    if (!on) {
      updateReminders({ enabled: false });
      return;
    }
    const granted = await requestReminderPermission();
    setPermissionDenied(!granted);
    updateReminders({ enabled: granted });
  };

  const stepHour = (key: "startHour" | "endHour", delta: number) => {
    const next = Math.min(23, Math.max(0, settings.reminders[key] + delta));
    updateReminders({ [key]: next });
  };

  const reminderCount = reminderTimes(settings.reminders).length;

  const toggleTapColor = (color: string) => {
    const has = settings.tapColors.includes(color);
    if (has && settings.tapColors.length === 1) return; // Keep at least one.
    update({
      tapColors: has
        ? settings.tapColors.filter((c) => c !== color)
        : [...settings.tapColors, color],
    });
  };

  const toggleRippleColor = (color: string) => {
    const has = settings.rippleColors.includes(color);
    update({
      rippleColors: has
        ? settings.rippleColors.filter((c) => c !== color)
        : [...settings.rippleColors, color],
    });
  };

  const choosePattern = (key: "tapPattern" | "holdPattern", id: PatternId) => {
    update({ [key]: id });
    playPattern(PATTERNS_BY_ID[id]);
  };

  const rewardMode = REWARD_MODES.find((m) => m.id === settings.rewardMode) ?? REWARD_MODES[1];

  const chooseRewardMode = (id: RewardMode) => {
    update({ rewardMode: id });
    const m = RIPPLE_MODES[id];
    playReward({ pattern: m.pulsar, strength: settings.hapticStrength, pulses: m.pulses });
  };

  const pulsar = isPulsarAvailable();
  const pulsarLevel = pulsarSupportLevel();

  const chooseStrength = (value: number) => {
    update({ hapticStrength: value });
    const m = RIPPLE_MODES[settings.rewardMode] ?? RIPPLE_MODES.pulse;
    playReward({ pattern: m.pulsar, strength: value, pulses: m.pulses });
  };

  const choosePreset = (key: "tapPreset" | "holdPreset", name: string | null) => {
    update({ [key]: name });
    if (name) playPulsarPreset(name);
    else if (key === "tapPreset") {
      const m = RIPPLE_MODES[settings.rewardMode] ?? RIPPLE_MODES.pulse;
      playReward({ pattern: m.pulsar, strength: settings.hapticStrength, pulses: m.pulses });
    } else playPulses(PATTERNS_BY_ID[settings.holdPattern].pulses);
  };

  const stepHold = (delta: number) => {
    const next = Math.min(600, Math.max(1, settings.holdSeconds + delta));
    update({ holdSeconds: next });
  };

  const modeHint = MODES.find((m) => m.id === settings.mode)?.hint ?? "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 12) },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        >
          <Section title="How it rewards" theme={theme}>
            <Row>
              {MODES.map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  selected={settings.mode === m.id}
                  onPress={() => update({ mode: m.id })}
                  theme={theme}
                />
              ))}
            </Row>
            <Hint theme={theme}>{modeHint}</Hint>
          </Section>

          <Section title="Shape" theme={theme}>
            <Row>
              {SHAPES.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  selected={settings.shape === s.id}
                  onPress={() => update({ shape: s.id })}
                  theme={theme}
                />
              ))}
            </Row>
          </Section>

          <Section title="Reward mode" theme={theme}>
            <Row>
              {REWARD_MODES.map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  selected={settings.rewardMode === m.id}
                  onPress={() => chooseRewardMode(m.id)}
                  theme={theme}
                />
              ))}
            </Row>
            <Hint theme={theme}>
              {rewardMode.visual}, {rewardMode.haptic}. Sets what a tap looks and feels like.
              Picking one plays it.
            </Hint>
          </Section>

          <Section title="Pulsar haptics" theme={theme}>
            {pulsar ? (
              <>
                <Row>
                  {STRENGTHS.map((s) => (
                    <Chip
                      key={s.value}
                      label={s.label}
                      selected={Math.abs(settings.hapticStrength - s.value) < 0.01}
                      onPress={() => chooseStrength(s.value)}
                      theme={theme}
                    />
                  ))}
                </Row>
                <Hint theme={theme}>
                  How hard a tap hits. Pulsar plays the reward modes with real amplitude and
                  sharpness on this device.
                </Hint>
                <SubTitle theme={theme}>Tap preset</SubTitle>
                <PresetPicker
                  value={settings.tapPreset}
                  onChange={(name) => choosePreset("tapPreset", name)}
                  theme={theme}
                />
                <Hint theme={theme}>
                  {settings.tapPreset
                    ? `Every tap plays "${presetLabel(settings.tapPreset)}" instead of the reward mode.`
                    : `Pick one of Pulsar's ${pulsarPresetNames().length} presets to replace the reward mode's haptic. Picking one plays it.`}
                </Hint>
                {settings.mode !== "tap" && (
                  <>
                    <SubTitle theme={theme}>Timer-done preset</SubTitle>
                    <PresetPicker
                      value={settings.holdPreset}
                      onChange={(name) => choosePreset("holdPreset", name)}
                      theme={theme}
                    />
                    <Hint theme={theme}>
                      {settings.holdPreset
                        ? `Finishing the timer plays "${presetLabel(settings.holdPreset)}".`
                        : "Replace the timer-done haptic with a Pulsar preset."}
                    </Hint>
                  </>
                )}
                {pulsarLevel < 3 && (
                  <Hint theme={theme}>
                    This device reports limited haptic control, so patterns may play simplified.
                  </Hint>
                )}
              </>
            ) : (
              <Hint theme={theme}>
                Pulsar adds 150+ haptic presets and patterns with real amplitude and sharpness.
                It needs a development or store build. In Expo Go the built-in patterns play
                instead.
              </Hint>
            )}
          </Section>

          {settings.mode !== "tap" && (
            <>
              <Section title="Hold timer" theme={theme}>
                <Row>
                  {HOLD_PRESETS.map((s) => (
                    <Chip
                      key={s}
                      label={`${s}s`}
                      selected={settings.holdSeconds === s}
                      onPress={() => update({ holdSeconds: s })}
                      theme={theme}
                    />
                  ))}
                </Row>
                <View style={styles.stepper}>
                  <StepButton label="-" onPress={() => stepHold(-1)} theme={theme} />
                  <Text style={[styles.stepValue, { color: theme.text }]}>
                    {settings.holdSeconds}s
                  </Text>
                  <StepButton label="+" onPress={() => stepHold(1)} theme={theme} />
                </View>
                <Hint theme={theme}>
                  Hold the button until the ring closes. Let go early and nothing happens.
                </Hint>
              </Section>

              <Section title="Timer-done haptic" theme={theme}>
                <Row>
                  {Object.values(PATTERNS_BY_ID).map((p) => (
                    <Chip
                      key={p.id}
                      label={p.label}
                      selected={settings.holdPattern === p.id}
                      onPress={() => choosePattern("holdPattern", p.id)}
                      theme={theme}
                    />
                  ))}
                </Row>
                <Hint theme={theme}>
                  {PATTERNS_BY_ID[settings.holdPattern].description} This is what buzzes back at
                  you when the ring completes.
                </Hint>
              </Section>
            </>
          )}

          <Section title="Resting color" theme={theme}>
            <Row>
              {SWATCHES.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  selected={settings.idleColor === c}
                  onPress={() => update({ idleColor: c })}
                  theme={theme}
                />
              ))}
            </Row>
          </Section>

          <Section title="Reward colors" theme={theme}>
            <Row>
              {SWATCHES.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  selected={settings.tapColors.includes(c)}
                  onPress={() => toggleTapColor(c)}
                  theme={theme}
                />
              ))}
            </Row>
            <Hint theme={theme}>
              Each reward moves to the next selected color. Pick one color to make it flip.
            </Hint>
            <ToggleRow
              label="Shuffle colors"
              value={settings.randomColors}
              onChange={(v) => update({ randomColors: v })}
              theme={theme}
            />
            <ToggleRow
              label="Snap back to resting color"
              value={settings.returnToIdle}
              onChange={(v) => update({ returnToIdle: v })}
              theme={theme}
            />
          </Section>

          <Section title="Ripples" theme={theme}>
            <Hint theme={theme}>
              Every tap sends one ripple out from the button. Choose its outline and the colors
              it cycles through, one per tap.
            </Hint>
            <Text style={[styles.subLabel, { color: theme.muted }]}>Outline</Text>
            <Row>
              {RIPPLE_SHAPES.map((r) => (
                <Chip
                  key={r.id}
                  label={r.label}
                  selected={settings.rippleShape === r.id}
                  onPress={() => update({ rippleShape: r.id })}
                  theme={theme}
                />
              ))}
            </Row>
            <Text style={[styles.subLabel, { color: theme.muted }]}>Ripple colors</Text>
            <Row>
              {SWATCHES.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  selected={settings.rippleColors.includes(c)}
                  onPress={() => toggleRippleColor(c)}
                  theme={theme}
                />
              ))}
            </Row>
            <Hint theme={theme}>
              {settings.rippleColors.length === 0
                ? "No ripple colors picked, so each ripple takes the button's new color."
                : `Ripples cycle through ${settings.rippleColors.length} ${settings.rippleColors.length === 1 ? "color" : "colors"}${settings.randomColors ? ", shuffled" : ", in order"}. Clear them all to make ripples follow the button color.`}
            </Hint>
          </Section>

          <Section title="Background" theme={theme}>
            <Row>
              <Chip
                label="Navy glow"
                selected={settings.backdrop === "navy"}
                onPress={() => update({ backdrop: "navy" })}
                theme={theme}
              />
              <Chip
                label="Match phone"
                selected={settings.backdrop === "system"}
                onPress={() => update({ backdrop: "system" })}
                theme={theme}
              />
            </Row>
            <Row>
              {BACKDROP_COLORS.map((c) => (
                <Swatch
                  key={c.hex}
                  color={c.hex}
                  selected={settings.backdrop === c.hex}
                  onPress={() => update({ backdrop: c.hex })}
                  theme={theme}
                />
              ))}
            </Row>
            <Hint theme={theme}>
              {settings.backdrop === "navy"
                ? "The icon's deep navy with a soft glow behind the button."
                : settings.backdrop === "system"
                  ? "Follows your phone's light or dark setting."
                  : `${BACKDROP_COLORS.find((c) => c.hex === settings.backdrop)?.name ?? "Custom color"}. Text switches to stay readable on it.`}
            </Hint>
          </Section>

          <Section title="After calendar events" theme={theme}>
            <ToggleRow
              label="Nudge me after events end"
              value={settings.calendarNudges.enabled}
              onChange={(v) => void toggleNudges(v)}
              theme={theme}
            />
            <Hint theme={theme}>
              Reads your calendar and sends a notification when each event ends: the meeting is
              over, the workout is done, come tap. Nothing is written to the calendar or sent
              anywhere.
            </Hint>
            {calendarDenied && (
              <Hint theme={theme}>
                Calendar access is off for Touchward. Allow full calendar access in your phone
                settings, then flip this switch again.
              </Hint>
            )}
            {settings.calendarNudges.enabled && (
              <>
                <Text style={[styles.subLabel, { color: theme.muted }]}>Nudge</Text>
                <Row>
                  {NUDGE_DELAYS.map((m) => (
                    <Chip
                      key={m}
                      label={m === 0 ? "Right away" : `${m} min after`}
                      selected={settings.calendarNudges.minutesAfter === m}
                      onPress={() => updateNudges({ minutesAfter: m })}
                      theme={theme}
                    />
                  ))}
                </Row>
                {calendars.length > 1 && (
                  <>
                    <Text style={[styles.subLabel, { color: theme.muted }]}>Calendars</Text>
                    <Row>
                      <Chip
                        label="All"
                        selected={settings.calendarNudges.calendarIds === null}
                        onPress={() => updateNudges({ calendarIds: null })}
                        theme={theme}
                      />
                      {calendars.map((c) => (
                        <Chip
                          key={c.id}
                          label={c.title}
                          selected={
                            settings.calendarNudges.calendarIds === null ||
                            settings.calendarNudges.calendarIds.includes(c.id)
                          }
                          onPress={() => toggleCalendar(c.id)}
                          theme={theme}
                        />
                      ))}
                    </Row>
                  </>
                )}
                <Hint theme={theme}>
                  {nudgeCount === null
                    ? "Scanning the next 7 days..."
                    : nudgeCount === 0
                      ? "No timed events in the next 7 days. All-day events are skipped."
                      : `${nudgeCount} ${nudgeCount === 1 ? "nudge" : "nudges"} queued for the next 7 days. Refreshes each time you open the app.`}
                </Hint>
              </>
            )}
          </Section>

          <Section title="Reminders" theme={theme}>
            <ToggleRow
              label="Remind me to tap"
              value={settings.reminders.enabled}
              onChange={(v) => void toggleReminders(v)}
              theme={theme}
            />
            {permissionDenied && (
              <Hint theme={theme}>
                Notifications are turned off for Touchward in your phone settings. Turn them on
                there, then flip this switch again.
              </Hint>
            )}
            {settings.reminders.enabled && (
              <>
                <Text style={[styles.subLabel, { color: theme.muted }]}>Every</Text>
                <Row>
                  {REMINDER_INTERVALS.map((h) => (
                    <Chip
                      key={h}
                      label={h === 1 ? "hour" : `${h} hours`}
                      selected={settings.reminders.everyHours === h}
                      onPress={() => updateReminders({ everyHours: h })}
                      theme={theme}
                    />
                  ))}
                </Row>
                <Text style={[styles.subLabel, { color: theme.muted }]}>From</Text>
                <View style={styles.stepper}>
                  <StepButton
                    label="-"
                    onPress={() => stepHour("startHour", -1)}
                    theme={theme}
                  />
                  <Text style={[styles.stepValue, { color: theme.text }]}>
                    {formatHour(settings.reminders.startHour)}
                  </Text>
                  <StepButton
                    label="+"
                    onPress={() => stepHour("startHour", 1)}
                    theme={theme}
                  />
                </View>
                <Text style={[styles.subLabel, { color: theme.muted }]}>Until</Text>
                <View style={styles.stepper}>
                  <StepButton label="-" onPress={() => stepHour("endHour", -1)} theme={theme} />
                  <Text style={[styles.stepValue, { color: theme.text }]}>
                    {formatHour(settings.reminders.endHour)}
                  </Text>
                  <StepButton label="+" onPress={() => stepHour("endHour", 1)} theme={theme} />
                </View>
                <Hint theme={theme}>
                  {reminderCount} {reminderCount === 1 ? "reminder" : "reminders"} a day.
                  Tapping a reminder, or its "I did it" button, counts as a tap.
                </Hint>
              </>
            )}
            {(settings.reminders.enabled || settings.calendarNudges.enabled) && (
              <>
                <ToggleRow
                  label="Time sensitive (breaks through Focus)"
                  value={settings.reminders.timeSensitive}
                  onChange={(v) => updateReminders({ timeSensitive: v })}
                  theme={theme}
                />
                <Hint theme={theme}>
                  Applies to reminders and calendar nudges. On iPhone they then show even in a
                  Focus mode.
                </Hint>
              </>
            )}
          </Section>

          <Section title="Side buttons" theme={theme}>
            <ToggleRow
              label="Volume buttons tap the button"
              value={settings.volumeButtons && volumeSupported}
              onChange={(v) => update({ volumeButtons: v })}
              theme={theme}
            />
            <Hint theme={theme}>
              {volumeSupported
                ? "While Touchward is open, either volume button counts as a tap. Your volume is parked at half and put back when you leave."
                : "Not available in Expo Go. Install a development build or the store version to use the volume buttons."}
            </Hint>
            <Text style={[styles.subLabel, { color: theme.muted }]}>
              Action Button, Back Tap, Quick Tap
            </Text>
            <Hint theme={theme}>
              Make a shortcut that opens this link and Touchward will tap for you the moment it
              opens:
            </Hint>
            <Text
              selectable
              style={[styles.code, { color: theme.text, borderColor: theme.border }]}
            >
              {REWARD_LINK}
            </Text>
            <Hint theme={theme}>
              iPhone: Shortcuts app, new shortcut, "Open URL", paste the link, then assign it in
              Settings under Action Button or Accessibility, Touch, Back Tap. Android: assign
              the shortcut to Quick Tap (Pixel) or a button remapper.
            </Hint>
            <View style={styles.actions}>
              <TextButton
                label="Test the link"
                onPress={() => void RNLinking.openURL(REWARD_LINK)}
                theme={theme}
              />
            </View>
          </Section>

          <Section title="Push notifications" theme={theme}>
            <ToggleRow
              label="Allow push notifications"
              value={settings.pushEnabled && pushSupported}
              onChange={(v) => void togglePush(v)}
              theme={theme}
            />
            <Hint theme={theme}>
              {pushSupported
                ? pushBusy
                  ? "Registering this phone..."
                  : pushDenied
                    ? "Notifications are turned off for Touchward in your phone settings, so push cannot be enabled."
                    : "Lets Touchward receive notifications sent from outside the app, for example a nudge from a shortcut or automation. A push that carries reward: true counts as a tap when you open it. Reminders work without this."
                : "Push needs a real phone and a development or store build. Reminders still work here."}
            </Hint>
            {settings.pushEnabled && push && (
              <>
                {push.expoToken && (
                  <>
                    <Text style={[styles.subLabel, { color: theme.muted }]}>
                      Expo push token
                    </Text>
                    <Text
                      selectable
                      style={[styles.code, { color: theme.text, borderColor: theme.border }]}
                    >
                      {push.expoToken}
                    </Text>
                  </>
                )}
                {push.deviceToken && (
                  <>
                    <Text style={[styles.subLabel, { color: theme.muted }]}>
                      {Platform.OS === "ios" ? "APNs device token" : "FCM device token"}
                    </Text>
                    <Text
                      selectable
                      numberOfLines={2}
                      style={[styles.code, { color: theme.text, borderColor: theme.border }]}
                    >
                      {push.deviceToken}
                    </Text>
                  </>
                )}
                <View style={styles.actions}>
                  {push.expoToken && (
                    <TextButton
                      label={copied === "expo" ? "Copied" : "Copy Expo token"}
                      onPress={() => void copy("expo", push.expoToken ?? "")}
                      theme={theme}
                    />
                  )}
                  {push.deviceToken && (
                    <TextButton
                      label={copied === "device" ? "Copied" : "Copy device token"}
                      onPress={() => void copy("device", push.deviceToken ?? "")}
                      theme={theme}
                    />
                  )}
                </View>
              </>
            )}
          </Section>

          <Section title="Counter" theme={theme}>
            <Text style={[styles.statLine, { color: theme.text }]}>
              Today: {stats.rewardsToday} All time: {stats.rewardsAllTime}
            </Text>
            <View style={styles.actions}>
              <TextButton label="Reset counter" onPress={resetStats} theme={theme} />
              <TextButton label="Reset all settings" onPress={reset} theme={theme} />
            </View>
          </Section>

          <Section title="Support" theme={theme}>
            <Hint theme={theme}>
              Something off? Send a message from inside the app and we will write back. Your
              phone model and app version go with it.
            </Hint>
            <View style={styles.actions}>
              <TextButton
                label="Contact support"
                onPress={() => setSupportOpen(true)}
                theme={theme}
              />
              <TextButton
                label="Email instead"
                onPress={() => open(`mailto:${SUPPORT_EMAIL}`)}
                theme={theme}
              />
            </View>
          </Section>

          <Section title="About" theme={theme}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>
              Touchward {version}
              {buildNumber ? ` (${buildNumber})` : ""}
            </Text>
            <Hint theme={theme}>
              A one-time purchase. No subscription, no account, nothing to restore: if you paid
              once, it is yours on every device signed in to the same store account.
            </Hint>
            <View style={styles.actions}>
              <TextButton
                label="Privacy policy"
                onPress={() => open(PRIVACY_URL)}
                theme={theme}
              />
              <TextButton label="Terms" onPress={() => open(TERMS_URL)} theme={theme} />
              <TextButton label="Source code" onPress={() => open(SOURCE_URL)} theme={theme} />
            </View>
          </Section>
        </ScrollView>
      </View>
      <SupportScreen
        visible={supportOpen}
        onClose={() => setSupportOpen(false)}
        theme={theme}
      />
    </Modal>
  );
}

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const PRESET_LIMIT = 36;

/** Chips for Pulsar's presets with a filter box, since there are 150 of them. */
function PresetPicker({
  value,
  onChange,
  theme,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
  theme: Theme;
}) {
  const [filter, setFilter] = useState("");
  const names = pulsarPresetNames();
  const q = filter.trim().toLowerCase();
  const matches = q
    ? names.filter(
        (n) => n.toLowerCase().includes(q) || presetLabel(n).toLowerCase().includes(q),
      )
    : names;
  const shown = matches.slice(0, PRESET_LIMIT);
  const hidden = matches.length - shown.length;
  return (
    <View>
      <TextInput
        value={filter}
        onChangeText={setFilter}
        placeholder="Filter presets"
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[
          styles.filter,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
        ]}
      />
      <Row>
        <Chip
          label="Default"
          selected={value === null}
          onPress={() => onChange(null)}
          theme={theme}
        />
        {value && !shown.includes(value) && (
          <Chip
            label={presetLabel(value)}
            selected
            onPress={() => onChange(value)}
            theme={theme}
          />
        )}
        {shown.map((n) => (
          <Chip
            key={n}
            label={presetLabel(n)}
            selected={value === n}
            onPress={() => onChange(n)}
            theme={theme}
          />
        ))}
      </Row>
      {hidden > 0 && (
        <Text style={[styles.subLabel, { color: theme.muted }]}>
          {hidden} more. Type to narrow the list.
        </Text>
      )}
    </View>
  );
}

function SubTitle({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return <Text style={[styles.subTitle, { color: theme.text }]}>{children}</Text>;
}

function Hint({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return <Text style={[styles.hint, { color: theme.muted }]}>{children}</Text>;
}

function ToggleRow({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.border }}
      />
    </View>
  );
}

function StepButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "One second longer" : "One second shorter"}
      style={({ pressed }) => [
        styles.stepButton,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.stepButtonText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function TextButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      {({ pressed }) => (
        <Text style={[styles.textButton, { color: theme.accent, opacity: pressed ? 0.6 : 1 }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filter: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...body(15),
    marginBottom: 10,
  },
  subTitle: {
    ...heading(15),
    marginTop: 6,
    marginBottom: 8,
  },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: heading(22),
  done: bodySemibold(17),
  content: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginTop: 24 },
  sectionTitle: {
    // Uppercase small heading: a little more tracking than the large ones.
    ...heading(12, 0.12),
    marginBottom: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap" },
  hint: { ...body(14), lineHeight: 20, marginTop: 4 },
  subLabel: { ...bodySemibold(13), marginTop: 14, marginBottom: 8 },
  code: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: { ...bodyMedium(22), lineHeight: 26 },
  stepValue: {
    ...bodySemibold(20),
    minWidth: 72,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  toggleLabel: body(16),
  statLine: { ...body(16), fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: 24, marginTop: 12 },
  textButton: bodySemibold(15),
});
