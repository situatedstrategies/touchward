import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useSettings } from "../store/settings";
import { useUnlock } from "../store/unlock";
import {
  isMusicAvailable,
  pauseMusic,
  resumeMusic,
  setMusicQueue,
  setMusicSilentMode,
  setMusicVolume,
  startMusic,
  stopMusic,
} from "./player";
import { TRACKS } from "./tracks";

/**
 * Keeps the music in step with settings: plays while the app is open and the
 * setting is on (and unlocked), pauses in the background, follows the volume,
 * silent mode, and track choices live. Renders nothing.
 */
export function MusicController() {
  const { settings, loaded } = useSettings();
  const { unlocked } = useUnlock();
  const { enabled, volume, playsInSilentMode, mix, first, second } = settings.music;
  // Waits for stored settings so a default never starts sound on a guess, and
  // for the unlock so a refunded purchase goes quiet on its own.
  const on = loaded && enabled && unlocked && isMusicAvailable();

  // Track indexes to cycle, or null for the shuffled set. A pair of the same
  // track collapses to one entry so the loop does not crossfade into itself twice.
  const queueKey = mix === "pair" ? `${first}>${second}` : "shuffle";
  const queue = useMemo(() => {
    if (mix !== "pair") return null;
    const a = TRACKS.findIndex((t) => t.id === first);
    const b = TRACKS.findIndex((t) => t.id === second);
    const list = [a, b].filter((i) => i >= 0);
    return list.length === 2 && list[0] === list[1] ? [list[0]] : list;
    // queueKey captures everything the list depends on.
  }, [queueKey]);

  useEffect(() => {
    if (!on) return;
    startMusic({ volume, playsInSilentMode, queue }).catch(() => {});
    return () => stopMusic();
    // Only on and off restart playback; the other settings have their own
    // effects below and are read here just for the starting values.
  }, [on]);

  useEffect(() => {
    if (on) setMusicVolume(volume);
  }, [on, volume]);

  useEffect(() => {
    if (on) setMusicSilentMode(playsInSilentMode);
  }, [on, playsInSilentMode]);

  useEffect(() => {
    if (on) setMusicQueue(queue);
  }, [on, queue]);

  useEffect(() => {
    if (!on) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") resumeMusic();
      else pauseMusic();
    });
    return () => sub.remove();
  }, [on]);

  return null;
}
