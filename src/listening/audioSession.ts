import { Platform } from "react-native";
import { enablePulsarSound } from "../haptics/pulsar";
import { loadVolumeManager } from "../hardware/volumeButtons";

/**
 * Touchward's own sound is Pulsar's tone for each haptic, on for everyone
 * unless switched off in Customize.
 * Other apps' music mixes with the tones for everyone: the session is
 * ambient, so Apple Music, YouTube Music or Spotify keeps playing under them.
 * The solo-ambient path below, which takes the audio on a tap, is kept for a
 * build that passes `setOtherAudioAllowed(false)`; the home screen passes
 * true. Both follow the ringer switch.
 *
 * Launch and returning to the foreground only ever allow mixing, so nothing
 * here can cut off a person's music by surprise.
 *
 * Pulsar sets its own mixing category when its sound is enabled and again the
 * first time a tone plays, and the volume button listener sets ambient, so
 * the category is set again on every tap. Setting an unchanged category or
 * activating an active session does nothing.
 *
 * iOS only: the session calls come from react-native-volume-manager, and
 * Pulsar's tone is an iOS feature.
 */

let othersAllowed = true;

export function enableTouchSounds(on: boolean): void {
  if (Platform.OS === "ios") enablePulsarSound(on);
}

function allowMixing(): void {
  if (Platform.OS !== "ios") return;
  loadVolumeManager()
    ?.setCategory("Ambient")
    .catch(() => {});
}

/** True (the shipped setting): let other music play. False: stop it on the next tap. */
export function setOtherAudioAllowed(allowed: boolean): void {
  othersAllowed = allowed;
  if (allowed) allowMixing();
}

/** The app is back in front: keep mixing when allowed. */
export function onForeground(): void {
  if (othersAllowed) allowMixing();
}

/** A tap just played its tone: mix when allowed, otherwise take the audio. */
export function onTouchSound(): void {
  if (Platform.OS !== "ios") return;
  if (othersAllowed) {
    allowMixing();
    return;
  }
  const vm = loadVolumeManager();
  if (!vm) return;
  vm.setCategory("SoloAmbient")
    .then(() => vm.setActive(true))
    .catch(() => {});
}
