import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { loadSettings } from "../store/settings";
import { syncCalendarNudges } from "./calendar";

/**
 * Background refresh of the calendar nudges, so events added after the app was
 * last opened still get their nudge. The OS decides the exact timing (roughly a
 * few times a day) and only runs it in a development or store build.
 *
 * The task must be defined at module scope, which is why App.tsx imports this
 * file for its side effect.
 */

export const CALENDAR_SYNC_TASK = "touchward-calendar-sync";
const SIX_HOURS_IN_MINUTES = 6 * 60;

TaskManager.defineTask(CALENDAR_SYNC_TASK, async () => {
  try {
    const settings = await loadSettings();
    if (!settings.calendarNudges.enabled) return BackgroundTask.BackgroundTaskResult.Success;
    await syncCalendarNudges(settings.calendarNudges, settings.reminders.timeSensitive);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function setCalendarSyncTaskEnabled(enabled: boolean): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const registered = await TaskManager.isTaskRegisteredAsync(CALENDAR_SYNC_TASK);
    if (enabled && !registered) {
      await BackgroundTask.registerTaskAsync(CALENDAR_SYNC_TASK, {
        minimumInterval: SIX_HOURS_IN_MINUTES,
      });
    } else if (!enabled && registered) {
      await BackgroundTask.unregisterTaskAsync(CALENDAR_SYNC_TASK);
    }
  } catch {
    // Expo Go and simulators: no background tasks. Foreground refresh still runs.
  }
}
