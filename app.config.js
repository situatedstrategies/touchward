// Layered on top of app.json at config time (Expo merges app.json first, then
// passes it here). Everything static stays in app.json; this file only adds
// pieces that depend on files that may or may not exist on the machine.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  // Android push (FCM) needs the Firebase config file. It is gitignored because
  // it is per project and private. Download it from the Firebase console for the
  // package com.situatedstrategies.touchward and drop it in the repo root.
  const googleServices = path.join(__dirname, "google-services.json");
  const android = fs.existsSync(googleServices)
    ? { ...config.android, googleServicesFile: "./google-services.json" }
    : config.android;

  return { ...config, android };
};
