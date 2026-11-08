# Notes for App Review

Paste the block below into App Store Connect, App Review Information, Notes.
It is kept well under the field's limit. No demo account is
needed: the app has no sign in.

---

Touchward is a reward button: tap or hold it for a haptic, a short tone, and a ripple. Free, with no ads and no tracking prompt, and one in-app purchase, Touchward Full. No account; works offline except the purchase check.

TEST

1. Tap the button. Hold it 5 seconds for a bigger reward.
2. Customize (bottom row): Reward, Colors, Notify, More.
3. Random, Save, Library: generate and keep looks. Without the purchase, Random and every choice past the default look open the purchase screen.
4. Customize, More, Counter: today and all-time taps, and taps left until the next berserk burst. Every 500 taps the button goes berserk for a few seconds (stronger haptics, shaking, random colors and ripples). Counts stay on the phone; Reset counter clears them.
5. Daily limit: without the purchase the app gives 100 rewards a day, counted on the phone's calendar day. After the 100th, a tap plays nothing and a line under the button says so, with a button that opens the purchase screen.
6. Rating: Apple's SKStoreReviewController sheet may appear after real use (install a week old, three days of use, twenty rewards). A Rate link in Customize, More opens the App Store listing.

PERMISSIONS (optional, user initiated)

- Notifications: only for Reminders or Calendar nudges. Local only.
- Calendar: only for "Nudge me after events end". Reads 7 days of events to schedule local notifications; never writes, stores, or sends them. A background task rescans only while nudges are on.
- Time Sensitive: only the user's own reminders, when switched on.
- Push: off by default; shows the token for the user's own automations.
- Sound: the tone follows the ringer switch. The audio session is Ambient, so the user's music keeps playing under the tones; the music note opens Apple Music or Spotify by URL. No background audio.
- Volume buttons (off by default): a press counts as a tap in the foreground.
- touchward://reward fires a tap ("Test the link" in More).
- No tracking permission: the app has no advertising SDK and never asks App Tracking Transparency.

WATCH: a companion with the button, mirroring reminders over WatchConnectivity.

PRIVACY

- No ads and no advertising SDK.
- Google Analytics for Firebase (feature use, sessions, device, OS), opt out in More, Support. Built without the advertising identifier.
- Crash reports to our inbox, opt out in More, Support.
- Support form: message, device model, app version.
- Purchases: StoreKit, verified by RevenueCat.
- Counter and milestones: stored on the phone only.
- No sign in of any kind on iOS (Google Play Games sign in is Android only).
- https://touchward-dopamine.com/privacy

PURCHASE
One non consumable, "Touchward Full" (0.49 US, product id touchward_full, unchanged from the earlier unlock). Reach it from Customize, More, Touchward Full, Get Touchward Full, or from the line under the button after the day's 100th reward, or by tapping any locked (padlocked) choice in Customize. Buy with a sandbox account, then Restore purchase on the same screen or in the purchase screen. It lifts the daily limit and unlocks every customization.

Contact: support@touchward-dopamine.com
