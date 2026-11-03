/**
 * When an interstitial may interrupt play. Pure, so the rule is testable and
 * lives in one place; ads.ts feeds it the clock and the counters.
 *
 * The rule, in words: never in the first minute and a half of a session, never
 * more often than every five minutes, and only once another hundred and twenty
 * rewards have landed since the last ad. Tapping is the whole app, so an ad
 * that comes too soon or too often is the fastest way to lose someone. The
 * numbers are deliberately conservative; loosen them only with data.
 */
export const AD_POLICY = {
  /** Quiet time after the app comes to the foreground. */
  minMsSinceLaunch: 90_000,
  /** Shortest gap between two ads. */
  minMsBetweenAds: 5 * 60_000,
  /** Rewards that must land between ads. */
  rewardsBetweenAds: 120,
} as const;

export interface AdMoment {
  /** Rewards since the last ad (or since launch when none has shown). */
  rewardsSinceAd: number;
  /** Milliseconds since the last ad, or Infinity when none has shown. */
  msSinceAd: number;
  /** Milliseconds since the app came to the foreground. */
  msSinceLaunch: number;
  /** The settings sheet or another overlay is open. */
  sheetOpen: boolean;
}

export function shouldShowInterstitial(m: AdMoment, policy = AD_POLICY): boolean {
  if (m.sheetOpen) return false;
  if (m.msSinceLaunch < policy.minMsSinceLaunch) return false;
  if (m.msSinceAd < policy.minMsBetweenAds) return false;
  return m.rewardsSinceAd >= policy.rewardsBetweenAds;
}
