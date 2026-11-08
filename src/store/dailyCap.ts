/**
 * The free app's daily limit. Pure, so the rule is unit tested and lives in
 * one place; the home screen feeds it the counter and the unlock state and
 * applies the answer wherever a reward can land (the button, the hold timer,
 * the volume buttons, the touchward://reward link, a notification's "I did
 * it", the watch).
 *
 * The rule, in words: without Touchward Full, a hundred rewards a day,
 * counted on the phone's own calendar day. With it, no limit.
 */
export const FREE_REWARDS_PER_DAY = 100;

/** Whether one more reward may land, given how many landed today. */
export function isRewardAllowed(rewardsToday: number, isFull: boolean): boolean {
  if (isFull) return true;
  return rewardsToday < FREE_REWARDS_PER_DAY;
}

/** The phone's local calendar day as YYYY-MM-DD: the counter resets when this changes. */
export function localDayKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's count from the stored counter: zero once the stored day is not today. */
export function countForDay(
  stats: { day: string; rewardsToday: number },
  today: string,
): number {
  return stats.day === today ? stats.rewardsToday : 0;
}
