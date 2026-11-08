import type { Theme } from "../../design/theme";
import { FREE_REWARDS_PER_DAY } from "../../store/dailyCap";
import { useUnlock } from "../../store/unlock";
import { Actions, Category, Hint, Section, TextButton } from "./controls";

/** The one purchase, Touchward Full: a button to buy it and a way to restore it. */
export function UnlockSection({ theme }: { theme: Theme }) {
  const { unlocked, presentPaywall, restore } = useUnlock();

  return (
    <Category title="Touchward Full" theme={theme}>
      <Section title={unlocked ? "Yours" : "One purchase"} theme={theme}>
        <Hint theme={theme}>
          {unlocked
            ? "Thank you. No daily limit, and every shape, color, mode and haptic is yours, on every phone signed in to this store account."
            : `The free app gives you ${FREE_REWARDS_PER_DAY} rewards a day with the default look. Touchward Full is one purchase, once: no daily limit, and everything in Customize. No subscription, no account.`}
        </Hint>
        <Actions>
          {!unlocked && (
            <TextButton
              label="Get Touchward Full"
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
