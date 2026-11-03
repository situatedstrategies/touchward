import { useEffect, useState } from "react";
import type { Theme } from "../../design/theme";
import { privacyOptionsRequired, showPrivacyOptions } from "../../ads/ads";
import { useUnlock } from "../../store/unlock";
import { Actions, Category, Hint, Section, TextButton } from "./controls";

/** The one purchase: ads off, forever. A button to buy it, a way to restore it, and the ad privacy form where the law requires one. */
export function UnlockSection({ theme }: { theme: Theme }) {
  const { unlocked, presentPaywall, restore } = useUnlock();
  const [privacyChoices, setPrivacyChoices] = useState(false);

  useEffect(() => {
    if (unlocked) return;
    let cancelled = false;
    privacyOptionsRequired()
      .then((required) => {
        if (!cancelled) setPrivacyChoices(required);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  return (
    <Category title="Ads" theme={theme}>
      <Section title={unlocked ? "Ads are off" : "Remove ads"} theme={theme}>
        <Hint theme={theme}>
          {unlocked
            ? "Thank you. Every shape, feel, preset, backdrop, nudge and trigger is yours, with no ads, on every phone signed into this store account."
            : "Everything in Touchward is free, and an ad now and then between rewards pays for it. One purchase turns the ads off for good. No subscription, no account."}
        </Hint>
        <Actions>
          {!unlocked && (
            <TextButton label="Remove ads" onPress={() => void presentPaywall()} theme={theme} />
          )}
          <TextButton label="Restore purchase" onPress={() => void restore()} theme={theme} />
          {!unlocked && privacyChoices && (
            <TextButton
              label="Ad privacy choices"
              onPress={() => void showPrivacyOptions()}
              theme={theme}
            />
          )}
        </Actions>
      </Section>
    </Category>
  );
}
