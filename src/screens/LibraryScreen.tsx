import { useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LookPreview } from "../components/LookPreview";
import type { Theme } from "../design/theme";
import { body, bodySemibold, heading } from "../design/typography";
import { presetLabel } from "../haptics";
import { sameLook, type LookSettings, type SavedLook } from "../looks/looks";
import { PRESETS, type Preset } from "../looks/presets";
import { FREE_COUNT, FREE_SAVED_LOOKS, isFreeLook } from "../purchases/gates";
import { useLooks } from "../store/looks";
import { useUnlock } from "../store/unlock";
import { LockIcon } from "../components/LockIcon";
import { REWARD_MODES, SHAPES } from "../types";

interface Props {
  visible: boolean;
  current: LookSettings;
  theme: Theme;
  onApply: (look: LookSettings) => void;
  onClose: () => void;
}

type Page = "saved" | "presets";

const PAGES: { id: Page; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "presets", label: "Presets" },
];

/**
 * Two pages: the user's saved looks (newest first, opened by default) and the
 * built in presets. Tap a still to wear that look. Saved looks can be renamed
 * or deleted; presets can be copied into the saved page.
 */
export function LibraryScreen({ visible, current, theme, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { looks, save, rename, remove } = useLooks();
  const { unlocked, presentPaywall } = useUnlock();
  const [page, setPage] = useState<Page>("saved");

  // Presets past the first few, and any look that uses a locked choice, need the unlock.
  const presetLocked = (index: number) => !unlocked && index >= FREE_COUNT;
  const lookLocked = (look: LookSettings) => !unlocked && !isFreeLook(look);
  const wear = (look: LookSettings, locked: boolean) => {
    if (!locked) {
      onApply(look);
      return;
    }
    presentPaywall()
      .then((ok) => {
        if (ok) onApply(look);
      })
      .catch(() => {});
  };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Every visit starts on the saved page.
  useEffect(() => {
    if (visible) setPage("saved");
  }, [visible]);

  const commitRename = (id: string) => {
    rename(id, draft);
    setEditing(null);
  };

  const confirmDelete = (item: SavedLook) => {
    Alert.alert("Delete this look?", `"${item.name}" will be removed from your library.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(item.id) },
    ]);
  };

  const keepPreset = (preset: Preset) => {
    if (!unlocked && looks.length >= FREE_SAVED_LOOKS) {
      presentPaywall()
        .then((ok) => {
          if (ok) keepPreset(preset);
        })
        .catch(() => {});
      return;
    }
    save(preset.name, preset.look);
    Alert.alert("Saved", `"${preset.name}" is now in your saved looks.`);
  };

  const card = (
    key: string,
    look: LookSettings,
    label: string,
    name: ReactNode,
    meta: string,
    actions: ReactNode,
    spread = false,
    locked = false,
  ) => {
    const active = sameLook(look, current);
    return (
      <View
        key={key}
        style={[styles.item, { borderColor: active ? theme.text : theme.border }]}
      >
        <Pressable
          onPress={() => wear(look, locked)}
          accessibilityRole="button"
          accessibilityLabel={`Use ${label}`}
          accessibilityHint={locked ? "Needs the unlock" : undefined}
          style={({ pressed }) => [styles.itemMain, { opacity: pressed ? 0.7 : 1 }]}
        >
          <LookPreview look={look} size={84} />
          <View style={styles.itemText}>
            {name}
            <Text style={[styles.meta, { color: theme.muted }]}>
              {active ? "Wearing now" : locked ? "Needs the unlock" : meta}
            </Text>
            {locked && (
              <View style={styles.lockRow}>
                <LockIcon color={theme.muted} size={13} />
              </View>
            )}
          </View>
        </Pressable>
        <View style={[styles.itemActions, spread && styles.spread]}>{actions}</View>
      </View>
    );
  };

  const renderSaved = ({ item }: { item: SavedLook }) => {
    const date = item.savedAt ? new Date(item.savedAt) : null;
    return card(
      item.id,
      item.look,
      item.name,
      editing === item.id ? (
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
      ),
      date ? date.toLocaleDateString() : "",
      <>
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
        <Pressable onPress={() => confirmDelete(item)} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.action, { color: theme.accent }]}>Delete</Text>
        </Pressable>
      </>,
      false,
      lookLocked(item.look),
    );
  };

  const renderPreset = ({ item, index }: { item: Preset; index: number }) => {
    const locked = presetLocked(index) || lookLocked(item.look);
    const shape = SHAPES.find((s) => s.id === item.look.shape)?.label ?? "";
    const mode = REWARD_MODES.find((m) => m.id === item.look.rewardMode)?.label ?? "";
    const haptic = item.look.tapPreset ? presetLabel(item.look.tapPreset) : "";
    return card(
      item.id,
      item.look,
      item.name,
      <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>,
      item.tagline,
      <>
        <Text style={[styles.detail, { color: theme.muted }]}>
          {[shape, mode, haptic].filter(Boolean).join(" · ")}
        </Text>
        <Pressable
          onPress={() => (locked ? wear(item.look, true) : keepPreset(item))}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={[styles.action, { color: theme.accent }]}>
            {locked ? "Unlock" : "Save a copy"}
          </Text>
        </Pressable>
      </>,
      true,
      locked,
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
        <View
          style={[styles.tabs, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          {PAGES.map((p) => {
            const selected = page === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPage(p.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.tab, selected && { backgroundColor: theme.text }]}
              >
                <Text
                  style={[styles.tabLabel, { color: selected ? theme.background : theme.text }]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {page === "saved" ? (
          looks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                Nothing saved yet. Tap Save under the button to keep a look, try Random, or pick
                a preset and save a copy.
              </Text>
            </View>
          ) : (
            <FlatList
              data={looks}
              keyExtractor={(l) => l.id}
              renderItem={renderSaved}
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
              keyboardShouldPersistTaps="handled"
            />
          )
        ) : (
          <FlatList
            data={PRESETS}
            keyExtractor={(p) => p.id}
            renderItem={renderPreset}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
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
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  tabLabel: bodySemibold(15),
  list: { padding: 16 },
  item: { borderWidth: 1, borderRadius: 20, padding: 12, marginBottom: 12 },
  lockRow: { marginTop: 6 },
  itemMain: { flexDirection: "row", alignItems: "center", gap: 14 },
  itemText: { flex: 1 },
  name: bodySemibold(17),
  meta: { ...body(13), marginTop: 4, lineHeight: 18 },
  rename: { ...bodySemibold(17), borderBottomWidth: 1, paddingVertical: 2 },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 10,
    marginLeft: 98,
  },
  spread: { justifyContent: "space-between" },
  action: bodySemibold(14),
  detail: { ...body(12), flexShrink: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { ...body(16), textAlign: "center", lineHeight: 22 },
});
