import React, { useState } from "react";
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
  formatHour,
  reminderTimes,
  requestReminderPermission,
} from "../notifications/reminders";
import { useSettings } from "../store/settings";
import type { Theme } from "../theme";
import { body, bodyMedium, bodySemibold, heading } from "../typography";
import {
  REWARD_MODES,
  HOLD_PRESETS,
  REMINDER_INTERVALS,
  SHAPES,
  STRENGTHS,
  SWATCHES,
  type RewardMode,
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

  const choosePattern = (key: "tapPattern" | "holdPattern", id: PatternId) => {
    update({ [key]: id });
    playPattern(PATTERNS_BY_ID[id]);
  };

  const isRipples = settings.shape === "ripples";
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
    const m = RIPPLE_MODES[settings.rewardMode];
    playReward({ pattern: m.pulsar, strength: value, pulses: m.pulses });
  };

  const choosePreset = (key: "tapPreset" | "holdPreset", name: string | null) => {
    update({ [key]: name });
    if (name) playPulsarPreset(name);
    else if (key === "tapPreset") playPulses(PATTERNS_BY_ID[settings.tapPattern].pulses);
    else playPulses(PATTERNS_BY_ID[settings.holdPattern].pulses);
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
            {isRipples && (
              <Hint theme={theme}>
                Ripples has its own blue and violet palette. The color choices below apply to
                the other shapes.
              </Hint>
            )}
          </Section>

          {isRipples && (
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
          )}

          {!isRipples && (
            <Section title="Tap haptic" theme={theme}>
              <Row>
                {Object.values(PATTERNS_BY_ID).map((p) => (
                  <Chip
                    key={p.id}
                    label={p.label}
                    selected={settings.tapPattern === p.id}
                    onPress={() => choosePattern("tapPattern", p.id)}
                    theme={theme}
                  />
                ))}
              </Row>
              <Hint theme={theme}>
                {PATTERNS_BY_ID[settings.tapPattern].description} Picking one plays it.
              </Hint>
            </Section>
          )}

          <Section title="Pulsar haptics" theme={theme}>
            {pulsar ? (
              <>
                {isRipples && (
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
                      How hard the reward modes hit. Pulsar plays them with real amplitude and
                      sharpness on this device.
                    </Hint>
                  </>
                )}
                <SubTitle theme={theme}>Tap preset</SubTitle>
                <PresetPicker
                  value={settings.tapPreset}
                  onChange={(name) => choosePreset("tapPreset", name)}
                  theme={theme}
                />
                <Hint theme={theme}>
                  {settings.tapPreset
                    ? `Every tap plays "${presetLabel(settings.tapPreset)}" instead of the ${
                        isRipples ? "reward mode" : "tap haptic"
                      }.`
                    : `Pick one of Pulsar's ${pulsarPresetNames().length} presets to replace the ${
                        isRipples ? "reward mode's" : "tap"
                      } haptic. Picking one plays it.`}
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
                <ToggleRow
                  label="Time sensitive (breaks through Focus)"
                  value={settings.reminders.timeSensitive}
                  onChange={(v) => updateReminders({ timeSensitive: v })}
                  theme={theme}
                />
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

          <Section title="Counter" theme={theme}>
            <Text style={[styles.statLine, { color: theme.text }]}>
              Today: {stats.rewardsToday} All time: {stats.rewardsAllTime}
            </Text>
            <View style={styles.actions}>
              <TextButton label="Reset counter" onPress={resetStats} theme={theme} />
              <TextButton label="Reset all settings" onPress={reset} theme={theme} />
            </View>
          </Section>
        </ScrollView>
      </View>
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
