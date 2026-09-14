import * as Application from "expo-application";
import * as Device from "expo-device";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Linking,
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
import {
  getStoredPrivateEmail,
  isPrivateEmailAvailable,
  requestPrivateEmail,
} from "../support/privateEmail";
import { SUPPORT_API, SUPPORT_EMAIL } from "../links";
import type { Theme } from "../design/theme";
import { body, bodySemibold, heading } from "../design/typography";

/**
 * In-app support form. Posts the same JSON the website's form sends to the
 * site's /api/support route, which emails the support inbox through Resend.
 * The reply address is the person's choice: Apple's Hide My Email relay, their
 * own address, or none. If sending fails the message is handed to the mail
 * app addressed to the same inbox, so nothing is lost.
 */

const TOPICS = [
  "Something is broken",
  "Haptics",
  "Reminders",
  "Purchase",
  "An idea",
  "Something else",
];
const EMAIL_OK = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
/** Placeholder the Worker recognizes as "no reply address". */
const ANONYMOUS_EMAIL = "anonymous@touchward-dopamine.com";

/** How the person wants to be reached: Apple's private relay, their own address, or not at all. */
type ReplyMode = "private" | "own" | "none";

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
}

type Status = "idle" | "sending" | "sent" | "failed";

export function SupportScreen({ visible, onClose, theme }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>("own");
  const [privateAvailable, setPrivateAvailable] = useState(false);
  const [privateEmail, setPrivateEmail] = useState<string | null>(null);
  const [privateBusy, setPrivateBusy] = useState(false);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    if (visible) {
      openedAt.current = Date.now();
      setStatus("idle");
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    isPrivateEmailAvailable().then((ok) => {
      if (cancelled) return;
      setPrivateAvailable(ok);
      if (ok) setReplyMode("private");
    });
    getStoredPrivateEmail().then((stored) => {
      if (!cancelled && stored) setPrivateEmail(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const usePrivateEmail = async () => {
    setPrivateBusy(true);
    const relay = await requestPrivateEmail();
    setPrivateBusy(false);
    if (relay) {
      setPrivateEmail(relay);
      setError(null);
    } else {
      setError("Apple did not provide a private address. You can type an email instead.");
    }
  };

  const replyAddress =
    replyMode === "private"
      ? privateEmail
      : replyMode === "own"
        ? email.trim()
        : ANONYMOUS_EMAIL;

  const appVersion = Application.nativeApplicationVersion ?? "dev";
  const build = Application.nativeBuildVersion ?? "";
  const platform = `${Platform.OS === "ios" ? "iOS" : "Android"} ${Device.osVersion ?? ""}, ${
    Device.modelName ?? "unknown device"
  }, app ${appVersion}${build ? ` (${build})` : ""}`;

  const validate = (): string | null => {
    if (replyMode === "private" && !privateEmail) {
      return "Tap Use Apple private email first, or choose another reply option.";
    }
    if (replyMode === "own" && !EMAIL_OK.test(email.trim())) {
      return "Add an email address so we can reply, or choose No reply.";
    }
    if (!message.trim()) return "Write a message first.";
    return null;
  };

  const payload = () => ({
    name: name.trim(),
    email: replyAddress ?? ANONYMOUS_EMAIL,
    anonymous: replyMode === "none",
    platform,
    topic,
    message: message.trim(),
    elapsedMs: Date.now() - openedAt.current,
    source: "app",
    userAgent: `Touchward/${appVersion} (${Platform.OS})`,
  });

  const mailto = () => {
    const subject = encodeURIComponent(`Touchward support: ${topic}`);
    const text = encodeURIComponent(`${message.trim()}\n\n${name.trim()}\n${platform}`);
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${text}`;
  };

  const send = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch(SUPPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  const sendByMail = () => {
    Linking.openURL(mailto()).catch(() => {});
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
          {status === "sent" ? (
            <View>
              <Text style={[styles.h2, { color: theme.text }]}>Sent. Thank you.</Text>
              <Text style={[styles.hint, { color: theme.muted }]}>
                It is in the inbox. Replies come from {SUPPORT_EMAIL}, so keep an eye on spam
                the first time.
              </Text>
              <View style={styles.actions}>
                <Button label="Done" onPress={onClose} theme={theme} primary />
              </View>
            </View>
          ) : (
            <View>
              <Text style={[styles.hint, { color: theme.muted }]}>
                Tell us what happened and we will write back. Your phone and app version go
                along with the message so you do not have to type them.
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

              <Label theme={theme}>Reply to</Label>
              <View style={styles.row}>
                {privateAvailable && (
                  <Chip
                    label="Apple private email"
                    selected={replyMode === "private"}
                    onPress={() => setReplyMode("private")}
                    theme={theme}
                  />
                )}
                <Chip
                  label="My email"
                  selected={replyMode === "own"}
                  onPress={() => setReplyMode("own")}
                  theme={theme}
                />
                <Chip
                  label="No reply"
                  selected={replyMode === "none"}
                  onPress={() => setReplyMode("none")}
                  theme={theme}
                />
              </View>
              {replyMode === "private" && (
                <View style={styles.privateBox}>
                  <Text
                    style={[styles.hint, { color: privateEmail ? theme.text : theme.muted }]}
                  >
                    {privateEmail
                      ? `Replies go to ${privateEmail}, a relay Apple forwards to you. We never see your real address.`
                      : "Apple gives the app a private relay address for you. Choose Hide My Email when Apple asks. We only ever see the relay."}
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      label={
                        privateBusy
                          ? "Asking Apple..."
                          : privateEmail
                            ? "Use a different private email"
                            : "Use Apple private email"
                      }
                      onPress={() => void usePrivateEmail()}
                      theme={theme}
                      disabled={privateBusy}
                    />
                  </View>
                </View>
              )}
              {replyMode === "own" && (
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={field}
                />
              )}
              {replyMode === "none" && (
                <Text style={[styles.hint, { color: theme.muted }]}>
                  We will read it but cannot write back. No address is sent.
                </Text>
              )}

              <Label theme={theme}>Name (optional)</Label>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="How should we address you?"
                placeholderTextColor={theme.muted}
                textContentType="name"
                style={field}
              />

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
              {status === "failed" && (
                <Text style={[styles.error, { color: theme.accent }]}>
                  Could not send from here right now. You can send it from your mail app
                  instead, to the same inbox.
                </Text>
              )}

              <View style={styles.actions}>
                <Button
                  label={status === "sending" ? "Sending..." : "Send message"}
                  onPress={send}
                  theme={theme}
                  primary
                  disabled={status === "sending"}
                />
                {status === "failed" && (
                  <Button label="Send by email" onPress={sendByMail} theme={theme} />
                )}
              </View>

              <Text style={[styles.meta, { color: theme.muted }]}>
                Sent with: {platform}. Writing to {SUPPORT_EMAIL} from your own mail app uses
                whatever address that app sends from.
              </Text>
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 140 },
  privateBox: { marginTop: 4 },
  error: { ...body(14), marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  buttonText: bodySemibold(16),
  meta: { ...body(12), marginTop: 20, lineHeight: 17 },
});
