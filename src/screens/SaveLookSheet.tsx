import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LookPreview } from "../components/LookPreview";
import type { Theme } from "../design/theme";
import { body, bodySemibold, heading } from "../design/typography";
import type { LookSettings } from "../looks/looks";

interface Props {
  visible: boolean;
  look: LookSettings;
  suggestedName: string;
  theme: Theme;
  onSave: (name: string) => void;
  onClose: () => void;
}

/** Name and keep the current look. */
export function SaveLookSheet({ visible, look, suggestedName, theme, onSave, onClose }: Props) {
  const [name, setName] = useState(suggestedName);
  useEffect(() => {
    if (visible) setName(suggestedName);
  }, [visible, suggestedName]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.center} pointerEvents="box-none">
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Save this look</Text>
          <View style={styles.row}>
            <LookPreview look={look} size={88} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={theme.muted}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => onSave(name)}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
              accessibilityLabel="Look name"
            />
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.action, { color: theme.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSave(name)} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.action, { color: theme.accent }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { ...heading(18), marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  input: {
    ...body(16),
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginTop: 18 },
  action: bodySemibold(16),
});
