import { TurboModuleRegistry } from "react-native";
import type { Settings } from "../types";

/**
 * Usage analytics through Google Analytics for Firebase.
 *
 * Firebase starts collecting on its own once the app is configured with the
 * Firebase file for the platform (GoogleService-Info.plist on iOS,
 * google-services.json on Android). This module adds the app's own events and
 * the person's choice: "Share usage analytics" in Customize, More, Support
 * turns collection off, and turning it off also resets the random app
 * instance identifier so nothing collected earlier can be joined to later data.
 *
 * The native module is not part of Expo Go and a build without the Firebase
 * file cannot initialize it, so it is required lazily after checking that the
 * native side is present, the same way purchases and Pulsar are handled.
 */

type AnalyticsModule = typeof import("@react-native-firebase/analytics");

let analyticsModule: AnalyticsModule | null | undefined;

function loadAnalytics(): AnalyticsModule | null {
  if (analyticsModule !== undefined) return analyticsModule;
  try {
    analyticsModule = TurboModuleRegistry.get("NativeRNFBTurboAnalytics")
      ? (require("@react-native-firebase/analytics") as AnalyticsModule)
      : null;
  } catch {
    analyticsModule = null;
  }
  return analyticsModule ?? null;
}

/** True when this build can record analytics: the native module is linked. */
export function isAnalyticsAvailable(): boolean {
  return loadAnalytics() !== null;
}

/** Off until the stored settings are known, so nothing is sent on a guess. */
let enabled = false;
let applied: boolean | null = null;

/**
 * Called from the settings provider once stored settings are loaded and on
 * every change after that. Applies the preference to Firebase once per change;
 * Firebase persists it across launches, so a person who turned analytics off
 * stays off from the first frame of the next launch as well.
 */
export function configureAnalytics(settings: Settings): void {
  enabled = settings.analytics;
  if (applied === enabled) return;
  const wasOn = applied;
  applied = enabled;
  const mod = loadAnalytics();
  if (!mod) return;
  const analytics = mod.getAnalytics();
  mod.setAnalyticsCollectionEnabled(analytics, enabled).catch(() => {});
  // Off after being on: forget this install's identifier and anything queued.
  if (!enabled && wasOn === true) mod.resetAnalyticsData(analytics).catch(() => {});
}

type Params = Record<string, string | number | boolean>;

function log(name: string, params?: Params): void {
  if (!enabled) return;
  const mod = loadAnalytics();
  if (!mod) return;
  try {
    mod.logEvent(mod.getAnalytics(), name, params);
  } catch {
    // Analytics never gets to break the app.
  }
}

/** Where a reward came from: the button, or something wired into it. */
export type RewardSource = "tap" | "hold" | "watch";

/** One reward. The daily and all time counters stay on the device; this only counts. */
export function logReward(source: RewardSource): void {
  log("reward", { source });
}

/** Everything got unlocked, through the paywall or by restoring an earlier purchase. */
export function logUnlock(source: "paywall" | "restore"): void {
  log("unlock", { source });
}

/**
 * The app asked the platform for its rating sheet after a reward. Whether the
 * sheet appeared is not knowable; read this against the rating counts in App
 * Store Connect and the Play Console (src/review/storeReview.ts).
 */
export function logReviewPrompt(source: "tap" | "hold"): void {
  log("review_prompt", { source });
}
