# Notes for App Review

Paste the block below into App Store Connect, App Review Information, Notes.
It is under 4,000 characters, which is the field's limit. No demo account is
needed: the app has no sign in.

---

Touchward is a sensory reward button, free with one in-app unlock. You tap
(or hold) a big button and get a haptic pattern and a ripple animation back.
There is no account, no sign in, no ads, and no server the app depends on
beyond the store's purchase check. Every
feature below works offline. Everything is on by default except where noted.

HOW TO TEST

1. Open the app. Tap the button: haptic plus ripple. Hold it: the outline
   fills over 5 seconds, then a bigger reward.
2. Tap Customize (bottom row). Four tabs: Reward (press style, shapes,
   haptics), Colors (pickers, backgrounds), Notify (calendar nudges, reminders,
   push), More (triggers, counter, support).
3. Random, Save, and Library (bottom row) generate, keep, and reapply looks.

PERMISSIONS AND ENTITLEMENTS, ALL OPTIONAL AND USER INITIATED

- Notifications: requested only when the user turns on Reminders or Calendar
  nudges in Notify. Both schedule LOCAL notifications on the device.
- Time Sensitive Notifications entitlement: the user's own reminders and
  calendar nudges, and only when the user switches on "Time sensitive" in
  Notify. Nothing else uses it.
- Calendar (full access): requested only when the user turns on "Nudge me
  after events end" in Notify. The app reads the next 7 days of events to
  schedule a local notification when each event ends. It never writes to the
  calendar and never stores or transmits event data. To test: Notify tab, turn
  on Calendar nudges, grant access; the hint shows how many nudges are queued.
- Background task (BGTaskScheduler, identifier
  com.expo.modules.backgroundtask.processing): rescans the calendar a few times
  a day so nudges stay current. It runs only while calendar nudges are on.
- Push notifications (aps-environment): off by default. The Notify tab has an
  "Allow push notifications" switch that registers the device and shows its
  token so the user can send themselves notifications from automations. Nothing
  is sent by us in this version and no token leaves the device unless the user
  sets that up. Reminders do not depend on push.
- Haptics: Core Haptics through the Pulsar library. No permission.
- Volume buttons (More tab, off by default): while the app is in the
  foreground, a volume button press counts as a tap. The app parks the media
  volume at 50% while active and restores it when the app leaves the
  foreground. Standard AVAudioSession use, no private API.
- URL scheme touchward://reward: opening it fires a tap, for Shortcuts,
  Action Button, and Back Tap. Test with "Test the link" in the More tab.

APPLE WATCH
The bundle includes a watchOS companion app (Touchward). It is only the
button and its ripples, with the phone's reminder schedule mirrored as local
watch notifications. It has no settings; it receives the phone's look over
WatchConnectivity and sends back a tap count. It works without the phone
nearby once it has received settings once.

DATA AND PRIVACY

- Nothing personal is collected. No analytics or tracking SDKs.
- Crash reports: on by default, opt out in More, Support, "Send crash
  reports". A report contains the error, app version, device model, OS version,
  and the app's own appearance settings. It is emailed to our support inbox via
  our website. Declared in the privacy manifest as Crash Data, not linked to
  identity, not for tracking, and in App Privacy the same way.
- Support form (More, Support): sends the topic, the message, device model,
  and app version. It asks for no email and no name.
- The unlock (in-app purchase): purchases go through StoreKit. RevenueCat
  (react-native-purchases) confirms and restores the purchase using the
  App Store receipt and a random identifier generated on the device. Declared
  in the privacy manifest and App Privacy as Purchase History, not linked to
  identity, not for tracking. RevenueCat's SDK ships its own privacy manifest.
- Privacy policy: https://touchward-dopamine.com/privacy
- Support: https://touchward-dopamine.com/support

BUSINESS MODEL
Free download with one non consumable in-app purchase, "Unlock everything"
(1.99 US), through StoreKit and RevenueCat. No subscriptions, no consumables,
no account. The free app includes the button, the first three of every
option, all colors, reminders, and the Shortcut link; locked options show a
padlock and open the purchase screen. Restore purchases is in Customize,
More. To test: tap any padlocked option in Customize (for example the fourth
shape, Square) to reach the paywall; use a sandbox tester account to buy,
then Restore purchases to confirm it returns.

OPEN SOURCE
The complete source is public at github.com/situatedstrategies/touchward, so
any behavior above can be verified in code.

Contact: the support form on the website reaches us fastest; the address is
support@touchward-dopamine.com.
