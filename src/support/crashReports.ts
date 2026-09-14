import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { CRASH_API } from "../links";
import { pickLook } from "../looks/looks";
import type { Settings } from "../types";

/**
 * Crash reports, sent to the support inbox through the site Worker.
 *
 * When JavaScript throws an unhandled error the report is written to storage
 * first (the app is about to die) and sent on the next launch. Handled errors
 * that slip through promise rejections are sent right away. Reports carry the
 * error, the app version, the device model and OS version, and the app's own
 * settings, and nothing about the person. The switch in Customize, More,
 * Support turns them off. Native crashes are covered by Apple and Google's own
 * crash reporting when the person has opted in on their device.
 */

const QUEUE_KEY = "touchward.crashes.v1";
const MAX_QUEUED = 5;
const MAX_STACK = 12000;

interface CrashReport {
  message: string;
  stack: string;
  fatal: boolean;
  at: string;
  appVersion: string;
  platform: string;
  device: string;
  os: string;
  settings: string;
}

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

interface ErrorUtilsLike {
  getGlobalHandler(): ErrorHandler;
  setGlobalHandler(handler: ErrorHandler): void;
}

let enabled = true;
let currentSettings: Settings | null = null;
let installed = false;

/** Called from the settings provider so reports reflect the current preference and look. */
export function configureCrashReports(settings: Settings): void {
  enabled = settings.crashReports;
  currentSettings = settings;
}

function describe(error: unknown, fatal: boolean): CrashReport {
  const e = error instanceof Error ? error : new Error(String(error));
  return {
    message: (e.message || String(error)).slice(0, 500),
    stack: (e.stack || "").slice(0, MAX_STACK),
    fatal,
    at: new Date().toISOString(),
    appVersion: `${Application.nativeApplicationVersion ?? "dev"} (${Application.nativeBuildVersion ?? ""})`,
    platform: Platform.OS,
    device: Device.modelName ?? "unknown",
    os: `${Platform.OS === "ios" ? "iOS" : "Android"} ${Device.osVersion ?? ""}`.trim(),
    settings: currentSettings ? JSON.stringify(pickLook(currentSettings)) : "",
  };
}

async function readQueue(): Promise<CrashReport[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as CrashReport[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeQueue(list: CrashReport[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_QUEUED))).catch(
    () => {},
  );
}

async function send(report: CrashReport): Promise<boolean> {
  try {
    const res = await fetch(CRASH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(report),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Queue a report to disk. Used for fatal errors, when there is no time to send. */
async function enqueue(report: CrashReport): Promise<void> {
  const list = await readQueue();
  list.push(report);
  await writeQueue(list);
}

/** Send anything queued from earlier runs. Call once on launch. */
export async function flushCrashReports(): Promise<void> {
  if (!enabled) return;
  const list = await readQueue();
  if (list.length === 0) return;
  const remaining: CrashReport[] = [];
  for (const report of list) {
    if (!(await send(report))) remaining.push(report);
  }
  await writeQueue(remaining);
}

/** Report a handled error now (for example a rejected promise). */
export function reportError(error: unknown): void {
  if (!enabled) return;
  const report = describe(error, false);
  send(report).then((ok) => {
    if (!ok) enqueue(report).catch(() => {});
  });
}

/**
 * Hook the global error handler once. Fatal errors are queued before the
 * default handler runs (which shows the red box in development and ends the
 * app in production).
 */
export function installCrashReporting(): void {
  if (installed) return;
  installed = true;
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (utils) {
    const previous = utils.getGlobalHandler();
    utils.setGlobalHandler((error, isFatal) => {
      if (enabled) {
        const report = describe(error, isFatal === true);
        if (isFatal) enqueue(report).catch(() => {});
        else
          send(report).then((ok) => {
            if (!ok) enqueue(report).catch(() => {});
          });
      }
      previous(error, isFatal);
    });
  }
  const tracking = (
    globalThis as { HermesInternal?: { enablePromiseRejectionTracker?: (o: unknown) => void } }
  ).HermesInternal;
  tracking?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id: number, error: unknown) => reportError(error),
  });
}
