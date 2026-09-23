import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import {
  countScheduledNudges,
  listCalendars,
  requestCalendarPermission,
  syncCalendarNudges,
  type CalendarChoice,
} from "../../notifications/calendar";
import {
  clearPushRegistration,
  getStoredPushRegistration,
  isPushSupported,
  registerForPush,
  type PushRegistration,
} from "../../notifications/push";
import {
  formatHour,
  reminderTimes,
  requestReminderPermission,
} from "../../notifications/reminders";
import { useSettings } from "../../store/settings";
import { useGate, useUnlock } from "../../store/unlock";
import {
  NUDGE_DELAYS,
  REMINDER_INTERVALS,
  type CalendarNudgeSettings,
  type ReminderSettings,
} from "../../types";
import {
  Actions,
  Category,
  Code,
  Hint,
  Row,
  Section,
  Stepper,
  SubLabel,
  TextButton,
  ToggleRow,
} from "./controls";

const COPIED_FEEDBACK_MS = 1500;

export function NotificationSection({ theme, visible }: { theme: Theme; visible: boolean }) {
  const { settings, update } = useSettings();
  const { unlocked } = useUnlock();
  const gate = useGate();
  const [notificationsDenied, setNotificationsDenied] = useState(false);

  const nudges = settings.calendarNudges;
  const [calendars, setCalendars] = useState<CalendarChoice[]>([]);
  const [calendarDenied, setCalendarDenied] = useState(false);
  const [nudgeCount, setNudgeCount] = useState<number | null>(null);

  const updateNudges = (patch: Partial<CalendarNudgeSettings>) =>
    update({ calendarNudges: { ...nudges, ...patch } });
  const updateReminders = (patch: Partial<ReminderSettings>) =>
    update({ reminders: { ...settings.reminders, ...patch } });

  useEffect(() => {
    if (!visible || !nudges.enabled) return;
    let cancelled = false;
    listCalendars().then((list) => {
      if (!cancelled) setCalendars(list);
    });
    countScheduledNudges().then((count) => {
      if (!cancelled) setNudgeCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, nudges]);

  const toggleNudges = async (on: boolean) => {
    if (!on) {
      updateNudges({ enabled: false });
      return;
    }
    const notifications = await requestReminderPermission();
    setNotificationsDenied(!notifications);
    const calendar = notifications && (await requestCalendarPermission());
    setCalendarDenied(!calendar);
    if (!notifications || !calendar) return;
    updateNudges({ enabled: true });
    setNudgeCount(
      await syncCalendarNudges({ ...nudges, enabled: true }, settings.reminders.timeSensitive),
    );
  };

  const toggleCalendar = (id: string) => {
    const current = nudges.calendarIds;
    if (current === null) {
      updateNudges({ calendarIds: calendars.map((c) => c.id).filter((c) => c !== id) });
      return;
    }
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    updateNudges({ calendarIds: next.length === calendars.length ? null : next });
  };

  const toggleReminders = async (on: boolean) => {
    if (!on) {
      updateReminders({ enabled: false });
      return;
    }
    const granted = await requestReminderPermission();
    setNotificationsDenied(!granted);
    updateReminders({ enabled: granted });
  };

  const stepHour = (key: "startHour" | "endHour", delta: number) => {
    const next = Math.min(23, Math.max(0, settings.reminders[key] + delta));
    updateReminders({ [key]: next });
  };

  const reminderCount = reminderTimes(settings.reminders).length;

  const pushSupported = isPushSupported();
  const [push, setPush] = useState<PushRegistration | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushDenied, setPushDenied] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStoredPushRegistration().then((reg) => {
      if (!cancelled) setPush(reg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePush = async (on: boolean) => {
    if (!on) {
      update({ pushEnabled: false });
      setPush(null);
      await clearPushRegistration();
      return;
    }
    setPushBusy(true);
    const reg = await registerForPush();
    setPushBusy(false);
    setPushDenied(reg === null);
    setPush(reg);
    update({ pushEnabled: reg !== null });
  };

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(label);
    setTimeout(() => setCopied(null), COPIED_FEEDBACK_MS);
  };

  const anyScheduled = settings.reminders.enabled || nudges.enabled;

  return (
    <Category title="Notifications" theme={theme}>
      <Section title="After calendar events" theme={theme}>
        <ToggleRow
          label={unlocked ? "Nudge me after events end" : "Nudge me after events end (unlock)"}
          value={nudges.enabled}
          onChange={(v) => gate(!v, () => void toggleNudges(v))}
          theme={theme}
        />
        <Hint theme={theme}>
          Reads your calendar and sends a notification when each event ends: the meeting is
          over, the workout is done, come tap. Nothing is written to the calendar or sent
          anywhere.
        </Hint>
        {calendarDenied && (
          <Hint theme={theme}>
            Calendar access is off for Touchward. Allow full calendar access in your phone
            settings, then flip this switch again.
          </Hint>
        )}
        {nudges.enabled && (
          <>
            <SubLabel theme={theme}>Nudge</SubLabel>
            <Row>
              {NUDGE_DELAYS.map((m) => (
                <Chip
                  key={m}
                  label={m === 0 ? "Right away" : `${m} min after`}
                  selected={nudges.minutesAfter === m}
                  onPress={() => updateNudges({ minutesAfter: m })}
                  theme={theme}
                />
              ))}
            </Row>
            {calendars.length > 1 && (
              <>
                <SubLabel theme={theme}>Calendars</SubLabel>
                <Row>
                  <Chip
                    label="All"
                    selected={nudges.calendarIds === null}
                    onPress={() => updateNudges({ calendarIds: null })}
                    theme={theme}
                  />
                  {calendars.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.title}
                      selected={
                        nudges.calendarIds === null || nudges.calendarIds.includes(c.id)
                      }
                      onPress={() => toggleCalendar(c.id)}
                      theme={theme}
                    />
                  ))}
                </Row>
              </>
            )}
            <Hint theme={theme}>
              {nudgeCount === null
                ? "Scanning the next 7 days..."
                : nudgeCount === 0
                  ? "No timed events in the next 7 days. All-day events are skipped."
                  : `${nudgeCount} ${nudgeCount === 1 ? "nudge" : "nudges"} queued for the next 7 days. Refreshes each time you open the app.`}
            </Hint>
          </>
        )}
      </Section>

      <Section title="Reminders" theme={theme}>
        <ToggleRow
          label="Remind me to tap"
          value={settings.reminders.enabled}
          onChange={(v) => void toggleReminders(v)}
          theme={theme}
        />
        {notificationsDenied && (
          <Hint theme={theme}>
            Notifications are turned off for Touchward in your phone settings. Turn them on
            there, then flip this switch again.
          </Hint>
        )}
        {settings.reminders.enabled && (
          <>
            <SubLabel theme={theme}>Every</SubLabel>
            <Row>
              {REMINDER_INTERVALS.map((h) => (
                <Chip
                  key={h}
                  label={h === 1 ? "hour" : `${h} hours`}
                  selected={settings.reminders.everyHours === h}
                  onPress={() => updateReminders({ everyHours: h })}
                  theme={theme}
                />
              ))}
            </Row>
            <SubLabel theme={theme}>From</SubLabel>
            <Stepper
              value={formatHour(settings.reminders.startHour)}
              onStep={(d) => stepHour("startHour", d)}
              theme={theme}
              decrementLabel="Start an hour earlier"
              incrementLabel="Start an hour later"
            />
            <SubLabel theme={theme}>Until</SubLabel>
            <Stepper
              value={formatHour(settings.reminders.endHour)}
              onStep={(d) => stepHour("endHour", d)}
              theme={theme}
              decrementLabel="End an hour earlier"
              incrementLabel="End an hour later"
            />
            <Hint theme={theme}>
              {reminderCount} {reminderCount === 1 ? "reminder" : "reminders"} a day. Tapping a
              reminder, or its "I did it" button, counts as a tap.
            </Hint>
          </>
        )}
      </Section>

      {anyScheduled && (
        <Section title="Delivery" theme={theme}>
          <ToggleRow
            label="Time sensitive (breaks through Focus)"
            value={settings.reminders.timeSensitive}
            onChange={(v) => updateReminders({ timeSensitive: v })}
            theme={theme}
          />
          <Hint theme={theme}>
            Applies to reminders and calendar nudges. On iPhone they then show even in a Focus
            mode.
          </Hint>
        </Section>
      )}

      <Section title="Push" theme={theme}>
        <ToggleRow
          label="Allow push notifications"
          value={settings.pushEnabled && pushSupported}
          onChange={(v) => void togglePush(v)}
          theme={theme}
        />
        <Hint theme={theme}>
          {pushSupported
            ? pushBusy
              ? "Registering this phone..."
              : pushDenied
                ? "Notifications are turned off for Touchward in your phone settings, so push cannot be enabled."
                : "Lets Touchward receive notifications sent from outside the app, for example a nudge from an automation. A push whose data carries reward: true counts as a tap when you open it. Reminders work without this."
            : "Push needs a real phone and a development or store build. Reminders still work here."}
        </Hint>
        {settings.pushEnabled && push && (
          <>
            {push.expoToken && (
              <>
                <SubLabel theme={theme}>Expo push token</SubLabel>
                <Code theme={theme}>{push.expoToken}</Code>
              </>
            )}
            {push.deviceToken && (
              <>
                <SubLabel theme={theme}>
                  {Platform.OS === "ios" ? "APNs device token" : "FCM device token"}
                </SubLabel>
                <Code theme={theme}>{push.deviceToken}</Code>
              </>
            )}
            <Actions>
              {push.expoToken && (
                <TextButton
                  label={copied === "expo" ? "Copied" : "Copy Expo token"}
                  onPress={() => void copy("expo", push.expoToken ?? "")}
                  theme={theme}
                />
              )}
              {push.deviceToken && (
                <TextButton
                  label={copied === "device" ? "Copied" : "Copy device token"}
                  onPress={() => void copy("device", push.deviceToken ?? "")}
                  theme={theme}
                />
              )}
            </Actions>
          </>
        )}
      </Section>
    </Category>
  );
}
