import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { RewardButton, type RewardButtonHandle } from "../button/RewardButton";
import { SHAPE_VIEWBOX, WAVY_PATH } from "../button/shapes";
import { NavyBackdrop } from "../components/Backdrop";
import { startVolumeButtonListener } from "../hardware/volumeButtons";
import { syncCalendarNudges } from "../notifications/calendar";
import { setCalendarSyncTaskEnabled } from "../notifications/calendarTask";
import { registerForPush } from "../notifications/push";
import { configureNotifications, syncReminders } from "../notifications/reminders";
import { pickLook, randomLook, suggestName, type LookSettings } from "../looks/looks";
import { useLooks } from "../store/looks";
import { lockedToFree } from "../purchases/gates";
import { logReward } from "../analytics/analytics";
import { unlockAchievement } from "../games/achievements";
import { BERSERK_EVERY, berserkMilestone, rewardsToNextBerserk } from "../games/milestones";
import { BERSERK_MS } from "../haptics/engine";
import { noteReviewLaunch, requestReviewAfterReward } from "../review/storeReview";
import {
  enableTouchSounds,
  onForeground,
  onTouchSound,
  setOtherAudioAllowed,
} from "../listening/audioSession";
import { MusicAppsButton } from "../listening/MusicAppsButton";
import {
  FREE_REWARDS_PER_DAY,
  countForDay,
  isRewardAllowed,
  localDayKey,
} from "../store/dailyCap";
import { useSettings } from "../store/settings";
import { useUnlock } from "../store/unlock";
import { onWatchReward, sendSettingsToWatch } from "../../modules/watch-sync";
import { themeForBackdrop, useTheme } from "../design/theme";
import { body, bodySemibold, heading } from "../design/typography";
import { LibraryScreen } from "./LibraryScreen";
import { SaveLookSheet } from "./SaveLookSheet";
import { SettingsScreen } from "./settings/SettingsScreen";

/** The bottom row buttons are always off white with dark text. */
const PILL_BACKGROUND = "#F4F4F5";
const PILL_TEXT = "#18181B";

/** The clear-screen toggle: the icon's wavy ring, outlined, always white. */
const CLEAR_ICON = "#FFFFFF";
const CLEAR_ICON_SIZE = 22;
const CLEAR_ICON_STROKE = 7;
/** A faint dark halo under the ring so it still reads on the white backdrop. */
const CLEAR_ICON_SHADOW = "rgba(0, 0, 0, 0.35)";
const CLEAR_ICON_SHADOW_STROKE = 13;

/** A settings change reaches the watch after this pause, so drags send once. */
const WATCH_SYNC_DELAY_MS = 600;

/**
 * Shortest side at or above this is laid out as a tablet: every iPad, and the
 * unfolded iPhone Duo (about 669 points across). The largest folded phone is
 * 440 points wide, so nothing phone sized crosses it.
 */
const TABLET_MIN_SIDE = 650;

/** The milestone tap's own reward lands first; the burst follows this much later. */
const BERSERK_DELAY_MS = 350;
/** The milestone banner outlasts the burst by this much. */
const BERSERK_BANNER_EXTRA_MS = 1200;

const PROMPTS = {
  both: "Did the thing? Tap it. Or hold it.",
  tap: "Did the thing? Tap it.",
  hold: "Did the thing? Hold it.",
};

/** Opening touchward://reward (or any link with ?reward=1) fires a tap on arrival. */
function linkAsksForReward(url: string): boolean {
  const parsed = Linking.parse(url);
  const path = (parsed.path ?? parsed.hostname ?? "").replace(/^\/+|\/+$/g, "");
  return path === "reward" || parsed.queryParams?.reward === "1";
}

export function HomeScreen() {
  const systemTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { settings, update, stats, recordReward, loaded } = useSettings();
  // The neon backdrop brings its own dark theme; the settings sheet keeps the system look.
  const backdrop = loaded ? settings.backdrop : "navy";
  const neon = backdrop === "navy";
  const theme = themeForBackdrop(backdrop, systemTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Cleared: only the button and the ring stay on screen. Tap the ring again to restore.
  const [cleared, setCleared] = useState(false);
  const toggleCleared = useCallback(() => setCleared((c) => !c), []);
  const { looks, save } = useLooks();
  const { unlocked, known, presentPaywall } = useUnlock();
  const button = useRef<RewardButtonHandle>(null);

  const currentLook = pickLook(settings);
  const applyLook = useCallback((look: LookSettings) => update(look), [update]);
  // A random look is every choice at once, so it is a Full feature: the free
  // app opens the paywall and wears the look only if the purchase goes through.
  const shuffleLook = useCallback(() => {
    const look = randomLook(pickLook(settings));
    if (unlocked) {
      update(look);
      return;
    }
    presentPaywall()
      .then((ok) => {
        if (ok) update(look);
      })
      .catch(() => {});
  }, [update, settings, unlocked, presentPaywall]);
  const openSave = useCallback(() => setSaveOpen(true), []);
  const saveLook = useCallback(
    (name: string) => {
      save(name, pickLook(settings));
      setSaveOpen(false);
    },
    [save, settings],
  );

  // Once the store has answered "not unlocked", anything locked that is still
  // switched on (a refund, a reinstall on another account) goes back to free.
  useEffect(() => {
    if (!loaded || !known || unlocked) return;
    const patch = lockedToFree(settings);
    if (Object.keys(patch).length > 0) update(patch);
  }, [loaded, known, unlocked, settings, update]);

  // The counter and the unlock state in refs, so the reward path stays stable
  // and reads what is true at the moment of the tap, not at the last render.
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  const unlockedRef = useRef(unlocked);
  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  // The free app's daily limit (store/dailyCap.ts). Every reward source goes
  // through canReward: the button and its hold timer, and with them the volume
  // buttons, the link and the notification button that trigger it, plus the
  // watch below. countReward bumps the ref at once so two taps in one frame
  // cannot both pass at 99.
  const canReward = useCallback(
    () => isRewardAllowed(countForDay(statsRef.current, localDayKey()), unlockedRef.current),
    [],
  );
  const countReward = useCallback(() => {
    recordReward();
    const day = localDayKey();
    const s = statsRef.current;
    statsRef.current = {
      day,
      rewardsToday: countForDay(s, day) + 1,
      rewardsAllTime: s.rewardsAllTime + 1,
    };
  }, [recordReward]);
  // The first blocked attempt opens the paywall itself and leaves a line with
  // a button under the button; later blocked attempts only keep the line. Both
  // go when the day turns or Touchward Full is bought, and the next time the
  // limit is hit the paywall opens again once.
  const [capHit, setCapHit] = useState(false);
  const capHitRef = useRef(false);
  const onBlocked = useCallback(() => {
    if (capHitRef.current) return;
    capHitRef.current = true;
    setCapHit(true);
    presentPaywall().catch(() => {});
  }, [presentPaywall]);
  const allowedNow = isRewardAllowed(countForDay(stats, localDayKey()), unlocked);
  useEffect(() => {
    if (capHit && allowedNow) {
      capHitRef.current = false;
      setCapHit(false);
    }
  }, [capHit, allowedNow]);
  const capped = capHit && !allowedNow;

  const sheetOpen = useRef(false);
  useEffect(() => {
    sheetOpen.current = settingsOpen || saveOpen || libraryOpen;
  }, [settingsOpen, saveOpen, libraryOpen]);
  useEffect(() => {
    if (loaded) noteReviewLaunch().catch(() => {});
  }, [loaded]);

  // Every BERSERK_EVERY rewards, all time, the button goes berserk. The count
  // is watched rather than the tap, so a reward from the watch, a link, or a
  // notification that lands on the milestone counts too. The first value
  // after loading only sets the baseline, so an old count never fires it.
  const lastMilestone = useRef<number | null>(null);
  const [berserkBanner, setBerserkBanner] = useState<number | null>(null);
  // Kept in a ref, not the effect's cleanup: a tap during the short delay
  // must not cancel the burst it just earned.
  const berserkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!loaded) return;
    const milestone = berserkMilestone(stats.rewardsAllTime);
    const previous = lastMilestone.current;
    lastMilestone.current = milestone;
    if (stats.rewardsAllTime === 1) unlockAchievement("firstReward");
    if (previous === null || milestone <= previous) return;
    const count = stats.rewardsAllTime;
    berserkTimers.current.push(
      setTimeout(() => {
        button.current?.berserk();
        setBerserkBanner(count);
      }, BERSERK_DELAY_MS),
      setTimeout(
        () => setBerserkBanner((shown) => (shown === count ? null : shown)),
        BERSERK_DELAY_MS + BERSERK_MS + BERSERK_BANNER_EXTRA_MS,
      ),
    );
    unlockAchievement("berserk");
  }, [loaded, stats.rewardsAllTime]);
  useEffect(
    () => () => {
      for (const t of berserkTimers.current) clearTimeout(t);
    },
    [],
  );

  const onReward = useCallback(
    (kind: "tap" | "hold") => {
      countReward();
      logReward(kind);
      onTouchSound();
      requestReviewAfterReward({
        source: kind,
        // countReward has already counted this reward in the ref.
        rewardsAllTime: statsRef.current.rewardsAllTime,
        isSheetOpen: () => sheetOpen.current,
      });
    },
    [countReward],
  );

  // Touch sounds and other apps' music for everyone.
  useEffect(() => {
    if (loaded) enableTouchSounds(settings.touchSounds);
  }, [loaded, settings.touchSounds]);
  const otherAudioAllowed = true;
  useEffect(() => {
    setOtherAudioAllowed(otherAudioAllowed);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") onForeground();
    });
    return () => sub.remove();
  }, [otherAudioAllowed]);

  // External triggers all land here so they behave exactly like a finger tap.
  const triggerTap = useCallback(() => button.current?.reward("tap"), []);

  // Notifications: one-time setup, then keep the schedule in step with settings.
  useEffect(() => {
    configureNotifications().catch(() => {});
  }, []);
  useEffect(() => {
    if (!loaded) return;
    syncReminders(settings.reminders).catch(() => {});
  }, [loaded, settings.reminders]);
  // Calendar nudges: rescan when settings change and each time the app comes back.
  useEffect(() => {
    if (!loaded) return;
    const run = () =>
      syncCalendarNudges(settings.calendarNudges, settings.reminders.timeSensitive).catch(
        () => {},
      );
    run();
    setCalendarSyncTaskEnabled(settings.calendarNudges.enabled).catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => sub.remove();
  }, [loaded, settings.calendarNudges, settings.reminders.timeSensitive]);
  // Apple Watch: mirror the look and the reminder schedule, debounced so a color
  // drag sends one update, and only when something the watch uses has changed.
  const lastWatchPayload = useRef("");
  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({
      shape: settings.shape,
      rewardMode: settings.rewardMode,
      rippleShape: settings.rippleShape,
      idleColor: settings.idleColor,
      tapColors: settings.tapColors,
      rippleColors: settings.rippleColors,
      rippleFollowButton: settings.rippleFollowButton,
      backdrop: settings.backdrop,
      remindersEnabled: settings.reminders.enabled,
      reminderEveryHours: settings.reminders.everyHours,
      reminderStartHour: settings.reminders.startHour,
      reminderEndHour: settings.reminders.endHour,
      hapticStrength: settings.hapticStrength,
    });
    if (payload === lastWatchPayload.current) return;
    const timer = setTimeout(() => {
      lastWatchPayload.current = payload;
      sendSettingsToWatch(JSON.parse(payload) as Record<string, unknown>);
    }, WATCH_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loaded, settings]);
  // A watch tap counts here too, under the same daily limit. The watch has
  // already played its click, so a blocked one only leaves the count where it is.
  useEffect(
    () =>
      onWatchReward(() => {
        if (!canReward()) {
          onBlocked();
          return;
        }
        countReward();
        logReward("watch");
      }),
    [canReward, onBlocked, countReward],
  );
  // Push tokens can rotate, so re-register on every launch while push is on.
  useEffect(() => {
    if (!loaded || !settings.pushEnabled) return;
    registerForPush().catch(() => {});
  }, [loaded, settings.pushEnabled]);

  // Tapping a reminder (or its "I did it" button) counts as the tap.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);
  useEffect(() => {
    if (!lastResponse || !loaded) return;
    const key = `${lastResponse.notification.request.identifier}:${lastResponse.notification.date}`;
    if (handledResponse.current === key) return;
    handledResponse.current = key;
    const data = lastResponse.notification.request.content.data as
      { reward?: boolean } | undefined;
    if (data?.reward) triggerTap();
  }, [lastResponse, loaded, triggerTap]);

  // Deep link from an iOS Action Button / Back Tap shortcut or an Android remap.
  const url = Linking.useURL();
  const handledUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!url || !loaded || handledUrl.current === url) return;
    handledUrl.current = url;
    if (linkAsksForReward(url)) triggerTap();
  }, [url, loaded, triggerTap]);

  // Volume buttons while the app is in the foreground.
  useEffect(() => {
    if (!loaded || !settings.volumeButtons) return;
    let stop: (() => void) | null = null;
    const start = () => {
      stop?.();
      stop = startVolumeButtonListener(triggerTap);
    };
    if (AppState.currentState === "active") start();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") start();
      else {
        stop?.();
        stop = null;
      }
    });
    return () => {
      sub.remove();
      stop?.();
    };
  }, [loaded, settings.volumeButtons, triggerTap]);

  // Tablets get a larger button and type; the layout otherwise stays the same.
  const tablet = Math.min(width, height) >= TABLET_MIN_SIDE;
  const size = Math.round(Math.min(width * 0.62, height * 0.34, tablet ? 520 : 300));
  const scale = tablet ? 1.4 : 1;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + 16 * scale,
          paddingBottom: insets.bottom + 16 * scale,
          paddingHorizontal: 24 * scale,
        },
      ]}
    >
      {neon && <NavyBackdrop />}
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <ClearToggle cleared={cleared} onPress={toggleCleared} scale={scale} />
          <Hidden hidden={cleared}>
            <Text style={[styles.brand, { color: theme.text, fontSize: 24 * scale }]}>
              Touchward
            </Text>
          </Hidden>
        </View>
        <Hidden hidden={cleared} style={styles.topRight}>
          <View
            style={styles.counter}
            accessible
            accessibilityLabel={`${stats.rewardsToday} rewards today, ${rewardsToNextBerserk(stats.rewardsAllTime)} to the next berserk`}
          >
            <Text style={[styles.count, { color: theme.text, fontSize: 36 * scale }]}>
              {stats.rewardsToday}
            </Text>
            <Text style={[styles.countLabel, { color: theme.muted, fontSize: 12 * scale }]}>
              today · {rewardsToNextBerserk(stats.rewardsAllTime)} to berserk
            </Text>
          </View>
          <MusicAppsButton scale={scale} color={theme.muted} />
        </Hidden>
      </View>

      <View style={styles.middle}>
        {loaded && (
          <RewardButton
            ref={button}
            settings={settings}
            size={size}
            onReward={onReward}
            canReward={canReward}
            onBlocked={onBlocked}
          />
        )}
        {berserkBanner !== null && (
          <View style={styles.banner} pointerEvents="none" accessibilityLiveRegion="polite">
            <Text style={[styles.bannerCount, { color: theme.text, fontSize: 44 * scale }]}>
              {berserkBanner}
            </Text>
            <Text style={[styles.bannerLabel, { color: theme.text, fontSize: 18 * scale }]}>
              taps. Berserk!
            </Text>
            <Text style={[styles.bannerHint, { color: theme.muted, fontSize: 13 * scale }]}>
              Next one at {berserkBanner + BERSERK_EVERY}
            </Text>
          </View>
        )}
      </View>

      <Hidden hidden={cleared} style={styles.bottom}>
        {capped ? (
          <>
            <Text style={[styles.prompt, { color: theme.text, fontSize: 16 * scale }]}>
              That's {FREE_REWARDS_PER_DAY} for today. Touchward Full has no limit.
            </Text>
            <View style={styles.capAction}>
              <Pill
                label="Get Touchward Full"
                onPress={() => void presentPaywall()}
                scale={scale}
              />
            </View>
          </>
        ) : (
          <Text style={[styles.prompt, { color: theme.text, fontSize: 16 * scale }]}>
            {PROMPTS[settings.mode]}
          </Text>
        )}
        <View style={styles.toolbar}>
          <Pill label="Random" onPress={shuffleLook} scale={scale} />
          <Pill label="Save" onPress={openSave} scale={scale} />
          <Pill label="Library" onPress={() => setLibraryOpen(true)} scale={scale} />
          <Pill label="Customize" onPress={() => setSettingsOpen(true)} scale={scale} />
        </View>
      </Hidden>

      <SettingsScreen
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={systemTheme}
      />
      <SaveLookSheet
        visible={saveOpen}
        look={currentLook}
        suggestedName={suggestName(currentLook, looks)}
        theme={systemTheme}
        onSave={saveLook}
        onClose={() => setSaveOpen(false)}
      />
      <LibraryScreen
        visible={libraryOpen}
        current={currentLook}
        theme={systemTheme}
        onApply={(look) => {
          applyLook(look);
          setLibraryOpen(false);
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </View>
  );
}

/**
 * The clear-screen toggle in front of the title: the icon's wavy ring as a
 * white outline. Tapping it hides everything but the button; tapping again
 * brings the screen back.
 */
function ClearToggle({
  cleared,
  onPress,
  scale,
}: {
  cleared: boolean;
  onPress: () => void;
  scale: number;
}) {
  const size = CLEAR_ICON_SIZE * scale;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={cleared ? "Show the screen" : "Clear the screen"}
      accessibilityState={{ selected: cleared }}
      style={({ pressed }) => [styles.clearToggle, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Svg width={size} height={size} viewBox={SHAPE_VIEWBOX}>
        <Path
          d={WAVY_PATH}
          fill="none"
          stroke={CLEAR_ICON_SHADOW}
          strokeWidth={CLEAR_ICON_SHADOW_STROKE}
          strokeLinejoin="round"
        />
        <Path
          d={WAVY_PATH}
          fill="none"
          stroke={CLEAR_ICON}
          strokeWidth={CLEAR_ICON_STROKE}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

/**
 * Keeps its children laid out but invisible and untouchable while hidden, so
 * clearing the screen never shifts the button.
 */
function Hidden({
  hidden,
  style,
  children,
}: {
  hidden: boolean;
  style?: object;
  children: ReactNode;
}) {
  return (
    <View
      style={[style, hidden && styles.hidden]}
      pointerEvents={hidden ? "none" : "auto"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
    >
      {children}
    </View>
  );
}

/** The bottom row buttons: always off white, whatever the backdrop. */
function Pill({
  label,
  onPress,
  scale,
}: {
  label: string;
  onPress: () => void;
  scale: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pill,
        {
          opacity: pressed ? 0.7 : 1,
          paddingHorizontal: 14 * scale,
          paddingVertical: 10 * scale,
        },
      ]}
    >
      <Text style={[styles.pillText, { fontSize: 14 * scale }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  clearToggle: { alignItems: "center", justifyContent: "center" },
  hidden: { opacity: 0 },
  brand: heading(24),
  counter: { alignItems: "flex-end" },
  count: { ...heading(36, 0.02), fontVariant: ["tabular-nums"], lineHeight: 40 },
  countLabel: { ...body(12), fontVariant: ["tabular-nums"] },
  middle: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  bannerCount: { ...heading(44), fontVariant: ["tabular-nums"] },
  bannerLabel: { ...bodySemibold(18), marginTop: 2 },
  bannerHint: { ...body(13), marginTop: 4 },
  prompt: { ...body(16), marginBottom: 16, textAlign: "center" },
  capAction: { marginBottom: 16 },
  bottom: { alignItems: "center" },
  toolbar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    backgroundColor: PILL_BACKGROUND,
  },
  pillText: { ...bodySemibold(14), color: PILL_TEXT },
});
