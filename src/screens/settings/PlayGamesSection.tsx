import type { AuthState } from "expo-play-games-kit";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { Theme } from "../../design/theme";
import {
  getPlayGamesState,
  isPlayGamesAvailable,
  onPlayGamesAuthChange,
  showPlayGamesAchievements,
  signInToPlayGames,
} from "../../games/playGames";
import { Actions, Category, Hint, Section, TextButton, styles } from "./controls";

/**
 * Google Play Games: sign-in state, a way in for anyone the automatic sign-in
 * skipped, and the achievements screen. Renders nothing on iOS and on builds
 * without a Play Games APP_ID, so the More tab looks the same as before there.
 */
export function PlayGamesSection({ theme }: { theme: Theme }) {
  const available = isPlayGamesAvailable();
  const [state, setState] = useState<AuthState | null>(null);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    getPlayGamesState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {});
    const stop = onPlayGamesAuthChange(setState);
    return () => {
      cancelled = true;
      stop();
    };
  }, [available]);

  if (!available) return null;

  const signedIn = state?.isAuthenticated === true;
  const name = state?.player?.displayName;

  return (
    <Category title="Play Games" theme={theme}>
      <Section title="Google Play Games" theme={theme}>
        <Text style={[styles.plain, { color: theme.text }]}>
          {state === null
            ? "Checking sign-in"
            : signedIn
              ? `Signed in as ${name ?? "a Play Games player"}`
              : "Not signed in"}
        </Text>
        <Hint theme={theme}>
          Achievements live with your Google account, so they follow you to a new phone. Signing
          in shares your Play Games player name and avatar with the app and nothing else.
          Touchward still has no account of its own; Google runs the sign-in.
        </Hint>
        <Actions>
          {!signedIn && (
            <TextButton
              label="Sign in to Play Games"
              onPress={() => {
                signInToPlayGames()
                  .then(setState)
                  .catch(() => {});
              }}
              theme={theme}
            />
          )}
          <TextButton
            label="Achievements"
            onPress={() => showPlayGamesAchievements().catch(() => {})}
            theme={theme}
          />
        </Actions>
      </Section>
    </Category>
  );
}
