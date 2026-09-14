const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# touchward: quiet third party warnings";

/**
 * Silences compiler warnings inside CocoaPods targets (React Native, Hermes,
 * and the rest of the dependency tree), which are not ours to fix and would
 * otherwise bury warnings from the app's own code. The app, the watch app,
 * and the local modules keep their warnings.
 */
module.exports = function withQuietPods(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes(MARKER)) return config;
      const hook = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
        bc.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
        bc.build_settings['CLANG_WARN_DOCUMENTATION_COMMENTS'] = 'NO'
        bc.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] ||= '$(inherited)'
      end
    end
    installer.pods_project.build_configurations.each do |bc|
      bc.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
      bc.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
    end
`;
      // Append inside the existing post_install block, right after its opening line.
      const anchor = /post_install do \|installer\|\n/;
      if (!anchor.test(contents)) {
        throw new Error("withQuietPods: Podfile has no post_install block to extend.");
      }
      contents = contents.replace(anchor, (m) => m + hook);
      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};
