import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPPORT_API } from "../links";

/**
 * Support messages. No reply address is collected: a message carries the
 * topic, the text, the phone model, and the app version, nothing else. If it
 * cannot be sent right away it is kept on the device and sent the next time
 * the app opens.
 */

const QUEUE_KEY = "touchward.supportQueue.v1";
const MAX_QUEUED = 10;

export interface SupportMessage {
  topic: string;
  message: string;
  platform: string;
  elapsedMs: number;
  source: "app";
  userAgent: string;
}

async function readQueue(): Promise<SupportMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as SupportMessage[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeQueue(list: SupportMessage[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_QUEUED))).catch(
    () => {},
  );
}

async function post(message: SupportMessage): Promise<boolean> {
  try {
    const res = await fetch(SUPPORT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...message, anonymous: true }),
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

/** Send now, or keep it for later. Returns whether it went out immediately. */
export async function sendSupportMessage(message: SupportMessage): Promise<boolean> {
  if (await post(message)) return true;
  const list = await readQueue();
  list.push(message);
  await writeQueue(list);
  return false;
}

/** Send anything kept from earlier. Call once on launch. */
export async function flushSupportMessages(): Promise<void> {
  const list = await readQueue();
  if (list.length === 0) return;
  const remaining: SupportMessage[] = [];
  for (const message of list) {
    if (!(await post(message))) remaining.push(message);
  }
  await writeQueue(remaining);
}
