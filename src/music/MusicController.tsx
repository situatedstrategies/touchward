import { useEffect } from "react";
import { AppState } from "react-native";
import { useSettings } from "../store/settings";
import { useUnlock } from "../store/unlock";
import {
  isMusicAvailable,
  pauseMusic,
  resumeMusic,
  setMusicSilentMode,
  setMusicVolume,
  startMusic,
  stopMusic,
} from "./player";

/**
 * Keeps the music in step with settings: plays while the app is open and the
 * setting is on (and unlocked), pauses in the background, follows the volume
 * and silent mode choices live. Renders nothing.
 */
export function MusicController() {
  const { settings, loaded } = useSettings();
  const { unlocked } = useUnlock();
  const { enabled, volume, playsInSilentMode } = settings.music;
  // Waits for stored settings so a default never starts sound on a guess, and
  // for the unlock so a refunded purchase goes quiet on its own.
  const on = loaded && enabled && unlocked && isMusicAvailable();

  useEffect(() => {
    if (!on) return;
    startMusic({ volume, playsInSilentMode }).catch(() => {});
    return () => stopMusic();
    // Only on and off restart playback; volume and silent mode have their own
    // effects below and are read here just for the starting values.
  }, [on]);

  useEffect(() => {
    if (on) setMusicVolume(volume);
  }, [on, volume]);

  useEffect(() => {
    if (on) setMusicSilentMode(playsInSilentMode);
  }, [on, playsInSilentMode]);

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
