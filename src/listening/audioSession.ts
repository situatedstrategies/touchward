import { Platform } from "react-native";
import { enablePulsarSound } from "../haptics/pulsar";
import { loadVolumeManager } from "../hardware/volumeButtons";

/**
 * Touchward's own sound is Pulsar's tone for each haptic, on for everyone.
 * What the unlock changes is other apps' music. Unlocked, the session is
 * ambient, which mixes: Apple Music or Spotify keeps playing under the tones.
 * In the free app it is solo ambient, which does not mix: activating it stops
 * other music while Touchward is open. Both follow the ringer switch.
 *
 * Pulsar sets its own mixing category when its sound is enabled and again the
 * first time a tone plays, and the volume button listener sets ambient. So the
 * policy is put back after each reward and each return to the foreground, not
 * only when the unlock changes. Setting an unchanged category or activating an
 * active session does nothing.
 *
 * iOS only: the session calls come from react-native-volume-manager, and
 * Pulsar's tone is an iOS feature.
 */

let othersAllowed = true;

export function enableTouchSounds(): void {
  if (Platform.OS === "ios") enablePulsarSound();
}

function apply(): void {
  if (Platform.OS !== "ios") return;
  const vm = loadVolumeManager();
  if (!vm) return;
  vm.setCategory(othersAllowed ? "Ambient" : "SoloAmbient")
    .then(() => (othersAllowed ? undefined : vm.setActive(true)))
    .catch(() => {});
}

/** Unlocked (or not yet known): let other music play. Free: stop it. */
export function setOtherAudioAllowed(allowed: boolean): void {
  othersAllowed = allowed;
  apply();
}

/** Put the policy back after something else may have changed the session. */
export function reassertAudioPolicy(): void {
  apply();
}
