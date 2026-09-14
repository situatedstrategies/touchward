import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Theme } from "../../design/theme";
import { bodySemibold, heading } from "../../design/typography";
import { ButtonSection } from "./ButtonSection";
import { ColorSection } from "./ColorSection";
import { CounterSection } from "./CounterSection";
import { FeelSection } from "./FeelSection";
import { NotificationSection } from "./NotificationSection";
import { ShapeSection } from "./ShapeSection";
import { SupportSection } from "./SupportSection";
import { TriggerSection } from "./TriggerSection";

type Tab = "reward" | "colors" | "notify" | "more";

const TABS: { id: Tab; label: string }[] = [
  { id: "reward", label: "Reward" },
  { id: "colors", label: "Colors" },
  { id: "notify", label: "Notify" },
  { id: "more", label: "More" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
}

/**
 * The customize sheet, in tabs. Inside each tab the categories keep the same
 * order: the button first, then the ripples or the timer, then the surroundings.
 */
export function SettingsScreen({ visible, onClose, theme }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("reward");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Text style={[styles.title, { color: theme.text }]}>Customize</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </View>
        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.tab, active && { borderBottomColor: theme.text }]}
              >
                <Text style={[styles.tabLabel, { color: active ? theme.text : theme.muted }]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <ScrollView
          key={tab}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "reward" && (
            <>
              <ButtonSection theme={theme} />
              <ShapeSection theme={theme} />
              <FeelSection theme={theme} />
            </>
          )}
          {tab === "colors" && <ColorSection theme={theme} />}
          {tab === "notify" && <NotificationSection theme={theme} visible={visible} />}
          {tab === "more" && (
            <>
              <TriggerSection theme={theme} />
              <CounterSection theme={theme} />
              <SupportSection theme={theme} />
            </>
          )}
        </ScrollView>
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
    paddingBottom: 8,
  },
  title: heading(22),
  done: bodySemibold(17),
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: bodySemibold(15),
  content: { paddingHorizontal: 20, paddingTop: 4 },
});
