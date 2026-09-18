import type { Theme } from "../../design/theme";
import { FREE_COUNT, FREE_SAVED_LOOKS } from "../../purchases/gates";
import { useUnlock } from "../../store/unlock";
import { Actions, Category, Hint, Section, TextButton } from "./controls";

/** The one-time unlock: what it opens up, a button to buy it, and a way to restore it. */
export function UnlockSection({ theme }: { theme: Theme }) {
  const { unlocked, presentPaywall, restore } = useUnlock();

  return (
    <Category title="Unlock" theme={theme}>
      <Section title={unlocked ? "Everything is unlocked" : "One-time unlock"} theme={theme}>
        <Hint theme={theme}>
          {unlocked
            ? "Every shape, feel, preset, backdrop color, calendar nudge, and volume button tap is yours. Thank you."
            : `The free app includes the first ${FREE_COUNT} of every choice, all button and ripple colors, the navy and phone backdrops, reminders, and ${FREE_SAVED_LOOKS} saved looks. One purchase unlocks the rest: every shape, feel, and haptic preset, any backdrop color, calendar nudges, volume button taps, and an unlimited library. No subscription, no account.`}
        </Hint>
        <Actions>
          {!unlocked && (
            <TextButton
              label="Unlock everything"
              onPress={() => void presentPaywall()}
              theme={theme}
            />
          )}
          <TextButton label="Restore purchase" onPress={() => void restore()} theme={theme} />
        </Actions>
      </Section>
    </Category>
  );
}
