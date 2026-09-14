# Touchward

A sensory reward button for iOS and Android, built by Situated Strategies.

You did the thing. Open the app, tap the button, and get a little buzz back. Or
hold it down, watch the ring close, and get a bigger buzz when the timer is up.

## What it does

- One big button in the shape you choose. Ripples is the default: a glowing
  core inside three wavy neon bands on deep navy, matching the app icon, and
  every reward sends a wave of light outward through the bands. The other
  shapes are circle, squircle, square, hexagon, star, heart, and blob.
- Reward modes for ripples: Soft, Pulse, Spark, Deep, Double, and Wave. Each
  one sets both the ripple motion and the tap haptic, from one soft impact
  with slow wide ripples to repeated light impacts with cascading ripples.
- Pulsar haptics (development and store builds): the reward modes play as
  composed patterns with real amplitude and sharpness, there is a strength
  setting, and any tap or timer-done haptic can be swapped for one of Pulsar's
  151 presets. In Expo Go the built-in patterns play instead.
- Haptic feedback you pick: short, long, staccato, heartbeat, ramp, or purr.
  Choosing a pattern in settings plays it so you can compare.
- The button changes color on every reward. Choose the resting color and the set
  of reward colors, cycle them in order or shuffle, and optionally snap back to
  the resting color after a moment.
- Hold mode: press and hold, a circular timer (1 to 600 seconds) fills around
  the button, and when it completes the phone buzzes back at you with the
  pattern you chose for it. Let go early and nothing is earned.
- Three modes: tap only, hold only, or both (quick press taps, long press runs
  the timer).
- Calendar nudges: with calendar access, a notification when each event ends,
  so the end of a meeting or a workout is the cue to tap.
- Reminders: local notifications on a schedule you set (every 1 to 6 hours
  inside a start and end hour). Each reminder has an "I did it" button, and
  tapping either the button or the notification opens the app and fires the tap
  for you. On iOS they can be delivered as time-sensitive notifications so they
  break through Focus modes.
- Side buttons: while the app is open, either volume button counts as a tap
  (opt in). For a one-gesture trigger from anywhere, the link
  `touchward://reward` fires a tap when it opens the app, so it can be wired to
  the iPhone Action Button or Back Tap through Shortcuts, or to Quick Tap or a
  button remapper on Android.
- A small counter of rewards today and all time. Everything is stored on the
  device. No account, no server, and the reminders are scheduled locally, so
  there is no push backend to run.

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript.
- `expo-haptics` for iOS impacts, React Native `Vibration` for precise Android
  patterns. `react-native-pulsar` (Software Mansion's Pulsar, on iOS Core
  Haptics and Android VibrationEffect) when the build includes it, with
  `react-native-worklets` as its peer dependency.
- `react-native-svg` for the shapes and the timer ring.
- Type: Josefin Sans SemiBold for headings (bundled via
  `@expo-google-fonts/josefin-sans`, loaded with `expo-font`) with moderate
  tracking, and Avenir Next for body text. Avenir Next is an iOS system font;
  Android falls back to bundled Nunito Sans. See `src/typography.ts`.
- `@react-native-async-storage/async-storage` for settings and the counter.
- `expo-notifications` for scheduled reminders, `expo-linking` for the deep
  link, `react-native-volume-manager` for the volume buttons.

## Run it on your phone

1. Install the Expo Go app on your iPhone or Android phone.
2. In this folder run:

   ```bash
   npm install
   npm start
   ```

3. Scan the QR code with your camera (iOS) or the Expo Go app (Android).

Haptics need a real device. Simulators and the web build show the UI but do
not vibrate.

Three features need a development build instead of Expo Go, because they rely
on native code Expo Go does not ship:

- Pulsar haptics: presets, composed patterns, and strength
  (`react-native-pulsar`).
- Volume buttons as a trigger (`react-native-volume-manager`).
- Time-sensitive delivery on iOS (the entitlement in `app.json`).

The app detects each native module at runtime and falls back cleanly, so the
same code runs in Expo Go with the built-in haptics.

### Development build

`expo-dev-client` is installed, so a development build behaves like Expo Go
(scan the QR code from `npm start`) but with all native modules present.

With Xcode or Android Studio on this machine:

```bash
npx expo prebuild
npx expo run:ios --device      # pick your iPhone; needs your Apple team for signing
npx expo run:android           # a connected phone or a running emulator
```

Or in the cloud with EAS once you have an Expo account:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
eas build --profile development --platform android
```

The `ios/` and `android/` folders are generated by prebuild and ignored by
git. Reminders themselves, the deep link, and everything else work in Expo Go.

## Calendar nudges

The main trigger for notifications is finishing something on your calendar.
With calendar access, Touchward reads the next 7 days of timed events and
schedules one local notification per event end (right away, or 5, 15, or 30
minutes after), optionally time sensitive so it breaks through Focus. Pick
which calendars count. All-day and cancelled events are skipped, and two
events ending in the same minute get one nudge. Tapping the nudge or its "I
did it" button counts as a tap.

Phones do not let one app watch another, so this is the mechanism: calendar
read access (`expo-calendar`, full access on iOS 17 and later), plus a
background task (`expo-background-task`) that rescans a few times a day so
events added while the app was closed still get their nudge. The scan also
runs every time the app comes to the foreground. Expo Go has no background
tasks, so there only the foreground scan runs.

## Push notifications

Reminders are local and need no server. Remote push is wired up too:

- iOS: the `aps-environment` entitlement comes from the `expo-notifications`
  plugin, and Xcode adds the Push Notifications capability to the App ID on
  the first signed build. For sending you need an APNs key: Apple Developer,
  Certificates, Identifiers & Profiles, Keys, create a key with "Apple Push
  Notifications service (APNs)" enabled. Its name is up to you; keep the Key
  ID, your Team ID (4964KRMB5H), and the downloaded `.p8`.
- Android: push goes through Firebase Cloud Messaging. Create a Firebase
  project, add an Android app with package `com.situatedstrategies.touchward`,
  download `google-services.json` into the repo root (gitignored; picked up by
  `app.config.js`), and rebuild.
- Sending: the settings sheet has an "Allow push notifications" switch that
  registers the phone and shows two tokens. The Expo push token works with
  Expo's push service once the APNs key and FCM credentials are uploaded to the
  EAS project (`npx eas-cli credentials`). The raw device token works with
  APNs or FCM directly. Set `EXPO_PUBLIC_PUSH_REGISTER_URL` at build time and
  the app also POSTs the tokens there as JSON, so a worker can keep a device
  list. A push whose data includes `{ "reward": true }` counts as a tap when
  opened.

## Support, privacy, and terms

Settings has a Support section with an in-app form. It posts the same JSON as
the website's form to `https://touchward-dopamine.com/api/support`, which
emails `support@touchward-dopamine.com` through Resend. That endpoint needs the
`RESEND_API_KEY` variable on the Cloudflare Pages project (Production and
Preview). Until it is set, the form falls back to the mail app, addressed to
the same inbox. The About section links to `/privacy` and `/terms` on the site,
opened in an in-app browser, and shows the version.

## Pricing

Touchward is a paid app (one-time purchase, 1.99) with no in-app purchases,
subscriptions, or accounts, so there is no restore-purchases flow. Ownership
follows the store account.

## Build store binaries

Use EAS Build once you have an Expo account:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

The bundle identifier and Android package are both
`com.situatedstrategies.touchward` (see `app.json`).

## Project layout

- `App.tsx`: providers and root screen.
- `src/types.ts`: settings model, shape list, color swatches, defaults.
- `src/haptics/patterns.ts`: the pattern definitions as pulses (buzz for N ms,
  rest for M ms) and the compilers to Android vibration arrays and iOS impact
  schedules.
- `src/haptics/engine.ts`: plays a pattern on the current platform and cancels
  the previous one. `playReward` prefers a Pulsar preset, then a Pulsar
  pattern, then the built-in pulses.
- `src/haptics/pulsar.ts`: lazy adapter for `react-native-pulsar`. Checks for
  the native module before requiring the package so Expo Go never sees it.
- `src/components/RewardButton.tsx`: the button, press handling, color
  animation, and the hold timer.
- `src/components/Ripples.tsx`: the ripples figure (wavy SVG bands and the
  gradient core) and its outward wave animation.
- `src/components/rippleModes.ts`: timing, swell, and tap haptic for each
  reward mode.
- `src/components/TimerRing.tsx`: the SVG progress ring.
- `src/components/shapes.ts`: SVG paths for each shape.
- `src/notifications/reminders.ts`: reminder schedule math and the
  `expo-notifications` setup, channel, category, and scheduling.
- `src/notifications/calendar.ts`: calendar permission, event scan, and nudge
  scheduling. `calendarTask.ts` is the background rescan.
- `src/notifications/push.ts`: remote push registration and token storage.
- `src/screens/SupportScreen.tsx`: the in-app support form.
- `src/links.ts`: site, support, privacy, and terms URLs.
- `app.config.js`: adds `google-services.json` for Android push when present.
- `src/hardware/volumeButtons.ts`: turns volume button presses into taps.
- `src/screens/HomeScreen.tsx`: the main screen. Also where external triggers
  (notification taps, the deep link, volume buttons) are routed into the button.
- `src/screens/SettingsScreen.tsx`: the customization sheet.
- `src/store/settings.tsx`: persistence and the settings context.
- `src/typography.ts`: the font families and heading/body style helpers.

## Scripts

- `npm start`: Expo dev server.
- `npm run typecheck`: TypeScript.
- `npm run format` / `npm run format:check`: Prettier.

## Writing style

No em dashes or en dashes anywhere in this project: not in UI copy, comments,
or commit messages. Use periods, hyphens, and colons.

## Ideas for later

- Custom patterns: let the user tap out a rhythm and save it.
- Sound as an optional second channel.
- Home screen widget or lock screen control so the tap is one gesture away.
- Notification-only rewards: play the haptic from the "I did it" button
  without opening the app (needs a notification service extension on iOS).
- Apple Watch and Wear OS companions, where the haptics are strongest.
