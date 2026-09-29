const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# touchward: Pulsar haptics only";

/**
 * Pulsar creates its Core Haptics engine with the default settings, which
 * lets the engine play audio and so take the app's audio session when it
 * starts. With no other session active, the first haptic then stops music
 * playing in other apps (YouTube, Spotify). Pulsar's tones come from its own
 * AVAudioEngine, never from the haptic engine, so the engine is marked
 * haptics only: it no longer touches the audio session.
 *
 * PulsarHaptics is a CocoaPods source pod, so the line is added to its source
 * after each pod install.
 */
module.exports = function withHapticsOnlyPulsar(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes(MARKER)) return config;
      const hook = `
    ${MARKER}
    pulsar_engine = File.join(installer.sandbox.root, 'PulsarHaptics/Sources/Pulsar/HapticEngineWrapper.swift')
    if File.exist?(pulsar_engine)
      source = File.read(pulsar_engine)
      unless source.include?('playsHapticsOnly')
        patched = source.sub("engine = try CHHapticEngine()\\n", "engine = try CHHapticEngine()\\n    engine?.playsHapticsOnly = true\\n")
        raise 'Pulsar haptics only: CHHapticEngine() not found' if patched == source
        File.chmod(0644, pulsar_engine)
        File.write(pulsar_engine, patched)
      end
    end
`;
      const anchor = /post_install do \|installer\|\n/;
      if (!anchor.test(contents)) {
        throw new Error("withHapticsOnlyPulsar: Podfile has no post_install block to extend.");
      }
      contents = contents.replace(anchor, (m) => m + hook);
      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};
