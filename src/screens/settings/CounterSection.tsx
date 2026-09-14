import { Text } from "react-native";
import type { Theme } from "../../design/theme";
import { useSettings } from "../../store/settings";
import { Actions, Category, Hint, Section, TextButton, styles } from "./controls";

export function CounterSection({ theme }: { theme: Theme }) {
  const { stats, resetStats, reset } = useSettings();
  return (
    <Category title="Counter" theme={theme}>
      <Section title="Rewards" theme={theme}>
        <Text style={[styles.statLine, { color: theme.text }]}>
          Today: {stats.rewardsToday} All time: {stats.rewardsAllTime}
        </Text>
        <Hint theme={theme}>Counts stay on this phone. Nothing is uploaded.</Hint>
        <Actions>
          <TextButton label="Reset counter" onPress={resetStats} theme={theme} />
          <TextButton label="Reset all settings" onPress={reset} theme={theme} />
        </Actions>
      </Section>
    </Category>
  );
}
