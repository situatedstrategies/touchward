const { withFinalizedMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * App Store Connect rejects a privacy manifest (ITMS-91064, "NSPrivacyTracking must be true if
 * NSPrivacyTrackingDomains isn't empty") when NSPrivacyTracking is false and the
 * NSPrivacyTrackingDomains key is present at all, even as an empty array (Apple DTS, Developer
 * Forums thread 842856; Touchward 1.2.1 builds 16 and 17, November 2026). Expo's prebuild always
 * writes that key back as an empty array, so this runs after every other iOS mod and removes it
 * when the app declares no tracking. The watch app shares the same file through the project's
 * resources phase, so one edit covers both manifests Apple checks.
 */
const EMPTY_DOMAINS = /\s*<key>NSPrivacyTrackingDomains<\/key>\s*<array\s*\/>/;
const EMPTY_DOMAINS_OPEN = /\s*<key>NSPrivacyTrackingDomains<\/key>\s*<array>\s*<\/array>/;
const NO_TRACKING = /<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/;

function stripEmptyTrackingDomains(file) {
  if (!fs.existsSync(file)) return false;
  const before = fs.readFileSync(file, "utf8");
  if (!NO_TRACKING.test(before)) return false;
  const after = before.replace(EMPTY_DOMAINS, "").replace(EMPTY_DOMAINS_OPEN, "");
  if (after === before) return false;
  fs.writeFileSync(file, after);
  return true;
}

module.exports = function withNoEmptyTrackingDomains(config) {
  return withFinalizedMod(config, [
    "ios",
    async (config) => {
      const { platformProjectRoot, projectName } = config.modRequest;
      const file = path.join(platformProjectRoot, projectName, "PrivacyInfo.xcprivacy");
      if (stripEmptyTrackingDomains(file)) {
        console.log("withNoEmptyTrackingDomains: removed the empty NSPrivacyTrackingDomains key from " + path.relative(process.cwd(), file));
      }
      return config;
    },
  ]);
};
module.exports.stripEmptyTrackingDomains = stripEmptyTrackingDomains;
