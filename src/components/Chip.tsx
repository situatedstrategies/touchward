import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Theme } from "../design/theme";
import { bodySemibold } from "../design/typography";
import { LockIcon } from "./LockIcon";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: Theme;
  /** Needs the unlock. Drawn muted with a padlock; pressing it opens the paywall. */
  locked?: boolean;
}

export function Chip({ label, selected, onPress, theme, locked = false }: Props) {
  const color = selected ? theme.background : locked ? theme.muted : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityHint={locked ? "Needs the unlock" : undefined}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.text : theme.surface,
          borderColor: selected ? theme.text : theme.border,
          borderStyle: locked && !selected ? "dashed" : "solid",
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {locked && (
        <View style={styles.lock}>
          <LockIcon color={color} />
        </View>
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  lock: { marginRight: 6 },
  label: bodySemibold(15),
});
