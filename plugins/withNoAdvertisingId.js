const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Touchward never reads the Android advertising ID. Firebase Analytics
 * (play-services-measurement-api) declares com.google.android.gms.permission.AD_ID
 * and android.permission.ACCESS_ADSERVICES_AD_ID in its own manifest and
 * collects the identifier by default; app.json blocks both permissions
 * (android.blockedPermissions) and this plugin adds the meta-data that turns
 * the collection off, so the Play Console "Does your app use advertising ID?"
 * answer of No stays true. Firebase documents the key at
 * firebase.google.com/docs/analytics/configure-data-collection.
 */
const META = [
  { name: "google_analytics_adid_collection_enabled", value: "false" },
  { name: "google_analytics_default_allow_ad_personalization_signals", value: "false" },
];

module.exports = function withNoAdvertisingId(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) return config;
    app["meta-data"] = app["meta-data"] ?? [];
    for (const { name, value } of META) {
      // The Firebase Analytics module's own manifest sets both keys to true, so
      // the merger needs an explicit override or the build fails.
      const attrs = {
        "android:name": name,
        "android:value": value,
        "tools:replace": "android:value",
      };
      const existing = app["meta-data"].find((m) => m.$["android:name"] === name);
      if (existing) Object.assign(existing.$, attrs);
      else app["meta-data"].push({ $: attrs });
    }
    return config;
  });
};
