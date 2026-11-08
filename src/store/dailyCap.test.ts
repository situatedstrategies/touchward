import assert from "node:assert/strict";
import { test } from "node:test";
import { FREE_REWARDS_PER_DAY, countForDay, isRewardAllowed, localDayKey } from "./dailyCap";

test("the free app allows a hundred rewards a day and blocks the next", () => {
  assert.equal(FREE_REWARDS_PER_DAY, 100);
  assert.equal(isRewardAllowed(0, false), true);
  assert.equal(isRewardAllowed(99, false), true);
  assert.equal(isRewardAllowed(100, false), false);
  assert.equal(isRewardAllowed(250, false), false);
});

test("Touchward Full has no limit", () => {
  assert.equal(isRewardAllowed(0, true), true);
  assert.equal(isRewardAllowed(100, true), true);
  assert.equal(isRewardAllowed(100_000, true), true);
});

test("the day key is the phone's local calendar day", () => {
  // Late evening local time: the UTC date may already be tomorrow, the local one is not.
  const evening = new Date(2026, 10, 8, 23, 30);
  assert.equal(localDayKey(evening), "2026-11-08");
  const morning = new Date(2026, 0, 1, 0, 5);
  assert.equal(localDayKey(morning), "2026-01-01");
});

test("the count belongs to the stored day only", () => {
  const stats = { day: "2026-11-08", rewardsToday: 100 };
  assert.equal(countForDay(stats, "2026-11-08"), 100);
  assert.equal(countForDay(stats, "2026-11-09"), 0);
  // So the 101st attempt is blocked on the same day and allowed on the next.
  assert.equal(isRewardAllowed(countForDay(stats, "2026-11-08"), false), false);
  assert.equal(isRewardAllowed(countForDay(stats, "2026-11-09"), false), true);
});
