/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "watch",
  name: "TouchwardWatch",
  displayName: "Touchward",
  bundleIdentifier: ".watch",
  deploymentTarget: "10.0",
  icon: "../../assets/splash-icon.png",
  colors: {
    $accent: "#2C66FF",
  },
  frameworks: ["SwiftUI", "WatchKit", "WatchConnectivity", "UserNotifications"],
};
