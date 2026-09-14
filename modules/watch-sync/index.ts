import { requireOptionalNativeModule, type EventSubscription } from "expo-modules-core";

interface WatchSyncNative {
  isSupported(): boolean;
  isPaired(): boolean;
  updateContext(json: string): Promise<void>;
  addListener(
    event: "onWatchReward",
    listener: (e: { count: number }) => void,
  ): EventSubscription;
}

const native = requireOptionalNativeModule<WatchSyncNative>("WatchSync");

/** True on an iPhone build that includes the watch bridge. */
export function isWatchSyncAvailable(): boolean {
  return native !== null && native.isSupported();
}

/** True when an Apple Watch is paired and has the Touchward watch app installed. */
export function isWatchAppInstalled(): boolean {
  return native?.isPaired() ?? false;
}

/** Mirror settings to the watch. Safe to call often; the latest context wins. */
export async function sendSettingsToWatch(context: Record<string, unknown>): Promise<void> {
  if (!native) return;
  await native.updateContext(JSON.stringify(context)).catch(() => {});
}

/** Rewards recorded on the watch. Returns an unsubscribe function. */
export function onWatchReward(listener: (count: number) => void): () => void {
  if (!native) return () => {};
  const sub = native.addListener("onWatchReward", (e) => listener(e.count));
  return () => sub.remove();
}
