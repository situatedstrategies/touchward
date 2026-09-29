import { Linking, Platform } from "react-native";

/**
 * Hand-offs to the music apps people already use. With the unlock, whatever
 * Apple Music or Spotify is playing carries on under Touchward's touch sounds
 * (see audioSession.ts).
 *
 * Each app opens through its own URL scheme. When the app is not installed
 * the open fails and the store page opens instead. openURL is used directly
 * rather than canOpenURL, which on iOS would need the schemes declared in
 * Info.plist.
 */

export interface MusicApp {
  id: "apple-music" | "spotify";
  label: string;
  /** Opens the app itself, tried first. */
  url: string;
  /** Where to get the app when the first open fails. */
  storeUrl: string;
}

export const MUSIC_APPS: MusicApp[] = [
  {
    id: "apple-music",
    label: "Apple Music",
    // Android has no Apple Music scheme; the https link opens the app when it
    // is installed and the web player otherwise.
    url: Platform.OS === "ios" ? "music://" : "https://music.apple.com/",
    storeUrl:
      Platform.OS === "ios"
        ? "https://apps.apple.com/app/apple-music/id1108187390"
        : "https://play.google.com/store/apps/details?id=com.apple.android.music",
  },
  {
    id: "spotify",
    label: "Spotify",
    url: "spotify:",
    storeUrl:
      Platform.OS === "ios"
        ? "https://apps.apple.com/app/spotify-music-and-podcasts/id324684580"
        : "https://play.google.com/store/apps/details?id=com.spotify.music",
  },
];

export async function openMusicApp(app: MusicApp): Promise<void> {
  try {
    await Linking.openURL(app.url);
  } catch {
    await Linking.openURL(app.storeUrl).catch(() => {});
  }
}
