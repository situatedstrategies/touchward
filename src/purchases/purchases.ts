import { NativeModules, Platform } from "react-native";
import { ENTITLEMENT_ID, OFFERING_ID, RC_API_KEYS } from "./config";

/**
 * A thin adapter over react-native-purchases and react-native-purchases-ui.
 * Both are native modules that Expo Go does not ship, so they are required
 * lazily after checking that the native side is present, the same way Pulsar
 * is handled in ../haptics/pulsar.ts.
 */

type PurchasesModule = typeof import("react-native-purchases");
type PaywallsModule = typeof import("react-native-purchases-ui");

let purchasesModule: PurchasesModule | null | undefined;
let paywallsModule: PaywallsModule | null | undefined;

function loadPurchases(): PurchasesModule | null {
  if (purchasesModule !== undefined) return purchasesModule;
  try {
    purchasesModule = NativeModules.RNPurchases
      ? (require("react-native-purchases") as PurchasesModule)
      : null;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule ?? null;
}

function loadPaywalls(): PaywallsModule | null {
  if (paywallsModule !== undefined) return paywallsModule;
  try {
    paywallsModule = NativeModules.RNPaywalls
      ? (require("react-native-purchases-ui") as PaywallsModule)
      : null;
  } catch {
    paywallsModule = null;
  }
  return paywallsModule ?? null;
}

function apiKey(): string {
  if (Platform.OS === "ios") return RC_API_KEYS.ios;
  if (Platform.OS === "android") return RC_API_KEYS.android;
  return "";
}

/** True when this build can talk to the stores: native module linked and a key for this platform. */
export function isPurchasingAvailable(): boolean {
  return loadPurchases() !== null && apiKey().length > 0;
}

let configured = false;

/** Configure the SDK once. Safe to call more than once. */
export function configurePurchases(): boolean {
  if (configured) return true;
  const mod = loadPurchases();
  const key = apiKey();
  if (!mod || !key) return false;
  const Purchases = mod.default;
  Purchases.setLogLevel(__DEV__ ? mod.LOG_LEVEL.DEBUG : mod.LOG_LEVEL.ERROR).catch(() => {});
  Purchases.configure({ apiKey: key });
  configured = true;
  return true;
}

type CustomerInfo = import("react-native-purchases").CustomerInfo;
type Offering = import("react-native-purchases").PurchasesOffering;

function hasEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/** Whether the store says Touchward Full is owned, or null when the SDK is unavailable. */
export async function fetchUnlocked(): Promise<boolean | null> {
  if (!configurePurchases()) return null;
  const mod = loadPurchases();
  if (!mod) return null;
  try {
    return hasEntitlement(await mod.default.getCustomerInfo());
  } catch {
    return null;
  }
}

/** Calls back whenever the store's view of the customer changes. Returns an unsubscribe. */
export function onUnlockedChange(listener: (unlocked: boolean) => void): () => void {
  if (!configurePurchases()) return () => {};
  const mod = loadPurchases();
  if (!mod) return () => {};
  const Purchases = mod.default;
  const handler = (info: CustomerInfo) => listener(hasEntitlement(info));
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(handler);
  };
}

export type PaywallOutcome = "unlocked" | "cancelled" | "error" | "unavailable";

/** The offering the paywall sells: touchward_full, falling back to whatever is current. */
async function fetchOffering(mod: PurchasesModule): Promise<Offering | undefined> {
  try {
    const offerings = await mod.default.getOfferings();
    return offerings.all[OFFERING_ID] ?? offerings.current ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The purchase screen: RevenueCat's paywall for the offering, built in the
 * dashboard, with the store's own price and a Restore button. Skipped when the
 * entitlement is already active. "cancelled" when the person closes it;
 * "unlocked" once the entitlement is active, bought or restored.
 */
export async function presentFullPaywall(): Promise<PaywallOutcome> {
  if (!configurePurchases()) return "unavailable";
  const mod = loadPurchases();
  const ui = loadPaywalls();
  if (!mod || !ui) return "unavailable";
  const offering = await fetchOffering(mod);
  try {
    const result = await ui.default.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
      offering,
      displayCloseButton: true,
    });
    const R = ui.PAYWALL_RESULT;
    if (result === R.PURCHASED || result === R.RESTORED || result === R.NOT_PRESENTED) {
      return "unlocked";
    }
    if (result === R.CANCELLED) return "cancelled";
    return "error";
  } catch {
    return "error";
  }
}

/** Ask the store for earlier purchases on this account. Resolves to the unlocked state, or null on failure. */
export async function restorePurchases(): Promise<boolean | null> {
  if (!configurePurchases()) return null;
  const mod = loadPurchases();
  if (!mod) return null;
  try {
    return hasEntitlement(await mod.default.restorePurchases());
  } catch {
    return null;
  }
}
