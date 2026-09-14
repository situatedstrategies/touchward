const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
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
  config = withAppTargetFlags(config);
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
        bc.build_settings['OTHER_SWIFT_FLAGS'] = '$(inherited) -Xcc -Wno-nullability-completeness'
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

/**
 * The app target itself compiles a few generated bridging files that include
 * dependency headers without nullability annotations, and links a duplicate
 * C++ standard library through React Native. Neither is actionable here, so
 * those two warning classes are turned off for the app target only.
 */
function withAppTargetFlags(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const entry = configurations[key];
      if (typeof entry !== "object" || !entry.buildSettings) continue;
      const settings = entry.buildSettings;
      if (!settings.PRODUCT_BUNDLE_IDENTIFIER) continue;
      if (String(settings.SDKROOT || "").includes("watchos")) continue;
      settings.WARNING_CFLAGS = '"-Wno-nullability-completeness"';
      const swiftFlags = settings.OTHER_SWIFT_FLAGS;
      const swiftExtra = "-Xcc -Wno-nullability-completeness";
      if (typeof swiftFlags === "string") {
        if (!swiftFlags.includes(swiftExtra)) {
          settings.OTHER_SWIFT_FLAGS = `${swiftFlags.replace(/"$/, "")} ${swiftExtra}"`.replace(
            /^([^"])/,
            '"$1',
          );
        }
      } else {
        settings.OTHER_SWIFT_FLAGS = `"$(inherited) ${swiftExtra}"`;
      }
      const ldflags = settings.OTHER_LDFLAGS;
      const extra = '"-Wl,-no_warn_duplicate_libraries"';
      if (Array.isArray(ldflags)) {
        if (!ldflags.includes(extra)) ldflags.push(extra);
      } else if (typeof ldflags === "string") {
        if (!ldflags.includes("no_warn_duplicate_libraries")) {
          settings.OTHER_LDFLAGS = [ldflags, extra];
        }
      } else {
        settings.OTHER_LDFLAGS = ['"$(inherited)"', extra];
      }
    }
    return config;
  });
}
