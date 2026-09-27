import type { AudioPlayer, AudioStatus } from "expo-audio";
import { requireOptionalNativeModule } from "expo-modules-core";
import { TRACKS } from "./tracks";

/**
 * Background music while the app is open: either a two track loop (the first
 * and second track in turn) or the whole bundled set shuffled, with a
 * crossfade between pieces. Two players are alive during a crossfade (the one
 * ending and the one starting) and one the rest of the time.
 *
 * Haptics share the phone's audio session, and starting the Core Haptics
 * engine on a tap can register as an audio interruption. The audio module is
 * told to duck rather than pause on interruptions, and a watchdog restores
 * the volume, or restarts playback, within a second if anything stops it.
 *
 * expo-audio is a native module that Expo Go and builds made before it was
 * added do not have, so it is required lazily after checking that the native
 * side is present, the same way Pulsar, purchases, and analytics are handled.
 */

type AudioModule = typeof import("expo-audio");

let audioModule: AudioModule | null | undefined;

function loadAudio(): AudioModule | null {
  if (audioModule !== undefined) return audioModule;
  try {
    audioModule = requireOptionalNativeModule("ExpoAudio")
      ? (require("expo-audio") as AudioModule)
      : null;
  } catch {
    audioModule = null;
  }
  return audioModule ?? null;
}

/** True when this build can play music: the native module is linked. */
export function isMusicAvailable(): boolean {
  return loadAudio() !== null;
}

/** How long the outgoing piece fades under the incoming one. */
const CROSSFADE_MS = 2000;
/** Volume ramp resolution during a crossfade. */
const TICK_MS = 50;
/** How often a player reports its position; sets how precisely the crossfade starts. */
const STATUS_INTERVAL_MS = 250;
/** How often the watchdog checks that the music is still playing at the set volume. */
const WATCHDOG_MS = 1000;
/** After a reward, a second check a little later catches a late interruption. */
const NUDGE_DELAY_MS = 350;

interface Deck {
  player: AudioPlayer;
  subscription: { remove: () => void };
  /** Once true this deck is on its way out and must not start another crossfade. */
  ending: boolean;
}

export interface MusicOptions {
  /** 0 to 1. */
  volume: number;
  /** Keep playing when the ringer switch is on silent. */
  playsInSilentMode: boolean;
  /** Track indexes to cycle through in order, or null to shuffle the whole set. */
  queue: number[] | null;
}

let running = false;
let paused = false;
let current: Deck | null = null;
let outgoing: Deck | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let watchdog: ReturnType<typeof setInterval> | null = null;
let targetVolume = 0.6;
let queue: number[] | null = null;
let order: number[] = [];
let position = 0;
let lastPlayed = -1;

function shuffled(): number[] {
  const list = TRACKS.map((_, i) => i);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  // A fresh round never opens with the piece that just ended.
  if (list.length > 1 && list[0] === lastPlayed) [list[0], list[1]] = [list[1], list[0]];
  return list;
}

function nextTrack(): number {
  if (queue && queue.length > 0) {
    const index = queue[position % queue.length];
    position++;
    lastPlayed = index;
    return index;
  }
  if (position >= order.length) {
    order = shuffled();
    position = 0;
  }
  const index = order[position++];
  lastPlayed = index;
  return index;
}

function makeDeck(index: number, volume: number): Deck | null {
  const audio = loadAudio();
  if (!audio) return null;
  const player = audio.createAudioPlayer(TRACKS[index].source, {
    updateInterval: STATUS_INTERVAL_MS,
  });
  player.volume = volume;
  const deck: Deck = { player, ending: false, subscription: { remove: () => {} } };
  deck.subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) =>
    onStatus(deck, status),
  );
  return deck;
}

function disposeDeck(deck: Deck | null): void {
  if (!deck) return;
  deck.subscription.remove();
  try {
    deck.player.pause();
    deck.player.remove();
  } catch {
    // Already released.
  }
}

function onStatus(deck: Deck, status: AudioStatus): void {
  if (!running || paused || deck !== current || deck.ending) return;
  const remaining = status.duration > 0 ? status.duration - status.currentTime : Infinity;
  if (status.didJustFinish || remaining * 1000 <= CROSSFADE_MS) crossfade();
}

/** Start the next piece under the current one and swap them over CROSSFADE_MS. */
function crossfade(): void {
  const old = current;
  if (old) old.ending = true;
  const next = makeDeck(nextTrack(), 0);
  if (!next) return;
  // A crossfade still in progress ends now; its outgoing deck goes quiet at once.
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
  disposeDeck(outgoing);
  outgoing = old;
  current = next;
  next.player.play();
  const start = Date.now();
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / CROSSFADE_MS);
    if (outgoing) outgoing.player.volume = targetVolume * (1 - t);
    if (current) current.player.volume = targetVolume * t;
    if (t >= 1 && fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
      disposeDeck(outgoing);
      outgoing = null;
    }
  }, TICK_MS);
}

/**
 * Put the music back the way it should be: playing, at the set volume. Safe to
 * call at any time; it does nothing while paused, stopped, or mid crossfade.
 */
function check(): void {
  if (!running || paused || !current || fadeTimer) return;
  try {
    if (!current.player.playing) current.player.play();
    if (Math.abs(current.player.volume - targetVolume) > 0.01) {
      current.player.volume = targetVolume;
    }
  } catch {
    // The player is gone; the next crossfade or start replaces it.
  }
}

async function applyMode(playsInSilentMode: boolean): Promise<void> {
  const audio = loadAudio();
  if (!audio) return;
  try {
    await audio.setAudioModeAsync({
      playsInSilentMode,
      // Duck on interruptions instead of pausing: a haptic engine start counts
      // as one, and a pause there would need iOS's say so to resume.
      interruptionMode: "duckOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
  } catch {
    // Playback still works with the session's current mode.
  }
}

/** Begin playing. Calling it while running restarts nothing; use the setters. */
export async function startMusic(options: MusicOptions): Promise<void> {
  if (!loadAudio()) return;
  targetVolume = options.volume;
  queue = options.queue;
  if (running) return;
  running = true;
  paused = false;
  await applyMode(options.playsInSilentMode);
  if (!running) return;
  order = shuffled();
  position = 0;
  const deck = makeDeck(nextTrack(), targetVolume);
  if (!deck) {
    running = false;
    return;
  }
  current = deck;
  deck.player.play();
  if (!watchdog) watchdog = setInterval(check, WATCHDOG_MS);
}

/** Stop and release everything. */
export function stopMusic(): void {
  if (!running) return;
  running = false;
  paused = false;
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
  if (watchdog) {
    clearInterval(watchdog);
    watchdog = null;
  }
  disposeDeck(current);
  disposeDeck(outgoing);
  current = null;
  outgoing = null;
  // The audio session is left as it is: the volume button listener may be
  // using it, and released players hold nothing open.
}

/** The app went to the background: hold both players where they are. */
export function pauseMusic(): void {
  if (!running || paused) return;
  paused = true;
  current?.player.pause();
  outgoing?.player.pause();
}

/** Back in the foreground: carry on from where the pause left off. */
export function resumeMusic(): void {
  if (!running || !paused) return;
  paused = false;
  current?.player.play();
  outgoing?.player.play();
}

/**
 * A reward just fired its haptic. Make sure the music is still going now and
 * again a moment later, without waiting for the watchdog's next tick.
 */
export function nudgeMusic(): void {
  if (!running) return;
  check();
  setTimeout(check, NUDGE_DELAY_MS);
}

export function setMusicVolume(volume: number): void {
  targetVolume = volume;
  // Outside a crossfade the current deck follows the setting at once; during
  // one the ramp picks the new target up on its next tick.
  if (!fadeTimer && current) current.player.volume = volume;
}

export function setMusicSilentMode(playsInSilentMode: boolean): void {
  if (running) applyMode(playsInSilentMode).catch(() => {});
}

/**
 * Change what plays: a list of track indexes to cycle, or null to shuffle the
 * set. The new choice starts at once with a crossfade from whatever is playing.
 */
export function setMusicQueue(next: number[] | null): void {
  const same =
    (next === null && queue === null) ||
    (next !== null &&
      queue !== null &&
      next.length === queue.length &&
      next.every((v, i) => v === queue![i]));
  queue = next;
  position = 0;
  order = shuffled();
  if (running && !paused && !same) crossfade();
}
