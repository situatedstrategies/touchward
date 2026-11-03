import { NativeModules, Platform } from "react-native";
import { AD_UNIT_IDS } from "./config";
import { AD_POLICY, shouldShowInterstitial } from "./policy";

/**
 * Interstitial ads between rewards, for the free app. The one purchase
 * (store/unlock.tsx, entitlement "full") turns them off: nothing here loads
 * while the app is unlocked, so a paying customer's phone never talks to the
 * ad servers.
 *
 * react-native-google-mobile-ads is a native module that Expo Go does not
 * ship, so it is required lazily after checking the native side is present,
 * the same way Pulsar and RevenueCat are handled.
 */

type AdsModule = typeof import("react-native-google-mobile-ads");
type Interstitial = import("react-native-google-mobile-ads").InterstitialAd;

let adsModule: AdsModule | null | undefined;

function loadAds(): AdsModule | null {
  if (adsModule !== undefined) return adsModule;
  try {
    adsModule = NativeModules.RNGoogleMobileAdsModule
      ? (require("react-native-google-mobile-ads") as AdsModule)
      : null;
  } catch {
    adsModule = null;
  }
  return adsModule ?? null;
}

function unitId(): string {
  if (Platform.OS === "ios") return AD_UNIT_IDS.ios;
  if (Platform.OS === "android") return AD_UNIT_IDS.android;
  return "";
}

/** True when this build can show ads: native module linked and a unit for this platform. */
export function areAdsAvailable(): boolean {
  return loadAds() !== null && unitId().length > 0;
}

let prepared: Promise<boolean> | null = null;

/**
 * Gather consent where the law requires it (Google's User Messaging Platform
 * shows its form on the first launch in the EEA and UK, and the App Tracking
 * Transparency prompt on iOS), then start the SDK. Resolves true when an ad
 * may be requested. Called only once an ad is about to be needed, so an
 * unlocked customer never sees the consent form.
 */
export function prepareAds(): Promise<boolean> {
  if (!areAdsAvailable()) return Promise.resolve(false);
  if (prepared) return prepared;
  prepared = (async () => {
    const mod = loadAds();
    if (!mod) return false;
    try {
      await mod.AdsConsent.gatherConsent();
    } catch {
      // The form could not be shown (offline, or no form published); the SDK
      // decides below whether ads may still be requested.
    }
    try {
      const info = await mod.AdsConsent.getConsentInfo();
      if (!info.canRequestAds) return false;
      await mod.default().initialize();
      return true;
    } catch {
      return false;
    }
  })();
  return prepared;
}

/** True when the user may reopen the consent form from Settings. */
export async function privacyOptionsRequired(): Promise<boolean> {
  const mod = loadAds();
  if (!mod || !areAdsAvailable()) return false;
  try {
    const info = await mod.AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === mod.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

/** Show the consent form again so the user can change their choices. */
export async function showPrivacyOptions(): Promise<void> {
  const mod = loadAds();
  if (!mod) return;
  try {
    await mod.AdsConsent.showPrivacyOptionsForm();
  } catch {
    // Nothing to show.
  }
}

// One interstitial at a time: loaded ahead, shown when the policy says so,
// then the next one loads while the user plays on.
let ad: Interstitial | null = null;
let loaded = false;
let showing = false;
let rewardsSinceAd = 0;
let lastAdAt = -Infinity;
let foregroundAt = Date.now();

function loadNext(): void {
  const mod = loadAds();
  if (!mod || ad) return;
  const next = mod.InterstitialAd.createForAdRequest(unitId(), {
    // Pair the SDK's own consent answer with a conservative default: no
    // personalised ads unless consent said yes.
    requestNonPersonalizedAdsOnly: true,
  });
  const unsubLoaded = next.addAdEventListener(mod.AdEventType.LOADED, () => {
    loaded = true;
  });
  const unsubClosed = next.addAdEventListener(mod.AdEventType.CLOSED, () => {
    showing = false;
    unsubLoaded();
    unsubClosed();
    unsubError();
    ad = null;
    loaded = false;
    loadNext();
  });
  const unsubError = next.addAdEventListener(mod.AdEventType.ERROR, () => {
    // No fill or no network: drop it and try again at the next moment the
    // policy allows, so a bad connection never leaves a stale listener.
    unsubLoaded();
    unsubClosed();
    unsubError();
    ad = null;
    loaded = false;
  });
  ad = next;
  next.load();
}

/** Call when the app comes to the foreground: restarts the quiet period. */
export function noteForeground(): void {
  foregroundAt = Date.now();
}

/**
 * Call after every reward, with whether the app is unlocked and whether a
 * sheet is open. Counts the reward and, when the policy allows, shows the
 * interstitial that was loaded ahead of time. Returns true when an ad went up.
 */
export function noteRewardForAds(opts: { unlocked: boolean; sheetOpen: boolean }): boolean {
  if (opts.unlocked || !areAdsAvailable()) return false;
  rewardsSinceAd += 1;
  const now = Date.now();
  // Load ahead once the user is close, so the ad is ready at the moment.
  if (!ad && rewardsSinceAd >= AD_POLICY.rewardsBetweenAds - 20) {
    void prepareAds().then((ok) => {
      if (ok) loadNext();
    });
  }
  const due = shouldShowInterstitial({
    rewardsSinceAd,
    msSinceAd: now - lastAdAt,
    msSinceLaunch: now - foregroundAt,
    sheetOpen: opts.sheetOpen,
  });
  if (!due || !ad || !loaded || showing) return false;
  showing = true;
  rewardsSinceAd = 0;
  lastAdAt = now;
  try {
    ad.show();
  } catch {
    showing = false;
    ad = null;
    loaded = false;
    return false;
  }
  return true;
}
