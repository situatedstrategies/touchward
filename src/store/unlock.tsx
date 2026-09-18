import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import {
  fetchUnlocked,
  isPurchasingAvailable,
  onUnlockedChange,
  presentUnlockPaywall,
  restorePurchases,
  type PaywallOutcome,
} from "../purchases/purchases";

const UNLOCK_KEY = "touchward.unlock.v1";

interface UnlockContextValue {
  /** Everything is unlocked. Until the store has answered this is the cached value. */
  unlocked: boolean;
  /** The store has answered at least once this launch (or is unavailable in this build). */
  known: boolean;
  /** This build can show a paywall and take a purchase. */
  available: boolean;
  /** Show the paywall unless already unlocked. Resolves true when the app ends up unlocked. */
  presentPaywall: () => Promise<boolean>;
  /** Restore an earlier purchase, telling the user what happened. */
  restore: () => Promise<void>;
}

const UnlockContext = createContext<UnlockContextValue | null>(null);

export function UnlockProvider({ children }: { children: ReactNode }) {
  const available = useMemo(() => isPurchasingAvailable(), []);
  // A development build with no store (Expo Go, or a platform without an SDK
  // key yet) opens everything so the app stays testable. Release builds without
  // a store stay locked, so a missing key cannot ship as a free upgrade.
  const [unlocked, setUnlocked] = useState(!available && __DEV__);
  const [known, setKnown] = useState(!available);

  // Cached answer first so the sheet does not flash locks for a paying customer.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(UNLOCK_KEY)
      .then((v) => {
        if (!cancelled && v === "1") setUnlocked(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback((value: boolean) => {
    setUnlocked(value);
    setKnown(true);
    AsyncStorage.setItem(UNLOCK_KEY, value ? "1" : "0").catch(() => {});
  }, []);

  // Then the store's answer, and every change after that (a purchase, a refund, a restore).
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    fetchUnlocked()
      .then((value) => {
        if (!cancelled && value !== null) apply(value);
      })
      .catch(() => {});
    const unsubscribe = onUnlockedChange((value) => {
      if (!cancelled) apply(value);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [available, apply]);

  const presentPaywall = useCallback(async () => {
    if (unlocked) return true;
    const outcome: PaywallOutcome = await presentUnlockPaywall();
    if (outcome === "unlocked") {
      apply(true);
      return true;
    }
    if (outcome === "unavailable") {
      Alert.alert(
        "Not available in this build",
        "Purchases work in the App Store and Google Play versions of Touchward.",
      );
    } else if (outcome === "error") {
      Alert.alert("Something went wrong", "The store did not respond. Please try again.");
    }
    return false;
  }, [unlocked, apply]);

  const restore = useCallback(async () => {
    if (!available) {
      Alert.alert(
        "Not available in this build",
        "Purchases work in the App Store and Google Play versions of Touchward.",
      );
      return;
    }
    const value = await restorePurchases();
    if (value === null) {
      Alert.alert("Something went wrong", "The store did not respond. Please try again.");
      return;
    }
    apply(value);
    Alert.alert(
      value ? "Restored" : "Nothing to restore",
      value
        ? "Everything is unlocked on this phone."
        : "No Touchward purchase was found on this store account.",
    );
  }, [available, apply]);

  const value = useMemo<UnlockContextValue>(
    () => ({ unlocked, known, available, presentPaywall, restore }),
    [unlocked, known, available, presentPaywall, restore],
  );

  return <UnlockContext.Provider value={value}>{children}</UnlockContext.Provider>;
}

export function useUnlock(): UnlockContextValue {
  const ctx = useContext(UnlockContext);
  if (!ctx) throw new Error("useUnlock must be used inside UnlockProvider");
  return ctx;
}

/**
 * For settings controls: run the change when it is free or unlocked, otherwise
 * show the paywall and run it only if the purchase goes through.
 */
export function useGate(): (free: boolean, change: () => void) => void {
  const { unlocked, presentPaywall } = useUnlock();
  return useCallback(
    (free, change) => {
      if (free || unlocked) {
        change();
        return;
      }
      presentPaywall()
        .then((ok) => {
          if (ok) change();
        })
        .catch(() => {});
    },
    [unlocked, presentPaywall],
  );
}
