import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Theme } from "../design/theme";
import { body, bodySemibold } from "../design/typography";
import { ColorWheel } from "./ColorWheel";

interface Props {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  theme: Theme;
  /** Optional action shown at the right of the row, for example Remove. */
  action?: { label: string; onPress: () => void };
  /** Saved colors for this setting, with save and remove handlers. */
  library?: {
    colors: string[];
    onSave: (hex: string) => void;
    onRemove: (hex: string) => void;
  };
}

/** A labeled color row: swatch and hex, tap to open the picker underneath. */
export function ColorField({ label, value, onChange, theme, action, library }: Props) {
  const [open, setOpen] = useState(false);
  const saved = library?.colors.includes(value.toUpperCase()) ?? false;
  return (
    <View style={[styles.field, { borderColor: theme.border }]}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}. ${open ? "Close" : "Open"} color picker`}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.swatch, { backgroundColor: value, borderColor: theme.border }]} />
        <View style={styles.text}>
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
          <Text style={[styles.hex, { color: theme.muted }]}>{value.toUpperCase()}</Text>
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.action, { color: theme.accent }]}>{action.label}</Text>
          </Pressable>
        )}
        <Text style={[styles.chevron, { color: theme.muted }]}>{open ? "Hide" : "Edit"}</Text>
      </Pressable>
      {open && (
        <>
          <ColorWheel value={value} onChange={onChange} theme={theme} />
          {library && (
            <View style={styles.library}>
              <View style={styles.libraryHeader}>
                <Text style={[styles.libraryTitle, { color: theme.muted }]}>SAVED</Text>
                <Pressable
                  onPress={() => library.onSave(value.toUpperCase())}
                  disabled={saved}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.action, { color: theme.accent, opacity: saved ? 0.5 : 1 }]}
                  >
                    {saved ? "Saved" : "Save this color"}
                  </Text>
                </Pressable>
              </View>
              {library.colors.length === 0 ? (
                <Text style={[styles.hex, { color: theme.muted }]}>
                  Nothing saved yet. Save colors you like and they stay here for this setting.
                </Text>
              ) : (
                <View style={styles.libraryRow}>
                  {library.colors.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => onChange(c)}
                      onLongPress={() => library.onRemove(c)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use saved color ${c}. Long press to remove it.`}
                      style={[
                        styles.savedSwatch,
                        {
                          backgroundColor: c,
                          borderColor: c === value.toUpperCase() ? theme.text : theme.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
              {library.colors.length > 0 && (
                <Text style={[styles.hex, { color: theme.muted }]}>
                  Tap to use a saved color. Long press to remove it.
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1 },
  label: body(16),
  hex: { ...body(13), fontVariant: ["tabular-nums"], marginTop: 2 },
  action: bodySemibold(14),
  chevron: bodySemibold(14),
  library: { marginTop: 16 },
  libraryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  libraryTitle: { ...bodySemibold(12), letterSpacing: 1.2 },
  libraryRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  savedSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    marginRight: 8,
    marginBottom: 8,
  },
});
