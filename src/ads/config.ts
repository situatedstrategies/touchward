/**
 * Google AdMob identifiers. The app ids live in app.json (the
 * react-native-google-mobile-ads config plugin writes them into the native
 * projects); the interstitial unit ids are here. All of these are public by
 * design. Release builds request the real units; development builds use
 * Google's sample interstitial so no run on a development phone ever counts
 * as an impression.
 */
const SAMPLE_INTERSTITIAL = {
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
} as const;

const REAL_INTERSTITIAL = {
  android: "ca-app-pub-2443535982979230/6447965523",
  ios: "ca-app-pub-2443535982979230/5278956723",
} as const;

export const AD_UNIT_IDS = __DEV__ ? SAMPLE_INTERSTITIAL : REAL_INTERSTITIAL;
