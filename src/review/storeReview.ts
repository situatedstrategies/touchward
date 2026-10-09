import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking, Platform } from "react-native";
import { logReviewPrompt } from "../analytics/analytics";
import { APP_STORE_ID, PLAY_PACKAGE_NAME } from "../links";

/**
 * The rate-and-review prompt, and the rules for when it may appear.
 *
 * Apple and Google both insist on their own sheet (SKStoreReviewController on
 * iOS, the Play In-App Review card on Android), reached here through
 * expo-store-review. Neither takes custom text, neither says whether the sheet
 * actually appeared (Apple caps it at three per year, Google applies a quota it
 * does not publish), and neither may be preceded by a question of our own. So
 * the app's whole job is to pick the moment, and this file is that decision.
 *
 * The moment: right after a reward, a second or so later so the haptic and the
 * ripple have finished, on an install at least a week old that has been opened
 * on three separate days and has given at least twenty rewards, in a session
 * with no crash, with no sheet open. Never within thirty days of a crash or a
 * support message, never more than once per 120 days, never more than three
 * times on one device. Everything lives in AsyncStorage; nothing leaves the
 * phone except one analytics event saying the sheet was asked for.
 */

/**
 * expo-store-review requires its native module at import time and throws when
 * it is missing, which a build made before this dependency would be. Loaded
 * lazily and guarded, the same way analytics, purchases and Pulsar are, so an
 * older build simply never asks.
 */
type StoreReviewModule = typeof import("expo-store-review");

let storeReviewModule: StoreReviewModule | null | undefined;

function loadStoreReview(): StoreReviewModule | null {
  if (storeReviewModule !== undefined) return storeReviewModule;
  try {
    storeReviewModule = require("expo-store-review") as StoreReviewModule;
  } catch {
    storeReviewModule = null;
  }
  return storeReviewModule;
}

const STATE_KEY = "touchward.review.v1";

/** The install must be this old before the first prompt. */
export const REVIEW_MIN_INSTALL_DAYS = 7;
/** The app must have been opened on this many separate calendar days. */
export const REVIEW_MIN_ACTIVE_DAYS = 3;
/** Rewards all time, from the counter on the home screen. */
export const REVIEW_MIN_REWARDS = 20;
/** Lifetime cap per device. Three times unanswered is an answer. */
export const REVIEW_MAX_PROMPTS = 3;
/** Days between prompts. */
export const REVIEW_MIN_GAP_DAYS = 120;
/** How long a crash or a support message holds the prompt back. */
export const REVIEW_SUPPRESS_DAYS = 30;
/** Distinct days remembered. Only the count matters and the bar is three. */
const ACTIVE_DAYS_KEPT = 30;
/** After the reward, before the sheet: the ripple's travel plus a beat. */
const REQUEST_DELAY_MS = 1500;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewState {
  /** First launch of a build with this file, ISO 8601. */
  firstSeenAt: string | null;
  /** Calendar days (YYYY-MM-DD, local) the app was opened, oldest first. */
  activeDays: string[];
  /** Times the sheet was asked for. Counted when asked; the platforms do not say when shown. */
  promptCount: number;
  lastPromptedAt: string | null;
  /** Set by a crash or a support message; the prompt waits until it passes. */
  suppressedUntil: string | null;
}

export const EMPTY_REVIEW_STATE: ReviewState = {
  firstSeenAt: null,
  activeDays: [],
  promptCount: 0,
  lastPromptedAt: null,
  suppressedUntil: null,
};

const isStr = (v: unknown): v is string => typeof v === "string";
const isoOrNull = (v: unknown): string | null =>
  isStr(v) && !Number.isNaN(Date.parse(v)) ? v : null;

/** Whatever is in storage, as a valid state. Bad values only ever delay the prompt. */
export function sanitizeReviewState(raw: unknown): ReviewState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const days = Array.isArray(r.activeDays) ? r.activeDays.filter(isStr) : [];
  const count = typeof r.promptCount === "number" && r.promptCount >= 0 ? r.promptCount : 0;
  return {
    firstSeenAt: isoOrNull(r.firstSeenAt),
    activeDays: days.slice(-ACTIVE_DAYS_KEPT),
    promptCount: Math.floor(count),
    lastPromptedAt: isoOrNull(r.lastPromptedAt),
    suppressedUntil: isoOrNull(r.suppressedUntil),
  };
}

export type ReviewHold =
  | "problem this session"
  | "suppressed"
  | "prompt limit reached"
  | "too soon"
  | "install too new"
  | "too few days"
  | "too few rewards";

/** Why the prompt is held back right now, or null when it may be asked for. */
export function reviewHoldReason(
  state: ReviewState,
  {
    now,
    rewardsAllTime,
    problemThisSession,
  }: { now: Date; rewardsAllTime: number; problemThisSession: boolean },
): ReviewHold | null {
  const t = now.getTime();
  if (problemThisSession) return "problem this session";
  if (state.suppressedUntil && t < Date.parse(state.suppressedUntil)) return "suppressed";
  if (state.promptCount >= REVIEW_MAX_PROMPTS) return "prompt limit reached";
  if (
    state.lastPromptedAt &&
    t - Date.parse(state.lastPromptedAt) < REVIEW_MIN_GAP_DAYS * DAY_MS
  )
    return "too soon";
  if (
    !state.firstSeenAt ||
    t - Date.parse(state.firstSeenAt) < REVIEW_MIN_INSTALL_DAYS * DAY_MS
  )
    return "install too new";
  if (state.activeDays.length < REVIEW_MIN_ACTIVE_DAYS) return "too few days";
  if (rewardsAllTime < REVIEW_MIN_REWARDS) return "too few rewards";
  return null;
}

/** YYYY-MM-DD in local time, the key for one active day. */
export function reviewDayKey(at: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
}

/** The state with `day` recorded. A repeat is a no-op; the list is trimmed past the cap. */
export function withActiveDay(state: ReviewState, day: string): ReviewState {
  if (state.activeDays.includes(day)) return state;
  return { ...state, activeDays: [...state.activeDays, day].slice(-ACTIVE_DAYS_KEPT) };
}

let cached: ReviewState | null = null;

async function readState(): Promise<ReviewState> {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    cached = sanitizeReviewState(raw ? JSON.parse(raw) : null);
  } catch {
    cached = EMPTY_REVIEW_STATE;
  }
  return cached;
}

async function writeState(state: ReviewState): Promise<void> {
  cached = state;
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => {});
}

let problemThisSession = false;
let launchNoted = false;
let requesting = false;

/** Records first launch and today as an active day. Once per process. */
export async function noteReviewLaunch(): Promise<void> {
  if (launchNoted) return;
  launchNoted = true;
  const now = new Date();
  const state = await readState();
  await writeState(
    withActiveDay(
      { ...state, firstSeenAt: state.firstSeenAt ?? now.toISOString() },
      reviewDayKey(now),
    ),
  );
}

/**
 * Something went wrong, or someone wrote to support. Holds the prompt for the
 * rest of this session and for REVIEW_SUPPRESS_DAYS. Safe to call from the
 * crash handler: it never throws and does its writing later.
 */
export function noteProblem(): void {
  problemThisSession = true;
  readState()
    .then((state) =>
      writeState({
        ...state,
        suppressedUntil: new Date(Date.now() + REVIEW_SUPPRESS_DAYS * DAY_MS).toISOString(),
      }),
    )
    .catch(() => {});
}

/**
 * Called on every reward from the phone. Waits REQUEST_DELAY_MS, then asks for
 * the sheet if the policy allows, the app is still in front, and no sheet of
 * ours is open. `rewardsAllTime` should include the reward just given.
 */
export function requestReviewAfterReward({
  source,
  rewardsAllTime,
  isSheetOpen,
}: {
  source: "tap" | "hold";
  rewardsAllTime: number;
  isSheetOpen: () => boolean;
}): void {
  if (requesting) return;
  setTimeout(() => {
    maybeRequest(source, rewardsAllTime, isSheetOpen).catch(() => {});
  }, REQUEST_DELAY_MS);
}

async function maybeRequest(
  source: "tap" | "hold",
  rewardsAllTime: number,
  isSheetOpen: () => boolean,
): Promise<void> {
  if (requesting) return;
  const now = new Date();
  const state = await readState();
  if (reviewHoldReason(state, { now, rewardsAllTime, problemThisSession })) return;
  // Backgrounded, or Customize came up in the meantime: the sheet would land
  // on nobody or on top of our own, and on iOS the attempt still counts.
  if (AppState.currentState !== "active" || isSheetOpen()) return;
  const StoreReview = loadStoreReview();
  if (!StoreReview) return;
  if (!(await StoreReview.isAvailableAsync().catch(() => false))) return;
  requesting = true;
  try {
    // Counted before the call, not after. Both platforms report success
    // whether or not a sheet appeared, and an attempt that threw is as spent
    // as one that showed for the purpose of not asking again soon.
    await writeState({
      ...state,
      promptCount: state.promptCount + 1,
      lastPromptedAt: now.toISOString(),
    });
    logReviewPrompt(source);
    await StoreReview.requestReview();
  } finally {
    requesting = false;
  }
}

/**
 * The store page where a review can be written, for the button in Customize.
 * Apple's write-review action lands on the form itself. Play has no equivalent,
 * so Android opens the listing, where the stars sit near the top; the market:
 * scheme opens the Play app directly, the https URL is the fallback.
 */
export function storeReviewUrls(): string[] {
  if (Platform.OS === "ios") {
    return [`https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`];
  }
  return [
    `market://details?id=${PLAY_PACKAGE_NAME}`,
    `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_NAME}`,
  ];
}

/** Opens the store's review page, trying each URL in turn. */
export async function openStoreReviewPage(): Promise<void> {
  for (const url of storeReviewUrls()) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Try the next one.
    }
  }
}
