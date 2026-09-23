# App Review: information request response

Apple's review team asked for six things. Items 2 to 6 below are written to be
pasted into the App Review reply (or into App Review Information, Notes).
Item 1 is a recording plan, since the recording itself has to be made on a
phone. Everything here describes the app as it is on `main` today; keep it in
step with `app-review-notes.md` and `listing.md` if the app changes.

## 1. Screen recording: plan

**Setup**

- Use a physical iPhone on the current iOS release, with the App Store build
  installed from TestFlight (not a development build, so Pulsar haptics,
  calendar nudges, and the watch app are all present).
- Before recording: delete and reinstall the app so it starts from defaults,
  and turn on Settings, Sounds and Haptics so a tap is audible in the video.
  The reviewer cannot feel the haptic, so the ripple animation and the sound
  of the motor are the evidence.
- Record with the built in Control Center screen recorder. Start on the Home
  Screen so the launch is on the recording. Aim for two to three minutes.
  Optional: a short second clip filmed with another phone showing the buzz
  on a table, which makes the haptic obvious.

**Shot list, in order**

1. Home Screen: tap the Touchward icon. Let the splash and the home screen
   appear.
2. Tap the button three or four times: ripple, color change, and the
   "N today" counter climbing.
3. Press and hold the button: the timer traces the outline, then the bigger
   reward fires. Release early once to show that nothing is earned.
4. Tap Customize. Reward tab: change the press style, pick a different
   shape, choose a reward mode, move the Strength control. Close the sheet
   and tap the button so the change is visible.
5. Customize, Colors tab: open the color picker, change the button color and
   a ripple color, save a color to the library. Close and tap.
6. Customize, Notify tab: turn on Reminders and accept the notification
   permission prompt. Turn on "Nudge me after events end" and accept the
   calendar permission prompt; show the hint that says how many nudges are
   queued. Leave push notifications off (it is off by default and optional).
7. Customize, More tab: turn on "Volume buttons tap the button", close the
   sheet, press a volume button, show the tap. Tap "Test the link" to show
   the touchward://reward link firing a tap.
8. More tab, Support: open "Contact support" to show the in-app form (no
   email field), then close it without sending. Show the "Send crash
   reports" switch. Tap "Privacy policy" to show it opening in the in-app
   browser, then return.
9. Home screen: tap Random to generate a look, Save it with a name, open
   Library and apply it.
10. If a paired Apple Watch is available: raise the wrist, open Touchward on
    the watch, tap, and show the phone's counter reflecting the watch tap.
    Skip if no watch; the app does not depend on it.

**What the recording does not need, and why**

- Account registration, login, or deletion: the app has no accounts of any
  kind. There is nothing to sign in to and nothing to delete.
- User generated content and reporting or blocking: there is no content
  from other people. Nothing is shared or published. Saved looks are private
  settings on the device.
- Accessing paid content or features: the app is free with one non
  consumable in-app purchase, "Unlock everything". Show it in the recording:
  in Customize, tap a padlocked option (for example the fourth shape,
  Square) to open the purchase screen, complete the purchase with a sandbox
  tester account, and show the padlocks gone. Then show Customize, More,
  Restore purchases. There are no subscriptions and no consumables.

State the first two facts in the reply so the reviewer does not go looking
for them, and name the sandbox purchase step so they can find it.

## 2. Purpose and target audience

Touchward is a sensory reward button. When you finish something, you open
the app and tap a big glowing button, and the phone answers with a haptic
pattern and a ripple of light. Holding the button runs a short timer along
its outline and gives a bigger reward when it completes.

The problem it addresses is the missing "done" signal. Many tasks end
without any closure: the meeting ends, the email is sent, the dishes are
finished, and nothing marks it. People with ADHD, anxiety, or executive
function difficulties in particular describe finishing things as anticlimactic,
which makes starting the next thing harder. Touchward gives a small,
physical, immediate reward that the person controls: a deliberate ritual for
closing a task or marking a win.

The value is a customizable, private, one tap ritual. The button's shape,
colors, ripple, haptic pattern, and strength are all the user's to set, and
reminders and calendar nudges prompt a tap at natural moments such as the
end of an event. The audience is adults and teens who want a habit and
motivation aid, including neurodivergent users, students, and anyone who
likes tactile feedback. It is not a medical device and makes no health
claims. Age rating 4+; there is no objectionable content.

## 3. Setup and access instructions

No setup is required and no credentials exist. There is no account, no
login, no sample files, and no configuration. Install the app and open it;
the button is on the first screen and works immediately.

To reach each feature:

- Tap the button for a reward; press and hold for the timer reward.
- Customize (bottom row) opens four tabs. Reward: press style (tap, hold,
  or both), hold timer length, shapes, reward modes, haptic strength, and
  Pulsar preset pickers. Colors: color pickers for the button, reward
  colors, ripple colors, and background, with saved colors. Notify:
  reminders on a schedule, calendar nudges after events end, time sensitive
  delivery, and an optional push registration switch. More: volume buttons
  as a trigger, the Shortcut link test, the counter, support, crash report
  opt out, privacy policy, terms, and source code.
- Random, Save, and Library (bottom row) generate, keep, and reapply looks.
- Permissions are requested only when the related feature is turned on:
  notifications for reminders or nudges, calendar full access for nudges.
  Denying either simply leaves that feature off.
- The deep link touchward://reward fires a tap when opened; "Test the link"
  in the More tab demonstrates it without leaving the app.

Everything except the purchase works offline. The network calls are the optional support
form and, unless turned off, crash reports, both described in item 4.

## 4. External services, tools, and platforms

Core functionality (the button, haptics, ripples, colors, looks, reminders,
calendar nudges, the watch app) runs entirely on the device using Apple
frameworks and open source libraries bundled in the app. The only feature
that needs a service is the optional unlock, which goes through StoreKit and
RevenueCat as described below. Otherwise the app makes no network request
during normal use.

The complete list of anything outside the app:

- Apple frameworks on the device: Core Haptics for haptics, called through
  Pulsar (react-native-pulsar with its PulsarHaptics core, by Software
  Mansion). Pulsar is an open source library under the MIT license, compiled
  into the app from source. It is not a service: it needs no API key or
  account, contains no networking code, collects nothing, and only wraps
  Core Haptics on iOS and VibrationEffect on Android. EventKit
  for calendar nudges (read only, at runtime, never stored or transmitted);
  UserNotifications for local reminders and nudges; BGTaskScheduler to
  rescan the calendar a few times a day; WatchConnectivity to mirror
  settings to the watch app; AVAudioSession for the optional volume button
  trigger.
- Our own website, touchward-dopamine.com, hosted on Cloudflare Workers.
  It receives two kinds of optional post from the app and forwards each as
  an email to our support inbox through Resend, an email delivery service:
  (a) messages the user sends from the in-app support form (topic, message,
  phone model, app version; no name or email is asked for), and
  (b) crash reports (error and stack, app version, device model, OS version,
  and the app's own appearance settings; nothing about the person), which
  the user can turn off in Customize, More, Support. Crash Data is declared
  in the privacy manifest and in App Privacy as collected, not linked to
  identity, not used for tracking.
- Apple Push Notification service, only if the user turns on "Allow push
  notifications" in the Notify tab, which is off by default. The device
  registers with APNs and the token is shown to the user for their own
  automations. In this build no registration address is configured, so the
  token is not sent to us or anyone. Reminders and nudges do not use push.
- StoreKit and RevenueCat for the one time unlock. The purchase itself is
  Apple's, through StoreKit. RevenueCat (react-native-purchases, a purchase
  management SDK) confirms the purchase and restores it on the user's other
  devices. It receives the App Store receipt and a random identifier the app
  generates on the device; the app has no name, email, or account to link it
  to. Declared in the privacy manifest and in App Privacy as Purchase
  History, not linked to identity, not used for tracking, for app
  functionality. RevenueCat's SDK ships its own privacy manifest.
- Apple's own App Store services for the download and for the optional
  device level crash reporting that Apple offers developers.

Not used: no authentication service, no payment processor other than the
App Store, no data provider, no AI or machine learning service, no
analytics, advertising, or tracking SDK, no over the air update service, no
third party backend. Fonts (Josefin Sans and Nunito Sans, SIL Open Font
License) are bundled; nothing is fetched at runtime. The source is public at
github.com/situatedstrategies/touchward.

## 5. Regional differences

The app functions identically in all regions. There is no region specific
content, feature gating, licensing restriction, or server that varies by
location. The interface is in English only in this release. The only
regional variation is the price, which follows App Store pricing tiers in
each storefront. Calendar nudges and reminders use the device's own
calendar and clock, so they follow the user's locale automatically.

## 6. Regulated industry and third party material

Touchward does not operate in a regulated industry. It is not a medical,
health care, financial, gambling, or legal product and makes no medical or
health claims; it is a customizable haptic reward button. It requires no
license, certification, or authorization to provide.

It contains no protected third party material. All artwork, the icon, the
copy, and the haptic patterns are original work by Situated Strategies LLC.
The open source libraries it uses are under permissive licenses (MIT,
Apache 2.0, BSD, and the SIL Open Font License for the bundled typefaces),
listed with their versions in package.json in the public repository. The
Pulsar haptics library in particular is MIT licensed, with the license text
shipped inside the package, and needs no commercial agreement. Avenir
Next is an iOS system font used through the operating system. No music,
video, brand, or character content belongs to anyone else.
