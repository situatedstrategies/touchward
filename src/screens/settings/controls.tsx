import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import { body, bodyMedium, bodySemibold, heading } from "../../design/typography";
import { presetLabel, pulsarPresetNames } from "../../haptics";
import { isFreePreset } from "../../purchases/gates";
import { useGate, useUnlock } from "../../store/unlock";

/**
 * Building blocks shared by the settings sections. A Category is a top level
 * heading; each Section under it is a small caps label with its controls.
 */

export function Category({
  title,
  theme,
  children,
}: {
  title: string;
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <View style={styles.category}>
      <Text style={[styles.categoryTitle, { color: theme.text }]}>{title}</Text>
      <View style={[styles.categoryRule, { backgroundColor: theme.border }]} />
      {children}
    </View>
  );
}

export function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Hint({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <Text style={[styles.hint, { color: theme.muted }]}>{children}</Text>;
}

export function SubLabel({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <Text style={[styles.subLabel, { color: theme.muted }]}>{children}</Text>;
}

export function ToggleRow({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
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

/** A minus button, a value, and a plus button. */
export function Stepper({
  value,
  onStep,
  theme,
  decrementLabel,
  incrementLabel,
}: {
  value: string;
  onStep: (delta: number) => void;
  theme: Theme;
  decrementLabel: string;
  incrementLabel: string;
}) {
  return (
    <View style={styles.stepper}>
      <StepButton label="-" hint={decrementLabel} onPress={() => onStep(-1)} theme={theme} />
      <Text style={[styles.stepValue, { color: theme.text }]}>{value}</Text>
      <StepButton label="+" hint={incrementLabel} onPress={() => onStep(1)} theme={theme} />
    </View>
  );
}

function StepButton({
  label,
  hint,
  onPress,
  theme,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
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

export function TextButton({
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

export function Actions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

/** Selectable monospace text, for links and tokens the user may copy. */
export function Code({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <Text selectable style={[styles.code, { color: theme.text, borderColor: theme.border }]}>
      {children}
    </Text>
  );
}

const PRESET_LIMIT = 36;

/** Chips for Pulsar's presets behind a filter box, since there are over 150. */
export function PresetPicker({
  value,
  onChange,
  theme,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
  theme: Theme;
}) {
  const [filter, setFilter] = useState("");
  const { unlocked } = useUnlock();
  const gate = useGate();
  const names = pulsarPresetNames();
  const query = filter.trim().toLowerCase();
  const matches = query
    ? names.filter(
        (n) => n.toLowerCase().includes(query) || presetLabel(n).toLowerCase().includes(query),
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
            locked={!unlocked && !isFreePreset(n)}
            onPress={() => gate(isFreePreset(n), () => onChange(n))}
            theme={theme}
          />
        ))}
      </Row>
      {hidden > 0 && <SubLabel theme={theme}>{hidden} more. Type to narrow the list.</SubLabel>}
    </View>
  );
}

export const styles = StyleSheet.create({
  category: { marginTop: 36 },
  categoryTitle: heading(20),
  categoryRule: { height: StyleSheet.hairlineWidth, marginTop: 10 },
  section: { marginTop: 26 },
  sectionTitle: { ...heading(12, 0.12), marginBottom: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  hint: { ...body(14), lineHeight: 20, marginTop: 12, marginBottom: 4 },
  subLabel: { ...bodySemibold(13), marginTop: 18, marginBottom: 10 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  toggleLabel: body(16),
  stepper: { flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 8 },
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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 24, marginTop: 16 },
  textButton: bodySemibold(15),
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
  filter: {
    ...body(15),
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  statLine: { ...body(16), fontVariant: ["tabular-nums"] },
  plain: body(16),
});
