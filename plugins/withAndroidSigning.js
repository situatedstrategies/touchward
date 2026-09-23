const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// touchward: Google Play upload key";

/**
 * Signs Android release builds with the Play upload key. Prebuild regenerates
 * android/app/build.gradle from Expo's template, so this cannot be a hand edit.
 *
 * The keystore and its passwords live outside the repository, in
 * ~/.gradle/gradle.properties as TOUCHWARD_UPLOAD_STORE_FILE,
 * TOUCHWARD_UPLOAD_STORE_PASSWORD, TOUCHWARD_UPLOAD_KEY_ALIAS, and
 * TOUCHWARD_UPLOAD_KEY_PASSWORD. When they are absent (CI, another machine)
 * release falls back to the debug key so the build still succeeds.
 */
module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes(MARKER)) return config;

    const debugConfig = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;
    if (!contents.includes(debugConfig)) {
      throw new Error("withAndroidSigning: debug signingConfig not found in app/build.gradle");
    }
    contents = contents.replace(
      debugConfig,
      `${debugConfig}
        ${MARKER}
        release {
            if (project.hasProperty('TOUCHWARD_UPLOAD_STORE_FILE')) {
                storeFile file(TOUCHWARD_UPLOAD_STORE_FILE)
                storePassword TOUCHWARD_UPLOAD_STORE_PASSWORD
                keyAlias TOUCHWARD_UPLOAD_KEY_ALIAS
                keyPassword TOUCHWARD_UPLOAD_KEY_PASSWORD
            }
        }`,
    );

    const releaseSigning = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;
    if (!contents.includes(releaseSigning)) {
      throw new Error("withAndroidSigning: release buildType not found in app/build.gradle");
    }
    contents = contents.replace(
      releaseSigning,
      `        release {
            signingConfig project.hasProperty('TOUCHWARD_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
    );

    config.modResults.contents = contents;
    return config;
  });
};
