import { Text } from "react-native";
import type { Theme } from "../../design/theme";
import { BERSERK_EVERY, rewardsToNextBerserk } from "../../games/milestones";
import { useSettings } from "../../store/settings";
import { Actions, Category, Hint, Section, TextButton, styles } from "./controls";

export function CounterSection({ theme }: { theme: Theme }) {
  const { stats, resetStats, reset } = useSettings();
  const toGo = rewardsToNextBerserk(stats.rewardsAllTime);
  return (
    <Category title="Counter" theme={theme}>
      <Section title="Rewards" theme={theme}>
        <Text style={[styles.statLine, { color: theme.text }]}>
          Today: {stats.rewardsToday} All time: {stats.rewardsAllTime}
        </Text>
        <Text style={[styles.statLine, { color: theme.text }]}>
          Next berserk in {toGo} {toGo === 1 ? "tap" : "taps"}
        </Text>
        <Hint theme={theme}>
          Every {BERSERK_EVERY} rewards the button goes berserk for a few seconds: the phone
          buzzes like crazy and the button runs through random colors, shakes, and ripples.
          Counts stay on this phone. Nothing is uploaded.
        </Hint>
        <Actions>
          <TextButton label="Reset counter" onPress={resetStats} theme={theme} />
          <TextButton label="Reset all settings" onPress={reset} theme={theme} />
        </Actions>
      </Section>
    </Category>
  );
}
