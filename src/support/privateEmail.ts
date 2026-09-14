import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

/**
 * A reply address that hides the person's real one: Apple's Hide My Email
 * relay, obtained through Sign in with Apple. Apple only returns the relay
 * address the first time, so it is kept on the device and reused. Mail sent to
 * the relay from our sending domain is forwarded to the real inbox by Apple,
 * and the real address never reaches us.
 */

const STORAGE_KEY = "touchward.privateEmail.v1";

interface StoredRelay {
  user: string;
  email: string;
}

export async function isPrivateEmailAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

export async function getStoredPrivateEmail(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredRelay).email : null;
  } catch {
    return null;
  }
}

/**
 * Ask Apple for a private relay address. Returns null if the person cancels,
 * or if Apple returns no address and none was stored before.
 */
export async function requestPrivateEmail(): Promise<string | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (credential.email) {
      const relay: StoredRelay = { user: credential.user, email: credential.email };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(relay)).catch(() => {});
      return credential.email;
    }
    const stored = await getStoredPrivateEmail();
    return stored;
  } catch {
    return null;
  }
}

export async function forgetPrivateEmail(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
