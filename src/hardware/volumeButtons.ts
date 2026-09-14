import { NativeModules, Platform } from "react-native";

/**
 * Turns the physical volume buttons into a tap trigger while the app is open.
 *
 * The media volume is parked at a working level, any change (a button press
 * moves it) fires the callback, and the volume is put back. The original level
 * is restored when the listener stops.
 *
 * react-native-volume-manager is a native module. Builds without it report
 * `isVolumeButtonSupportAvailable()` as false and the setting shows as
 * unavailable.
 */

type VolumeManagerModule = typeof import("react-native-volume-manager");

let cached: VolumeManagerModule | null | undefined;

/**
 * Whether the native module is present. Checked before requiring the package,
 * which builds a NativeEventEmitter at import time and throws without it.
 */
function nativeModulePresent(): boolean {
  try {
    return NativeModules.VolumeManager != null;
  } catch {
    return false;
  }
}

function loadModule(): VolumeManagerModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === "web" || !nativeModulePresent()) {
    cached = null;
    return cached;
  }
  try {
    // Required lazily so a build without the native module still boots.
    const mod = require("react-native-volume-manager") as VolumeManagerModule;
    cached = typeof mod?.addVolumeListener === "function" ? mod : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function isVolumeButtonSupportAvailable(): boolean {
  return loadModule() !== null;
}

/** Presses closer together than this are treated as one (key repeat, double events). */
const DEBOUNCE_MS = 180;
/** Level the volume is parked at so both up and down have room to move. */
const WORKING_LEVEL = 0.5;

export function startVolumeButtonListener(onPress: () => void): () => void {
  const vm = loadModule();
  if (!vm) return () => {};

  let stopped = false;
  let original: number | null = null;
  let lastFired = 0;
  let subscription: { remove: () => void } | null = null;

  (async () => {
    try {
      const { volume } = await vm.getVolume();
      original = volume;
      await vm.showNativeVolumeUI({ enabled: false });
      await vm.setVolume(WORKING_LEVEL, { showUI: false });
      if (stopped) return;
      subscription = vm.addVolumeListener(({ volume: v }) => {
        if (Math.abs(v - WORKING_LEVEL) < 0.001) return;
        const now = Date.now();
        if (now - lastFired > DEBOUNCE_MS) {
          lastFired = now;
          onPress();
        }
        vm.setVolume(WORKING_LEVEL, { showUI: false }).catch(() => {});
      });
    } catch {
      // Native side unavailable at runtime; behave as if unsupported.
    }
  })();

  return () => {
    stopped = true;
    subscription?.remove();
    subscription = null;
    vm.showNativeVolumeUI({ enabled: true }).catch(() => {});
    if (original !== null) {
      vm.setVolume(original, { showUI: false }).catch(() => {});
    }
  };
}
