import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { requestReminderPermission } from "./reminders";

/**
 * Remote push registration.
 *
 * The app has no server of its own. Registering returns the tokens a sender
 * needs: the Expo push token (send through Expo's push service, which needs the
 * APNs key and FCM credentials uploaded to the EAS project) and the raw device
 * token (send straight to APNs or FCM yourself). If EXPO_PUBLIC_PUSH_REGISTER_URL
 * is set at build time, the tokens are also POSTed there as JSON so a worker can
 * keep a list of devices.
 *
 * A push whose data contains { reward: true } counts as a tap when opened, the
 * same as a reminder. Remote push needs a real device and a development or store
 * build: Expo Go and simulators return null.
 */

const TOKEN_KEY = "touchward.push.v1";

export interface PushRegistration {
  expoToken: string | null;
  deviceToken: string | null;
  platform: "ios" | "android";
  registeredAt: string;
}

const REGISTER_URL = process.env.EXPO_PUBLIC_PUSH_REGISTER_URL ?? "";

/** True where remote push can work at all. */
export function isPushSupported(): boolean {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  if (!Device.isDevice) return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Ask for permission (if needed), fetch the tokens, remember them, and report
 * them to the register URL when one is configured. Returns null when push is
 * unsupported here or permission was refused.
 */
export async function registerForPush(): Promise<PushRegistration | null> {
  if (!isPushSupported()) return null;
  const granted = await requestReminderPermission();
  if (!granted) return null;

  let deviceToken: string | null = null;
  try {
    deviceToken = (await Notifications.getDevicePushTokenAsync()).data as string;
  } catch {
    deviceToken = null;
  }

  let expoToken: string | null = null;
  const id = projectId();
  if (id) {
    try {
      expoToken = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    } catch {
      expoToken = null;
    }
  }

  if (!deviceToken && !expoToken) return null;

  const registration: PushRegistration = {
    expoToken,
    deviceToken,
    platform: Platform.OS as "ios" | "android",
    registeredAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(registration)).catch(() => {});

  if (REGISTER_URL) {
    fetch(REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...registration,
        appVersion: Constants.expoConfig?.version ?? null,
        device: Device.modelName ?? null,
        osVersion: Device.osVersion ?? null,
      }),
    }).catch(() => {
      // Best effort. The tokens are kept locally and re-sent on the next launch.
    });
  }

  return registration;
}

export async function getStoredPushRegistration(): Promise<PushRegistration | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as PushRegistration) : null;
  } catch {
    return null;
  }
}

export async function clearPushRegistration(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}
