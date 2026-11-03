# Notes for App Review

Paste the block below into App Store Connect, App Review Information, Notes.
It is kept well under the field's limit. No demo account is
needed: the app has no sign in.

---

Touchward is a reward button: tap or hold it for a haptic, a short tone, and a ripple. Free, with a full-screen ad now and then between rewards (Google AdMob) and one in-app purchase that turns the ads off. No account; works offline except the purchase check and the ads.

TEST

1. Tap the button. Hold it 5 seconds for a bigger reward.
2. Customize (bottom row): Reward, Colors, Notify, More.
3. Random, Save, Library: generate and keep looks.
4. Customize, More, Counter: today and all-time taps, and taps left until the next berserk burst. Every 500 taps the button goes berserk for a few seconds (stronger haptics, shaking, random colors and ripples). Counts stay on the phone; Reset counter clears them.
5. Rating: Apple's SKStoreReviewController sheet may appear after real use (install a week old, three days of use, twenty rewards). A Rate link in Customize, More opens the App Store listing.

PERMISSIONS (optional, user initiated)

- Notifications: only for Reminders or Calendar nudges. Local only.
- Calendar: only for "Nudge me after events end". Reads 7 days of events to schedule local notifications; never writes, stores, or sends them. A background task rescans only while nudges are on.
- Time Sensitive: only the user's own reminders, when switched on.
- Push: off by default; shows the token for the user's own automations.
- Sound: the tone follows the ringer switch. The audio session is Ambient, so the user's music keeps playing under the tones; the music note opens Apple Music or Spotify by URL. No background audio.
- Volume buttons (off by default): a press counts as a tap in the foreground.
- touchward://reward fires a tap ("Test the link" in More).

WATCH: a companion with the button, mirroring reminders over WatchConnectivity.

PRIVACY

- Ads (free app only): Google Mobile Ads SDK, an interstitial between rewards, never in the first 90 seconds and never more than one every 5 minutes. The App Tracking Transparency prompt appears before the first ad; declining keeps the ads non personalised. Nothing is linked to identity. After the purchase the SDK never starts.
- Google Analytics for Firebase (feature use, sessions, device, OS), opt out in More, Support.
- Crash reports to our inbox, opt out in More, Support.
- Support form: message, device model, app version.
- Purchases: StoreKit, verified by RevenueCat.
- Counter and milestones: stored on the phone only.
- No sign in of any kind on iOS (Google Play Games sign in is Android only).
- https://touchward-dopamine.com/privacy

PURCHASE
One non consumable, "Remove ads" (0.99 US, product id unchanged from the earlier "Unlock everything"). Customize, More, Ads, Remove ads; buy with a sandbox account, then Restore purchase on the same screen. Every feature is free with or without it; the purchase only turns the ads off.

Contact: support@touchward-dopamine.com
