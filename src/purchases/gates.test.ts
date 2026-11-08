import assert from "node:assert/strict";
import { test } from "node:test";
import { pickLook } from "../looks/looks";
import { DEFAULT_SETTINGS, REWARD_MODES, SHAPES, STRENGTHS } from "../types";
import {
  isFreeBackdrop,
  isFreeLook,
  isFreePattern,
  isFreePreset,
  isFreeRewardMode,
  isFreeShape,
  isFreeStrength,
  isFreeTapColors,
  lockedToFree,
} from "./gates";

test("only the default shape, mode, haptic and backdrop are free", () => {
  assert.equal(isFreeShape(DEFAULT_SETTINGS.shape), true);
  for (const s of SHAPES.filter((s) => s.id !== DEFAULT_SETTINGS.shape)) {
    assert.equal(isFreeShape(s.id), false, s.id);
  }
  assert.equal(isFreeRewardMode(DEFAULT_SETTINGS.rewardMode), true);
  for (const m of REWARD_MODES.filter((m) => m.id !== DEFAULT_SETTINGS.rewardMode)) {
    assert.equal(isFreeRewardMode(m.id), false, m.id);
  }
  assert.equal(isFreePattern(DEFAULT_SETTINGS.holdPattern), true);
  assert.equal(isFreePattern("short"), false);
  assert.equal(isFreeStrength(DEFAULT_SETTINGS.hapticStrength), true);
  for (const s of STRENGTHS.filter((s) => s.value !== DEFAULT_SETTINGS.hapticStrength)) {
    assert.equal(isFreeStrength(s.value), false, s.label);
  }
  assert.equal(isFreePreset(null), true);
  assert.equal(isFreePreset("heartbeat"), false);
  assert.equal(isFreeBackdrop("navy"), true);
  assert.equal(isFreeBackdrop("system"), false);
  assert.equal(isFreeBackdrop("#FFFFFF"), false);
});

test("colors compare by value, whatever the case of the hex", () => {
  assert.equal(isFreeTapColors(DEFAULT_SETTINGS.tapColors), true);
  assert.equal(isFreeTapColors(DEFAULT_SETTINGS.tapColors.map((c) => c.toLowerCase())), true);
  assert.equal(isFreeTapColors([...DEFAULT_SETTINGS.tapColors, "#000000"]), false);
  assert.equal(isFreeTapColors(["#2C66FF"]), false);
});

test("the default look is free and any change to it is Full", () => {
  const look = pickLook(DEFAULT_SETTINGS);
  assert.equal(isFreeLook(look), true);
  assert.equal(isFreeLook({ ...look, shape: "heart" }), false);
  assert.equal(isFreeLook({ ...look, idleColor: "#FF0000" }), false);
  assert.equal(isFreeLook({ ...look, randomColors: true }), false);
  assert.equal(isFreeLook({ ...look, rippleMax: 5 }), false);
  assert.equal(isFreeLook({ ...look, tapPreset: "Heartbeat" }), false);
});

test("lockedToFree changes nothing about the default settings", () => {
  assert.deepEqual(lockedToFree(DEFAULT_SETTINGS), {});
});

test("lockedToFree puts every locked choice back to its default and leaves the rest", () => {
  const patch = lockedToFree({
    ...DEFAULT_SETTINGS,
    shape: "star",
    rewardMode: "wave",
    hapticStrength: 2,
    holdPattern: "purr",
    tapPreset: "Spark",
    holdPreset: "Thud",
    backdrop: "#101010",
    idleColor: "#123456",
    rippleFollowButton: true,
    // Not look settings: must not appear in the patch.
    mode: "hold",
    holdSeconds: 60,
    volumeButtons: true,
    colorLibraries: { idleColor: ["#123456"] },
  });
  assert.deepEqual(patch, {
    shape: DEFAULT_SETTINGS.shape,
    rewardMode: DEFAULT_SETTINGS.rewardMode,
    holdPattern: DEFAULT_SETTINGS.holdPattern,
    hapticStrength: DEFAULT_SETTINGS.hapticStrength,
    backdrop: DEFAULT_SETTINGS.backdrop,
    tapPreset: null,
    holdPreset: null,
    idleColor: DEFAULT_SETTINGS.idleColor,
    rippleFollowButton: false,
  });
});
