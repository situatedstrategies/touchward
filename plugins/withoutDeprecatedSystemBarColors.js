const { AndroidConfig, XML, withFinalizedMod } = require("expo/config-plugins");

/** Theme items that Android 15 deprecates and Google Play flags as edge-to-edge parameters. */
const DEPRECATED_ITEMS = ["android:statusBarColor", "android:navigationBarColor"];

/**
 * Drops the deprecated system bar color items that prebuild writes into
 * AppTheme. React Native enables edge-to-edge itself on every Android version
 * the app targets and makes both bars transparent at runtime, so the items do
 * nothing except trip Google Play's "deprecated APIs or parameters for
 * edge-to-edge" check. Runs as a finalized mod so it lands after the Expo
 * plugin that adds them.
 */
module.exports = function withoutDeprecatedSystemBarColors(config) {
  return withFinalizedMod(config, [
    "android",
    async (config) => {
      const stylesPath = await AndroidConfig.Styles.getProjectStylesXMLPathAsync(
        config.modRequest.projectRoot,
      );
      let styles = await AndroidConfig.Styles.readStylesXMLAsync({ path: stylesPath });
      for (const name of DEPRECATED_ITEMS) {
        styles = AndroidConfig.Styles.removeStylesItem({
          xml: styles,
          parent: AndroidConfig.Styles.getAppThemeGroup(),
          name,
        });
      }
      await XML.writeXMLAsync({ path: stylesPath, xml: styles });
      return config;
    },
  ]);
};
