# App Review, Guideline 5.1.2(i): reply and next steps

Apple's message on November 5th 2026 (submission
59a49c34-33b7-4ac7-aebf-ac81e8f43069, version 1.2.2 build 18, reviewed on an
iPad Air 11-inch M3) said the App Privacy answers declare tracking but the app
does not use App Tracking Transparency.

## What actually happened

The App Privacy answers are right. The free app shows Google AdMob ads, and
Google receives the advertising identifier when someone allows tracking, so
"Tracking: yes" stays (see "App Store privacy questionnaire" in listing.md).

The app does ask. In 1.2.2 it asks right before the ads SDK starts, and the
SDK starts only when the first ad is about to load, which is after 100
rewards in one session (`src/ads/ads.ts`, `noteRewardForAds`, with
`rewardsBetweenAds` of 120 in `src/ads/policy.ts`). A reviewer never taps
that many times. The review notes also asked them to buy Remove ads, and
after that purchase the SDK never starts, so the prompt can never appear.

Of Apple's three options this is the third: the app tracks, it uses ATT, and
the Review Notes must say where the prompt is.

## 1. Reply now, about 1.2.2 (build 18)

Apple says the issue can be resolved in the next update and that a reply is
enough to have this submission approved now. That offer is meant for
submissions that include bug fixes, so send this only if 1.2.2 fixes
something for people on the version currently in the store. Paste into the
App Review message thread in App Store Connect:

---

Hello,

Thank you for the review. Touchward does use App Tracking Transparency, and
the App Privacy answers are accurate: the free app shows Google AdMob ads,
and Google receives the advertising identifier only if the person allows
tracking in Apple's prompt.

In 1.2.2 (18) the prompt is requested immediately before the Google Mobile
Ads SDK starts, and the SDK starts only shortly before the first ad. Ads are
spaced far apart, so that moment comes after 100 rewards in one session,
which is why the prompt did not appear during your review. To see it in this
build:

1. Install the app fresh and do not buy Remove ads first. After that
   purchase the ads SDK never starts, so the prompt never appears.
2. Tap the button 100 times in one session. Apple's tracking prompt appears
   right after the 100th reward. In the EEA and UK, Google's consent form
   appears first, then Apple's prompt.
3. If it still does not appear, please check that Settings, Privacy &
   Security, Tracking, Allow Apps to Request to Track is on.

No ad is requested until the prompt has been answered, the advertising
identifier reaches Google only if the person allows tracking, and Firebase
Analytics is built without advertising identifier support.

We would like 1.2.2 approved at this time. In the next update the prompt
moves to the first tap on a fresh install, and the Review Notes will say
exactly where to find it.

Thank you,
Situated Strategies LLC

---

## 2. The next update (1.2.3)

The code on this branch asks at the first reward instead of the hundredth:
`askAdPermissions` in `src/ads/ads.ts` runs Google's consent step and then
Apple's prompt once the store has confirmed the phone is on the free app,
with no sheet open and the app in the foreground. The ads SDK still starts
only when an ad is about to load, and an unlocked phone is never asked.

It also turns on `delayAppMeasurementInit` (app.json, mirrored into
`ios/Touchward/Info.plist` and the Android manifest). In 1.2.2 it was off,
which lets Google's ads SDK start its own app measurement at launch, before
anyone has answered the prompt. With it on, that waits until the SDK is
started, which is after the prompt, so the review notes can say plainly that
nothing used for tracking is collected first.

And it drops `requestNonPersonalizedAdsOnly: true` from the ad request. In
1.2.2 every ad was forced non personalised, so the prompt's promise that
allowing tracking "lets the ads be more relevant" could never come true. Now
the SDK follows each person's answers: Google's consent form where it
applies, and on iOS the advertising identifier only after the prompt is
allowed. On Android outside the EEA and UK, where no consent form applies,
ads can now be personalised with the Android advertising ID, which the Play
Data safety form already declares (Device or other IDs, Advertising or
marketing).

Before submitting 1.2.3:

1. Bump the version to 1.2.3 in `app.json` and build with EAS.
2. On a test iPhone or iPad: delete the app, install the new build, tap the
   button once, and confirm Apple's tracking prompt appears. Answer it both
   ways on two installs and confirm an ad still shows either way (the first
   one comes after 120 rewards and at least 90 seconds in the app).
3. Paste the block in `app-review-notes.md` into App Review Information,
   Notes. It now opens with a TRACKING PROMPT section that tells the
   reviewer to tap once.
4. Leave the App Privacy answers as they are.
