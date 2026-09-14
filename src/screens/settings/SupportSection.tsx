import * as Application from "expo-application";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Linking, Text } from "react-native";
import type { Theme } from "../../design/theme";
import { PRIVACY_URL, SOURCE_URL, SUPPORT_EMAIL, TERMS_URL } from "../../links";
import { SupportScreen } from "../SupportScreen";
import { Actions, Category, Hint, Section, TextButton, styles } from "./controls";

function openLink(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}

export function SupportSection({ theme }: { theme: Theme }) {
  const [formOpen, setFormOpen] = useState(false);
  const version = Application.nativeApplicationVersion ?? "dev";
  const build = Application.nativeBuildVersion ?? "";

  return (
    <Category title="Support" theme={theme}>
      <Section title="Get help" theme={theme}>
        <Hint theme={theme}>
          Something off? Send a message from inside the app and we will write back. Your phone
          model and app version go with it.
        </Hint>
        <Actions>
          <TextButton label="Contact support" onPress={() => setFormOpen(true)} theme={theme} />
          <TextButton
            label="Email instead"
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            theme={theme}
          />
        </Actions>
      </Section>

      <Section title="About" theme={theme}>
        <Text style={[styles.plain, { color: theme.text }]}>
          Touchward {version}
          {build ? ` (${build})` : ""}
        </Text>
        <Hint theme={theme}>
          A one-time purchase. No subscription, no account, nothing to restore: if you paid
          once, it is yours on every device signed in to the same store account.
        </Hint>
        <Actions>
          <TextButton
            label="Privacy policy"
            onPress={() => openLink(PRIVACY_URL)}
            theme={theme}
          />
          <TextButton label="Terms" onPress={() => openLink(TERMS_URL)} theme={theme} />
          <TextButton label="Source code" onPress={() => openLink(SOURCE_URL)} theme={theme} />
        </Actions>
      </Section>

      <SupportScreen visible={formOpen} onClose={() => setFormOpen(false)} theme={theme} />
    </Category>
  );
}
