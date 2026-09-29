# Notes for App Review

Paste the block below into App Store Connect, App Review Information, Notes.
It is under 4,000 characters, which is the field's limit. No demo account is
needed: the app has no sign in.

---

Touchward is a sensory reward button, free with one in-app unlock. Tap (or
hold) a big button to get a haptic pattern, a short tone, and a ripple. No
account, no sign in, no ads. Everything works offline except the purchase
check. Features are on by default except where noted.

HOW TO TEST

1. Tap the button: haptic, tone, ripple. Hold it: the outline fills over 5
   seconds, then a bigger reward.
2. Customize (bottom row) has four tabs: Reward, Colors, Notify, More.
3. Random, Save, and Library (bottom row) generate, keep, and reapply looks.

PERMISSIONS, ALL OPTIONAL AND USER INITIATED

- Notifications: asked only when the user turns on Reminders or Calendar
  nudges (Notify). Both are LOCAL notifications.
- Time Sensitive entitlement: only the user's own reminders and nudges, and
  only with "Time sensitive" switched on.
- Calendar (full access): asked only for "Nudge me after events end". Reads
  the next 7 days to schedule a local notification as each event ends. Never
  writes, stores, or sends event data. The hint shows the nudges queued.
- Background task (com.expo.modules.backgroundtask.processing): rescans the
  calendar a few times a day, only while calendar nudges are on.
- Push (aps-environment): off by default. "Allow push notifications" shows
  the device token so users can notify themselves from automations. We send
  nothing.
- Haptics: Core Haptics through the Pulsar library.
- Sound: the tone follows the ringer switch. Free, a tap sets the audio
  session to Solo Ambient, so other audio pauses while Touchward is in
  front, as in many games. The unlock sets Ambient, which mixes with the
  user's music, and enables the home screen music note, which opens Apple
  Music or Spotify by URL. No background audio mode.
- Volume buttons (More, off by default): in the foreground a volume press
  counts as a tap; media volume is parked at 50% and restored on leaving.
- URL scheme touchward://reward fires a tap (Shortcuts, Action Button, Back
  Tap). Test with "Test the link" in More.

APPLE WATCH
A watchOS companion shows the button and ripples and mirrors the phone's
reminders as local notifications. It gets the phone's look over
WatchConnectivity and sends back a tap count.

DATA AND PRIVACY

- No tracking, no advertising identifier, nothing linked to identity.
- Usage analytics: Google Analytics for Firebase (feature use, sessions, app
  version, device model, OS) with a random app instance ID. Opt out in More,
  Support, "Share usage analytics". Declared as Product Interaction and Other
  Usage Data, not linked, not for tracking.
- Crash reports: opt out in More, Support. The error, app version, device,
  OS, and the app's look settings, sent to our support inbox. Declared as
  Crash Data, not linked, not for tracking.
- Support form: topic, message, device model, app version. No name or email.
- Purchase: StoreKit, confirmed and restored by RevenueCat with the receipt
  and a random on-device ID. Declared as Purchase History, not linked.
- Privacy: https://touchward-dopamine.com/privacy
- Support: https://touchward-dopamine.com/support

BUSINESS MODEL
One non consumable in-app purchase, "Unlock everything" (1.99 US). No
subscriptions or accounts. Free: the button, the first three of every
option, all colors, reminders, and the Shortcut link. Locked options and the
music note show the purchase screen. To test: tap a padlocked option in
Customize (for example the fourth shape, Square), buy with a sandbox
account, then Restore purchases in More.

Source: github.com/situatedstrategies/touchward
Contact: support@touchward-dopamine.com
