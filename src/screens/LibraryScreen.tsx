import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LookPreview } from "../components/LookPreview";
import type { Theme } from "../design/theme";
import { body, bodySemibold, heading } from "../design/typography";
import { sameLook, type LookSettings, type SavedLook } from "../looks/looks";
import { useLooks } from "../store/looks";

interface Props {
  visible: boolean;
  current: LookSettings;
  theme: Theme;
  onApply: (look: LookSettings) => void;
  onClose: () => void;
}

/** Every saved look, newest first, with a still of each. Tap one to wear it. */
export function LibraryScreen({ visible, current, theme, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { looks, rename, remove } = useLooks();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commitRename = (id: string) => {
    rename(id, draft);
    setEditing(null);
  };

  const renderItem = ({ item }: { item: SavedLook }) => {
    const active = sameLook(item.look, current);
    const date = item.savedAt ? new Date(item.savedAt) : null;
    return (
      <View style={[styles.item, { borderColor: active ? theme.text : theme.border }]}>
        <Pressable
          onPress={() => onApply(item.look)}
          accessibilityRole="button"
          accessibilityLabel={`Use ${item.name}`}
          style={({ pressed }) => [styles.itemMain, { opacity: pressed ? 0.7 : 1 }]}
        >
          <LookPreview look={item.look} size={84} />
          <View style={styles.itemText}>
            {editing === item.id ? (
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={() => commitRename(item.id)}
                onBlur={() => commitRename(item.id)}
                style={[styles.rename, { color: theme.text, borderColor: theme.border }]}
              />
            ) : (
              <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            )}
            <Text style={[styles.meta, { color: theme.muted }]}>
              {active ? "Wearing now" : date ? date.toLocaleDateString() : ""}
            </Text>
          </View>
        </Pressable>
        <View style={styles.itemActions}>
          <Pressable
            onPress={() => {
              setEditing(item.id);
              setDraft(item.name);
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={[styles.action, { color: theme.accent }]}>Rename</Text>
          </Pressable>
          <Pressable onPress={() => remove(item.id)} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.action, { color: theme.accent }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

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
          <Text style={[styles.title, { color: theme.text }]}>Library</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </View>
        {looks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Nothing saved yet. Tap Save under the button to keep a look, or Random to find
              one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={looks}
            keyExtractor={(l) => l.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  list: { padding: 16 },
  item: { borderWidth: 1, borderRadius: 20, padding: 12, marginBottom: 12 },
  itemMain: { flexDirection: "row", alignItems: "center", gap: 14 },
  itemText: { flex: 1 },
  name: bodySemibold(17),
  meta: { ...body(13), marginTop: 4 },
  rename: { ...bodySemibold(17), borderBottomWidth: 1, paddingVertical: 2 },
  itemActions: { flexDirection: "row", gap: 20, marginTop: 10, marginLeft: 98 },
  action: bodySemibold(14),
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { ...body(16), textAlign: "center", lineHeight: 22 },
});
