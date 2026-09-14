import * as Application from "expo-application";
import * as Device from "expo-device";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "../components/Chip";
import type { Theme } from "../design/theme";
import { body, bodySemibold, heading } from "../design/typography";
import { sendSupportMessage } from "../support/supportMessages";

/**
 * In-app support form. Collects a topic and a message, adds the phone model
 * and app version, and sends it to the support inbox through the site's
 * /api/support route. No reply address is asked for or sent. If sending fails
 * the message is kept on the device and sent the next time the app opens.
 */

const TOPICS = [
  "Something is broken",
  "Haptics",
  "Reminders",
  "Purchase",
  "An idea",
  "Something else",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
}

type Status = "idle" | "sending" | "sent" | "kept";

export function SupportScreen({ visible, onClose, theme }: Props) {
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    if (visible) {
      openedAt.current = Date.now();
      setStatus("idle");
      setError(null);
    }
  }, [visible]);

  const appVersion = Application.nativeApplicationVersion ?? "dev";
  const build = Application.nativeBuildVersion ?? "";
  const platform = `${Platform.OS === "ios" ? "iOS" : "Android"} ${Device.osVersion ?? ""}, ${
    Device.modelName ?? "unknown device"
  }, app ${appVersion}${build ? ` (${build})` : ""}`;

  const send = async () => {
    if (!message.trim()) {
      setError("Write a message first.");
      return;
    }
    setError(null);
    setStatus("sending");
    const sentNow = await sendSupportMessage({
      topic,
      message: message.trim(),
      platform,
      elapsedMs: Date.now() - openedAt.current,
      source: "app",
      userAgent: `Touchward/${appVersion} (${Platform.OS})`,
    });
    setStatus(sentNow ? "sent" : "kept");
    setMessage("");
  };

  const field = [
    styles.input,
    body(16),
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 12) },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Support</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.done, { color: theme.accent }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {status === "sent" || status === "kept" ? (
            <View>
              <Text style={[styles.h2, { color: theme.text }]}>
                {status === "sent" ? "Sent. Thank you." : "Saved for later."}
              </Text>
              <Text style={[styles.hint, { color: theme.muted }]}>
                {status === "sent"
                  ? "It is in our inbox. Messages carry no address, so we read every one but cannot write back."
                  : "It could not be sent right now, so it is kept on this phone and goes out the next time the app opens."}
              </Text>
              <View style={styles.actions}>
                <Button label="Done" onPress={onClose} theme={theme} primary />
              </View>
            </View>
          ) : (
            <View>
              <Text style={[styles.hint, { color: theme.muted }]}>
                Tell us what happened. Your phone model and app version go along with the
                message so you do not have to type them. No email or name is asked for, and none
                is sent.
              </Text>

              <Label theme={theme}>Topic</Label>
              <View style={styles.row}>
                {TOPICS.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={topic === t}
                    onPress={() => setTopic(t)}
                    theme={theme}
                  />
                ))}
              </View>

              <Label theme={theme}>Message</Label>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="What happened, and what did you expect?"
                placeholderTextColor={theme.muted}
                multiline
                textAlignVertical="top"
                style={[field, styles.multiline]}
              />

              {error && <Text style={[styles.error, { color: theme.accent }]}>{error}</Text>}

              <View style={styles.actions}>
                <Button
                  label={status === "sending" ? "Sending..." : "Send message"}
                  onPress={send}
                  theme={theme}
                  primary
                  disabled={status === "sending"}
                />
              </View>

              <Text style={[styles.meta, { color: theme.muted }]}>Sent with: {platform}.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Label({ children, theme }: { children: ReactNode; theme: Theme }) {
  return <Text style={[styles.label, { color: theme.muted }]}>{children}</Text>;
}

function Button({
  label,
  onPress,
  theme,
  primary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.text : theme.surface,
          borderColor: primary ? theme.text : theme.border,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? theme.background : theme.text }]}>
        {label}
      </Text>
    </Pressable>
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
  content: { paddingHorizontal: 20, paddingTop: 16 },
  h2: { ...heading(20), marginBottom: 8 },
  hint: { ...body(15), lineHeight: 21 },
  label: { ...heading(12, 0.12), marginTop: 22, marginBottom: 8, textTransform: "uppercase" },
  row: { flexDirection: "row", flexWrap: "wrap" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  multiline: { minHeight: 140 },
  error: { ...body(14), marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
  button: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
  buttonText: bodySemibold(16),
  meta: { ...body(12), marginTop: 20, lineHeight: 17 },
});
