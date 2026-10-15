import { requireOptionalNativeModule } from "expo";
import type { AuthState } from "expo-play-games-kit";
import { Platform } from "react-native";

/**
 * Google Play Games Services, through expo-play-games-kit.
 *
 * Android only for now: the iOS half of the kit is Game Center, which needs
 * the capability turned on in App Store Connect before the entitlement can
 * ship, so the config plugin leaves the entitlement off (`app.json`).
 *
 * The kit is an Expo module, so like Pulsar, purchases, and analytics it is
 * required lazily after checking that the native side is present. A build
 * whose manifest carries no Play Games APP_ID (the placeholder in `app.json`
 * not yet replaced, or a build made without the plugin) reports no
 * capabilities, and every function here becomes a no-op, so the settings
 * screen can simply hide the section.
 */

type PlayGamesModule = typeof import("expo-play-games-kit");

let kit: PlayGamesModule | null | undefined;

function loadKit(): PlayGamesModule | null {
  if (kit !== undefined) return kit;
  try {
    kit =
      Platform.OS === "android" && requireOptionalNativeModule("PlayGamesKit")
        ? (require("expo-play-games-kit") as PlayGamesModule)
        : null;
    if (kit && !kit.getCapabilities().auth) kit = null;
  } catch {
    kit = null;
  }
  return kit ?? null;
}

/** True when this build can talk to Play Games: Android, module linked, APP_ID set. */
export function isPlayGamesAvailable(): boolean {
  return loadKit() !== null;
}

const SIGNED_OUT: AuthState = { isAuthenticated: false };

/** The current sign-in state without showing any UI. The SDK signs in on its own at launch. */
export async function getPlayGamesState(): Promise<AuthState> {
  const mod = loadKit();
  if (!mod) return SIGNED_OUT;
  return mod.isAuthenticated();
}

/** Interactive sign-in. Resolves with the new state; a cancelled sign-in is not an error. */
export async function signInToPlayGames(): Promise<AuthState> {
  const mod = loadKit();
  if (!mod) return SIGNED_OUT;
  return mod.signIn();
}

/** Google's own achievements screen. */
export async function showPlayGamesAchievements(): Promise<void> {
  const mod = loadKit();
  if (!mod) return;
  await mod.showAchievements();
}

/**
 * Unlock an achievement by its Play Console id. Resolves quietly when the
 * player is signed out or Play Games is unavailable, so game code can call it
 * without checking first.
 */
export async function unlockPlayGamesAchievement(id: string): Promise<void> {
  const mod = loadKit();
  if (!mod) return;
  try {
    await mod.unlockAchievement(id);
  } catch {
    // Achievements never get to break the app.
  }
}

/** Runs the listener on every sign-in change. Returns the function that stops listening. */
export function onPlayGamesAuthChange(listener: (state: AuthState) => void): () => void {
  const mod = loadKit();
  if (!mod) return () => {};
  const subscription = mod.addAuthenticationListener(listener);
  return () => subscription.remove();
}
