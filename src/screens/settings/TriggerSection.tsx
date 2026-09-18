import { Linking } from "react-native";
import type { Theme } from "../../design/theme";
import { isVolumeButtonSupportAvailable } from "../../hardware/volumeButtons";
import { REWARD_LINK } from "../../links";
import { useSettings } from "../../store/settings";
import { useGate, useUnlock } from "../../store/unlock";
import { Actions, Category, Code, Hint, Section, TextButton, ToggleRow } from "./controls";

export function TriggerSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  const { unlocked } = useUnlock();
  const gate = useGate();
  const volumeSupported = isVolumeButtonSupportAvailable();

  return (
    <Category title="Triggers" theme={theme}>
      <Section title="Volume buttons" theme={theme}>
        <ToggleRow
          label={
            unlocked
              ? "Volume buttons tap the button"
              : "Volume buttons tap the button (unlock)"
          }
          value={settings.volumeButtons && volumeSupported}
          onChange={(v) => gate(!v, () => update({ volumeButtons: v }))}
          theme={theme}
        />
        <Hint theme={theme}>
          {volumeSupported
            ? "While Touchward is open, either volume button counts as a tap. Your volume is parked at half and put back when you leave."
            : "Not available in this build. The development and store builds support it."}
        </Hint>
      </Section>

      <Section title="Shortcut link" theme={theme}>
        <Hint theme={theme}>
          Make a shortcut that opens this link and Touchward taps for you the moment it opens.
          On iPhone assign it to the Action Button or Back Tap; on Android to Quick Tap or a
          button remapper.
        </Hint>
        <Code theme={theme}>{REWARD_LINK}</Code>
        <Hint theme={theme}>
          iPhone: Shortcuts app, new shortcut, "Open URL", paste the link, then assign it in
          Settings under Action Button, or Accessibility, Touch, Back Tap.
        </Hint>
        <Actions>
          <TextButton
            label="Test the link"
            onPress={() => void Linking.openURL(REWARD_LINK)}
            theme={theme}
          />
        </Actions>
      </Section>
    </Category>
  );
}
