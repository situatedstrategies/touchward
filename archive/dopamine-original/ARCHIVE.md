# Dopamine, the original snapshot

This folder is the first version of the app that became Touchward, written in
September 2026 under the name Dopamine and parked in the Have Another Cherry
web app repository ("temporary home until its own repo exists"). It was moved
here on November 4th 2026, unchanged, so that repository holds only Have
Another Cherry.

Everything in it has since been rebuilt in this repository's own `src/`
(haptics, the reward button, side-button triggers, reminders and settings),
and Touchward still migrates the old `dopamine.settings.v1` storage key. This
copy is for reference only: it is not built, not shipped, and lives on the
`dopamine-original` branch rather than `main`.

Original commits in situatedstrategies/Have-Another-Cherry-App:
- 119475f Add Dopamine app (temporary home until its own repo exists), September 12th 2026
- dfc6bb6 Dopamine: add reminders, time-sensitive delivery, and side-button triggers, September 12th 2026
