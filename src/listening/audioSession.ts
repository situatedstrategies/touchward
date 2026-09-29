import { Platform } from "react-native";
import { enablePulsarSound } from "../haptics/pulsar";
import { loadVolumeManager } from "../hardware/volumeButtons";

/**
 * Touchward's own sound is Pulsar's tone for each haptic, on for everyone
 * unless switched off in Customize.
 * What the unlock changes is other apps' music. Unlocked, the session is
 * ambient, which mixes: Apple Music or Spotify keeps playing under the tones.
 * In the free app a tap switches it to solo ambient and activates it, which
 * does not mix and stops other music. Both follow the ringer switch.
 *
 * Only a tap in the free app ever stops other music. Launch, a change in the
 * unlock, and returning to the foreground only ever allow mixing, so a moment
 * where the unlock reads wrong (before the store settles) cannot cut off a
 * paying user's music.
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

/** Unlocked (or not yet known): let other music play. Free: stop it on the next tap. */
export function setOtherAudioAllowed(allowed: boolean): void {
  othersAllowed = allowed;
  if (allowed) allowMixing();
}

/** The app is back in front: keep mixing when allowed; the free app waits for a tap. */
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
