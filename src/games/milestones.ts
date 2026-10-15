/** Every this many rewards, all time, the button goes berserk. */
export const BERSERK_EVERY = 500;

/** Which berserk milestone a count has reached: 0 until the first one. */
export function berserkMilestone(rewardsAllTime: number): number {
  return Math.floor(rewardsAllTime / BERSERK_EVERY);
}

/** Rewards left until the next burst, 1 to BERSERK_EVERY. */
export function rewardsToNextBerserk(rewardsAllTime: number): number {
  const left = BERSERK_EVERY - (rewardsAllTime % BERSERK_EVERY);
  return left === 0 ? BERSERK_EVERY : left;
}
