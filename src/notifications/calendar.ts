import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { CalendarNudgeSettings } from "../types";
import { CHANNEL_ID, REMINDER_CATEGORY, cancelScheduledWithPrefix } from "./reminders";

/**
 * Calendar nudges: a local notification a few minutes after each calendar event
 * ends, so finishing the meeting or the workout is the cue to come tap.
 *
 * Phones do not let an app watch what other apps are doing, so this works from
 * calendar access instead: with permission, the next few days of events are read
 * and one notification is scheduled per event end. The set is refreshed whenever
 * the app opens and, in a development or store build, by a background task a few
 * times a day. Tapping the nudge, or its "I did it" button, counts as a tap.
 */

export const EVENT_ID_PREFIX = "event:";
/** How far ahead to schedule. Keeps well under the iOS cap of 64 pending notifications. */
const LOOKAHEAD_DAYS = 7;
const MAX_NUDGES = 40;

export interface CalendarChoice {
  id: string;
  title: string;
  color: string;
  source: string;
}

export async function getCalendarPermission(): Promise<boolean> {
  const p = await Calendar.getCalendarPermissions().catch(() => null);
  return p?.granted ?? false;
}

export async function requestCalendarPermission(): Promise<boolean> {
  const p = await Calendar.requestCalendarPermissions().catch(() => null);
  return p?.granted ?? false;
}

/** Calendars that hold events, for the picker in settings. */
export async function listCalendars(): Promise<CalendarChoice[]> {
  const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT).catch(() => []);
  return cals
    .map((c) => ({
      id: c.id,
      title: c.title,
      color: c.color ?? "#71717A",
      source: c.source?.name ?? "",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function toDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v);
}

/**
 * Replace the scheduled nudges with one per upcoming event end. Returns how many
 * are now scheduled. Safe to call often: it is idempotent.
 */
export async function syncCalendarNudges(
  s: CalendarNudgeSettings,
  timeSensitive: boolean,
): Promise<number> {
  await cancelScheduledWithPrefix(EVENT_ID_PREFIX);
  if (!s.enabled) return 0;
  if (!(await getCalendarPermission())) return 0;

  const allCalendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT).catch(() => []);
  const wanted = s.calendarIds
    ? allCalendars.filter((c) => s.calendarIds?.includes(c.id))
    : allCalendars;
  const ids = wanted.map((c) => c.id);
  if (ids.length === 0) return 0;

  const now = new Date();
  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const events = await Calendar.listEvents(ids, now, until).catch(() => []);
  const delayMs = Math.max(0, s.minutesAfter) * 60 * 1000;

  const fireTimes = new Map<string, { at: Date; title: string; id: string }>();
  for (const e of events) {
    if (e.allDay) continue;
    if (e.status === Calendar.EventStatus.CANCELED) continue;
    const end = toDate(e.endDate);
    const at = new Date(end.getTime() + delayMs);
    if (at.getTime() <= now.getTime() + 15_000) continue;
    // Two events ending at the same minute get one nudge, not two.
    const key = String(Math.round(at.getTime() / 60_000));
    if (!fireTimes.has(key))
      fireTimes.set(key, { at, title: e.title || "That event", id: e.id });
  }

  const planned = [...fireTimes.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
  const chosen = planned.slice(0, MAX_NUDGES);

  await Promise.all(
    chosen.map((n) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${EVENT_ID_PREFIX}${n.id}:${n.at.getTime()}`,
        content: {
          title: "That's a wrap.",
          body: `${n.title} just ended. Did the thing? Tap it.`,
          categoryIdentifier: REMINDER_CATEGORY,
          interruptionLevel: timeSensitive ? "timeSensitive" : "active",
          data: { reward: true, eventId: n.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: n.at,
          ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
        },
      }).catch(() => {}),
    ),
  );
  return chosen.length;
}

/** How many event nudges are currently scheduled, for the settings hint. */
export async function countScheduledNudges(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  return all.filter((n) => n.identifier.startsWith(EVENT_ID_PREFIX)).length;
}
