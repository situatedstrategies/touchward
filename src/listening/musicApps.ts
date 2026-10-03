import { Linking, Platform } from "react-native";

/**
 * Hand-offs to the music apps people already use: Apple Music and Spotify on
 * iOS, YouTube Music and Spotify on Android. With the unlock, whatever is
 * playing carries on under Touchward's touch sounds (see audioSession.ts).
 *
 * Each app opens through its own URL scheme. When the app is not installed
 * the open fails and the store page opens instead. openURL is used directly
 * rather than canOpenURL, which on iOS would need the schemes declared in
 * Info.plist.
 */

export interface MusicApp {
  id: "apple-music" | "youtube-music" | "spotify";
  label: string;
  /** Opens the app itself, tried first. */
  url: string;
  /** Where to get the app when the first open fails. */
  storeUrl: string;
}

const APPLE_MUSIC: MusicApp = {
  id: "apple-music",
  label: "Apple Music",
  url: "music://",
  storeUrl: "https://apps.apple.com/app/apple-music/id1108187390",
};

const YOUTUBE_MUSIC: MusicApp = {
  id: "youtube-music",
  label: "YouTube Music",
  // No public scheme; the https link is an App Link, so it opens the app when
  // it is installed and the web player otherwise.
  url: "https://music.youtube.com/",
  storeUrl:
    "https://play.google.com/store/apps/details?id=com.google.android.apps.youtube.music",
};

const SPOTIFY: MusicApp = {
  id: "spotify",
  label: "Spotify",
  url: "spotify:",
  storeUrl:
    Platform.OS === "ios"
      ? "https://apps.apple.com/app/spotify-music-and-podcasts/id324684580"
      : "https://play.google.com/store/apps/details?id=com.spotify.music",
};

export const MUSIC_APPS: MusicApp[] =
  Platform.OS === "ios" ? [APPLE_MUSIC, SPOTIFY] : [YOUTUBE_MUSIC, SPOTIFY];

/** "Apple Music or Spotify" on iOS, "YouTube Music or Spotify" on Android, for copy. */
export const MUSIC_APP_NAMES = MUSIC_APPS.map((a) => a.label).join(" or ");

export async function openMusicApp(app: MusicApp): Promise<void> {
  try {
    await Linking.openURL(app.url);
  } catch {
    await Linking.openURL(app.storeUrl).catch(() => {});
  }
}
