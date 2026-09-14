# Touchward

A sensory reward button for iOS and Android, built by Situated Strategies.

You did the thing. Open the app, tap the button, and get a little buzz back. Or
hold it down, watch the ring close, and get a bigger buzz when the timer is up.

## What it does

- One big button in the shape you choose: circle (the default), ripple (the
  icon's wavy outline as the button itself), squircle, square, hexagon, star,
  heart, or blob. Every
  shape is drawn the same way: a glowing core with a pale edge and bright rim,
  on a deep navy backdrop with a soft center glow (switchable).
- One tap, one ripple. Each tap sends a wavy ring (the icon's outline, the
  default), the button's own shape, or a circle radiating outward and fading, in the next ripple
  color: pink, cyan, violet by default, so the multicolor look builds tap by
  tap. Pick any set of ripple colors, or none to follow the button color.
- Ripple feel, for every mode: each ripple travels out, holds where it lands
  for a linger you choose (fade right away, short, long, longest), then fades,
  so a few taps in a row build layered rings. You also set how many rings can
  be on screen at once (1 to 5; the oldest makes room) and the ring thickness
  (thin, normal, thick), which applies to the Original rings as well.
- Reward modes: Original (the default: three standing rings in the ripple
  colors, and each tap rolls a wave outward through them), Ripple (one ripple
  per tap), then Soft, Spark, Deep, Double, and Wave. Each sets how the ripple
  moves and what the tap feels like, for every shape. Cascades and rings drawn
  from a single color use paler and deeper tints of it.
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

## iPad and Apple Watch

- iPad: the same app, laid out larger. Any device whose shorter side is 700
  points or more gets a bigger button and type; everything else is identical.
- Apple Watch: a native SwiftUI companion in `targets/watch/`, built into the
  iOS app by `@bacons/apple-targets` and installed on a paired watch with it.
  It is only the button: the same shape, colors, ripples, and Original rings as
  the phone, a click on each tap, and the phone's reminder schedule mirrored as
  local watch notifications. Taps on the watch count on the phone. There are
  no settings on the watch; it follows whatever the phone has. The phone sends
  its settings over WatchConnectivity through the local module in
  `modules/watch-sync/` whenever they change, and the watch keeps the last
  copy so it works when the phone is out of reach. Build and run it through
  the normal iOS build; Xcode's TouchwardWatch scheme runs it on a watch
  simulator.

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

## Designing haptics with Pulsar

Haptics play through Pulsar in development and store builds (the app logs
`[haptics] pulsar available, support level N` at startup in development; level
3 means full amplitude and sharpness control). Three places to shape them:

1. In the app: Customize, Reward, Feel. The tap mode picks the pattern;
   Strength has five levels. Gentle, Normal, and Full scale amplitude. Hard and
   Max go past the motor's ceiling by adding energy: every tap at full
   amplitude, echo taps 20 ms apart, and a low rumble underneath (without
   Pulsar they play heavy double or triple impacts). The preset pickers swap the
   tap or timer done haptic for any of Pulsar's 151 presets.
2. In code: `src/components/rippleModes.ts`, the `pulsar` field of each mode.
   `discretePattern` is a list of taps: `time` in ms, `amplitude` 0 to 1,
   `frequency` 0 to 1 (sharpness: low is a round thud, high is a crisp click).
   `continuousPattern` is a rumble: `amplitude` and `frequency` envelopes as
   `{ time, value }` points. Edit, save, and the dev build hot reloads.
3. To audition: install the Pulsar companion app (App Store, "Haptics Presets:
   Pulsar") to feel every preset by name, then type that name into the preset
   filter in Settings. The pattern format is documented at
   docs.swmansion.com/pulsar/sdk/react-native.

## Support, privacy, and terms

Settings has a Support section with the in-app form (see Support above). It
posts to `https://touchward-dopamine.com/api/support`, which emails the
support inbox through Resend. That endpoint needs the
`RESEND_API_KEY` secret on the Cloudflare Worker `touchward-site` (Settings,
Variables and Secrets, Add variable, type Secret). A secret in the account
level Secrets Store is not visible to the Worker unless bound. Until it is set, the form falls back to the mail app, addressed to
the same inbox. The About section links to `/privacy` and `/terms` on the site,
opened in an in-app browser, and shows the version.

## Support

The app never asks for an email or a name, and it has no sign in of any kind.
The in-app form sends the topic, the message, the phone model, and the app
version to the support inbox through the site Worker; if that fails the
message is kept on the device and sent the next time the app opens. Because
no address is collected, replies are not possible from the app. The website
shows the support address and its form has an optional email field for people
who want a reply.

## Crash reports

Unhandled JavaScript errors are reported to the support inbox through the
site Worker's `/api/crash` route (`src/support/crashReports.ts`). A fatal
error is written to storage first and sent on the next launch; handled errors
and promise rejections are sent right away. A report carries the error and
stack, the app version, the device model and OS version, and the app's own
look settings, never anything about the person. "Send crash reports" in
Customize, More, Support turns it off. Native crashes are covered by Apple's
and Google's own crash reporting when the person has opted in on their
device; see Xcode Organizer and the Play Console. The privacy manifest
declares crash data (not linked, not used for tracking), and the site's
privacy policy describes it. App Store Connect's privacy questionnaire must
say the same: Crash Data, collected, not linked to identity, app functionality.

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

- `App.tsx`: fonts, splash screen, providers, and the root screen.
- `src/types.ts`: the settings model, option lists, and defaults.
- `src/store/settings.tsx`: settings and counter persistence with validation
  of anything read back from storage.
- `src/design/`: `palette.ts` (the neon palette, backdrop colors, color math),
  `theme.ts` (light, dark, navy, and per backdrop themes), `typography.ts`
  (Josefin Sans headings, Avenir Next body, Nunito Sans on Android).
- `src/button/`: everything that draws the button. `shapes.ts` defines each
  shape as a sampled outline with a known length; `ShapeCore.tsx` is the glowing
  core; `RippleField.tsx` the ripples in flight; `StandingBands.tsx` the three
  rings of Original mode; `TimerRing.tsx` the outline tracing hold timer;
  `rewardModes.ts` the motion and haptics of each reward mode; and
  `RewardButton.tsx` the press handling that ties them together.
- `src/components/`: `Chip`, `ColorField` and `ColorWheel` (the color picker
  with hex entry and saved colors), and `Backdrop`.
- `src/haptics/`: `patterns.ts` (built in pulse patterns), `pulsar.ts` (lazy
  Pulsar adapter), `engine.ts` (`playReward` picks a Pulsar preset, then a
  Pulsar pattern, then built in pulses).
- `src/notifications/`: `reminders.ts` (scheduled reminders and the shared
  notification setup), `calendar.ts` and `calendarTask.ts` (calendar nudges
  and their background refresh), `push.ts` (remote push registration).
- `src/hardware/volumeButtons.ts`: volume buttons as a tap trigger.
- `src/screens/HomeScreen.tsx`: the main screen and where every external
  trigger is routed into the button. `SupportScreen.tsx`: the support form.
  `settings/`: the Customize sheet, one file per category.
- `src/links.ts`: site, support, legal, and deep link URLs.
- `src/support/crashReports.ts`: the crash handler, queue, and sender.
- `src/support/supportMessages.ts`: the support form sender and its offline queue.
- `src/looks/looks.ts`: what a look is, the randomizer, and name suggestions.
  `src/store/looks.tsx` persists the library; `components/LookPreview.tsx`
  draws a still; `screens/SaveLookSheet.tsx` and `screens/LibraryScreen.tsx`
  are the two sheets.
- `app.config.js`: adds `google-services.json` for Android push when present.
- `modules/watch-sync/`: local Expo module (Swift) that mirrors settings to
  the watch and reports its rewards.
- `targets/watch/`: the SwiftUI watch app (entry, model, outlines, view).

## Scripts

- `npm start`: Expo dev server.
- `npm run typecheck`: TypeScript.
- `npm run format` / `npm run format:check`: Prettier.

## Random, Save, Library

Under the button, next to Customize: Random draws a completely new look on
every press, each field from the app's own option lists and every color from
the full hex space, never repeating the current one;
Save names the current look and keeps it; Library lists every saved look with
a still of its button and ripple, to wear again, rename, or delete. Saved
looks live in their own storage and survive a settings reset.

## Customize sheet

Four tabs. Inside each, categories keep one order: the button first, then the
ripples or the timer, then the surroundings.

- Reward: Button (press style, hold timer), Shape (button, ripples), Feel (tap
  mode, strength and Pulsar preset; timer done pattern and preset).
- Colors: Button (resting, reward colors), Ripples (Color 1, 2, 3 or follow the
  button), Background (navy glow, match phone, or any color). Every color has a
  picker with a hue wheel, brightness slider, quick swatches, and a hex field,
  plus a saved colors library per setting.
- Notify: calendar nudges, reminders, delivery, push.
- More: triggers, counter, support and about.

## Release checklist

- Bump `version` in `app.json`; `ios.buildNumber` and `android.versionCode`
  are set there too (EAS production builds auto increment them).
- iOS: `npx eas-cli build --profile production --platform ios` then
  `npx eas-cli submit --platform ios`, or archive `ios/Touchward.xcworkspace`
  in Xcode. Signing uses team 4964KRMB5H. The App Store record is Touchward
  (bundle id `com.situatedstrategies.touchward`). App Store Connect needs the
  privacy policy URL `https://touchward-dopamine.com/privacy` and the support
  URL `https://touchward-dopamine.com/support`.
- Android: `npx eas-cli build --profile production --platform android` for an
  AAB, or `cd android && ./gradlew bundleRelease` with your upload keystore
  configured in `android/gradle.properties`. Play Console needs the same two
  URLs. Push on Android additionally needs `google-services.json` (see Push
  notifications).
- Both: the `assets/` icons are final; unused Android permissions are blocked
  in `app.json`.
- iOS privacy: `app.json` sets `ITSAppUsesNonExemptEncryption` to false, a
  privacy manifest with no tracking and no collected data types, usage strings
  that say calendar and notification access is used only to provide the
  feature and that nothing read is stored or sent, and two plain language
  Info.plist notes (`TouchwardDataAccessNote`, `TouchwardEncryptionNote`) that
  document the data handling and the encryption position for reviewers.

## Android: making haptics work

Pulsar's Android side uses `VibrationEffect` and is already part of the
project. To build and feel it:

1. Install Android Studio with the Android SDK Platform for API 36, the build
   tools, and a JDK 17 or newer (Android Studio's bundled JDK is fine). Point
   `ANDROID_HOME` at the SDK, or set `sdk.dir` in `android/local.properties`.
2. Use a real phone. Emulators have no vibrator, so Pulsar reports no support
   and the app falls back silently. Enable USB debugging and plug it in.
3. From the repo root: `npx expo run:android --device`. Or in Android Studio:
   File, Open, choose the `android/` folder, let Gradle sync, pick the phone,
   press Run. Both produce the development build with Pulsar, the volume
   buttons, calendar access, and the dev client.
4. After changing native dependencies or `app.json`, run
   `npx expo prebuild --platform android --clean` before building again.
5. What to expect: Android 8 and later plays patterns; amplitude control
   depends on the phone (`Vibrator.hasAmplitudeControl`); Android 12 and later
   with a capable motor reports support level 3 and plays composed patterns
   with sharpness. Older or simpler motors get an on and off approximation. The
   Feel tab shows a note when the phone reports limited control.
6. Expo Go on Android does not include Pulsar; use the development build.

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
