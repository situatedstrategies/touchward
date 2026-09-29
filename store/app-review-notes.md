# Notes for App Review

Paste the block below into App Store Connect, App Review Information, Notes.
It is kept well under the field's limit. No demo account is
needed: the app has no sign in.

---

Touchward is a reward button: tap or hold it for a haptic, a short tone, and a ripple. Free with one in-app unlock. No account, no ads; works offline except the purchase check.

TEST

1. Tap the button. Hold it 5 seconds for a bigger reward.
2. Customize (bottom row): Reward, Colors, Notify, More.
3. Random, Save, Library: generate and keep looks.

PERMISSIONS (optional, user initiated)

- Notifications: only for Reminders or Calendar nudges. Local only.
- Calendar: only for "Nudge me after events end". Reads 7 days of events to schedule local notifications; never writes, stores, or sends them. A background task rescans only while nudges are on.
- Time Sensitive: only the user's own reminders, when switched on.
- Push: off by default; shows the token for the user's own automations.
- Sound: the tone follows the ringer switch. Free, a tap sets the audio session to Solo Ambient, pausing other audio while in front. The unlock sets Ambient (mixes with the user's music) and enables the music note, which opens Apple Music or Spotify by URL. No background audio.
- Volume buttons (off by default): a press counts as a tap in the foreground.
- touchward://reward fires a tap ("Test the link" in More).

WATCH: a companion with the button, mirroring reminders over WatchConnectivity.

PRIVACY

- No tracking, no ad identifier, nothing linked to identity.
- Google Analytics for Firebase (feature use, sessions, device, OS), opt out in More, Support.
- Crash reports to our inbox, opt out in More, Support.
- Support form: message, device model, app version.
- Purchases: StoreKit, verified by RevenueCat.
- https://touchward-dopamine.com/privacy

PURCHASE
One non consumable, "Unlock everything" (1.99 US). Tap a padlocked option (e.g. the Square shape) or the music note, buy with a sandbox account, then Restore purchases in More.

Contact: support@touchward-dopamine.com
