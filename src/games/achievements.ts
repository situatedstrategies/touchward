import { unlockPlayGamesAchievement } from "./playGames";

/**
 * Achievement ids from Play Console (Play Games Services, Achievements). Each
 * is the "CgkI..." id Google shows next to the achievement once it is
 * created; an empty string means the achievement does not exist yet and the
 * unlock is skipped. Game Center ids can join these later as a per-platform
 * pair (see expo-play-games-kit's AchievementId).
 */
export const ACHIEVEMENTS = {
  /** The first reward ever. */
  firstReward: "",
  /** The first berserk burst: 500 rewards. */
  berserk: "",
} as const;

export type AchievementKey = keyof typeof ACHIEVEMENTS;

/** Unlock an achievement by key. Quiet when the id is unset or Play Games is unavailable. */
export function unlockAchievement(key: AchievementKey): void {
  const id = ACHIEVEMENTS[key];
  if (!id) return;
  unlockPlayGamesAchievement(id).catch(() => {});
}
