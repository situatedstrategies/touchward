const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

/**
 * Turns on the two R8 settings Google Play's pre-launch report asks for.
 * Prebuild regenerates android/ from Expo's template, so this is a config
 * plugin rather than a hand edit (same reason as withAndroidSigning).
 *
 * 1. The release build type uses proguard-android-optimize.txt instead of
 *    proguard-android.txt. The plain file carries -dontoptimize, which is
 *    what Play reports as "Optimization isn't enabled" even though
 *    minifyEnabled is on.
 * 2. android.r8.optimizedResourceShrinking=true, which Play reports as
 *    "Optimized resource shrinking isn't enabled". It is the default from
 *    AGP 9, which React Native 0.86 does not use yet.
 */
module.exports = function withR8Optimize(config) {
  config = withAppBuildGradle(config, (config) => {
    const plain = 'getDefaultProguardFile("proguard-android.txt")';
    const optimized = 'getDefaultProguardFile("proguard-android-optimize.txt")';
    const contents = config.modResults.contents;
    if (contents.includes(optimized)) return config;
    if (!contents.includes(plain)) {
      throw new Error(
        "withR8Optimize: proguard-android.txt reference not found in app/build.gradle",
      );
    }
    config.modResults.contents = contents.replace(plain, optimized);
    return config;
  });

  config = withGradleProperties(config, (config) => {
    const key = "android.r8.optimizedResourceShrinking";
    config.modResults = config.modResults.filter(
      (item) => !(item.type === "property" && item.key === key),
    );
    config.modResults.push({ type: "property", key, value: "true" });
    return config;
  });

  return config;
};
