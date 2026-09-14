import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
} from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { playReward, stopHaptics, tick } from "../haptics/engine";
import { getPattern } from "../haptics/patterns";
import { colorVariants, lighten, withAlpha } from "../design/palette";
import type { Settings } from "../types";
import { RippleField, type ActiveRipple } from "./RippleField";
import { REWARD_MODE_SPECS } from "./rewardModes";
import { ShapeCore } from "./ShapeCore";
import { StandingBands } from "./StandingBands";
import { TimerRing } from "./TimerRing";

/** Presses shorter than this count as a tap in "both" mode. */
const TAP_THRESHOLD_MS = 250;
/** How long a color stays before snapping back when returnToIdle is on. */
const RETURN_DELAY_MS = 900;
/** Ripples still travelling at once. Older ones are dropped first. */
const MAX_RIPPLES = 12;
/** In the Original mode the core is smaller so its three rings have room. */
const BANDS_CORE_RATIO = 0.4;

/** Lets the screen trigger a reward from outside: a deep link, a notification, a side button. */
export interface RewardButtonHandle {
  reward: (kind: "tap" | "hold") => void;
}

interface Props {
  settings: Settings;
  size: number;
  onReward: (kind: "tap" | "hold") => void;
  ref?: Ref<RewardButtonHandle>;
}

/**
 * The button. Every shape gets the same treatment: a glowing core that changes
 * color on each reward, ripples in that shape (or the wavy or round outline)
 * radiating outward in the ripple colors, and in Original mode three standing
 * rings that a wave rolls through. The reward mode sets how the ripples move
 * and what the tap feels like.
 */
export function RewardButton({ settings, size, onReward, ref }: Props) {
  const {
    mode,
    shape,
    holdPattern,
    holdSeconds,
    idleColor,
    tapColors,
    rippleColors,
    rippleFollowButton,
    rippleShape,
  } = settings;
  const rewardMode = REWARD_MODE_SPECS[settings.rewardMode] ?? REWARD_MODE_SPECS.original;
  const bands = rewardMode.kind === "bands";

  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const colorMix = useRef(new Animated.Value(1)).current;
  // 0 to 1 over one wave through the standing bands (Original mode).
  const pulse = useRef(new Animated.Value(0)).current;

  const [fromColor, setFromColor] = useState(idleColor);
  const [toColor, setToColor] = useState(idleColor);
  // Mirrors toColor so timers and animation callbacks never read a stale value.
  const currentColor = useRef(idleColor);
  const colorIndex = useRef(-1);
  const rippleColorIndex = useRef(-1);
  const pressedAt = useRef(0);
  const holdDone = useRef(false);
  const ringAnim = useRef<Animated.CompositeAnimation | null>(null);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [holding, setHolding] = useState(false);

  // Ripples in flight. Each removes itself when its animation finishes.
  const [ripples, setRipples] = useState<ActiveRipple[]>([]);
  const nextRippleId = useRef(1);
  const removeRipple = useCallback((id: number) => {
    setRipples((list) => list.filter((r) => r.id !== id));
  }, []);

  // If the idle color changes in settings, show it right away.
  useEffect(() => {
    setFromColor(idleColor);
    setToColor(idleColor);
    currentColor.current = idleColor;
    colorMix.setValue(1);
    colorIndex.current = -1;
  }, [idleColor, colorMix]);

  useEffect(
    () => () => {
      if (returnTimer.current) clearTimeout(returnTimer.current);
      for (const t of burstTimers.current) clearTimeout(t);
      burstTimers.current.clear();
      stopHaptics();
    },
    [],
  );

  const animateTo = useCallback(
    (next: string, duration = 220) => {
      setFromColor(currentColor.current);
      setToColor(next);
      currentColor.current = next;
      colorMix.setValue(0);
      Animated.timing(colorMix, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    },
    [colorMix],
  );

  /** Next entry of a color list, in order or shuffled, never repeating the last pick. */
  const pickNext = useCallback(
    (list: string[], index: MutableRefObject<number>): string | null => {
      if (list.length === 0) return null;
      if (settings.randomColors) {
        if (list.length === 1) return list[0];
        let i = Math.floor(Math.random() * list.length);
        if (i === index.current) i = (i + 1) % list.length;
        index.current = i;
        return list[i];
      }
      index.current = (index.current + 1) % list.length;
      return list[index.current];
    },
    [settings.randomColors],
  );

  const pop = useCallback(
    (amount: number) => {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: amount,
          speed: 40,
          bounciness: 12,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 20,
          bounciness: 10,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [scale],
  );

  /**
   * Every reward sends ripples out: one per tap, or a short burst in the Double
   * and Wave modes. In Original mode a wave also rolls through the standing
   * rings. Ripples take Color 1, 2, 3 in turn; when they follow the button, or
   * all three slots hold the same color, a burst uses tints of that one color.
   */
  const emitRipples = useCallback(
    (kind: "tap" | "hold", buttonColor: string) => {
      if (bands) {
        pulse.stopAnimation();
        pulse.setValue(0);
        Animated.timing(pulse, {
          toValue: 1,
          duration: rewardMode.duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
      const spec =
        kind === "hold" ? { ...rewardMode, spread: rewardMode.spread * 1.25 } : rewardMode;
      const palette = rippleFollowButton ? [] : rippleColors;
      const single = palette.length === 0 || palette.every((c) => c === palette[0]);
      const first = single
        ? (palette[0] ?? buttonColor)
        : (pickNext(palette, rippleColorIndex) ?? buttonColor);
      const tints = single ? colorVariants(first, Math.max(spec.count, 1)) : [];
      const colorAt = (i: number) =>
        i === 0 ? first : single ? tints[i] : (pickNext(palette, rippleColorIndex) ?? first);
      const push = (i: number) => {
        const color = colorAt(i);
        setRipples((list) => {
          const next = [...list, { id: nextRippleId.current++, color, mode: spec }];
          return next.length > MAX_RIPPLES ? next.slice(next.length - MAX_RIPPLES) : next;
        });
      };
      push(0);
      for (let i = 1; i < spec.count; i++) {
        const timer = setTimeout(() => {
          burstTimers.current.delete(timer);
          push(i);
        }, i * spec.gap);
        burstTimers.current.add(timer);
      }
    },
    [bands, pulse, pickNext, rippleColors, rippleFollowButton, rewardMode],
  );

  // The three standing rings: Color 1, 2, 3, or tints of one color.
  const bandColors = useMemo(() => {
    if (rippleFollowButton) return colorVariants(toColor, 3);
    const same = rippleColors.every((c) => c === rippleColors[0]);
    return same ? colorVariants(rippleColors[0] ?? toColor, 3) : rippleColors;
  }, [rippleColors, rippleFollowButton, toColor]);

  const reward = useCallback(
    (kind: "tap" | "hold") => {
      // Taps follow the reward mode (Pulsar pattern, else built in pulses); a chosen
      // Pulsar preset wins. Holds play their own pattern or preset.
      if (kind === "hold") {
        playReward({ preset: settings.holdPreset, pulses: getPattern(holdPattern).pulses });
      } else {
        playReward({
          preset: settings.tapPreset,
          pattern: rewardMode.pulsar,
          strength: settings.hapticStrength,
          pulses: rewardMode.pulses,
        });
      }
      const next = pickNext(tapColors, colorIndex) ?? idleColor;
      animateTo(next, kind === "hold" ? 400 : 220);
      pop(kind === "hold" ? 1.14 : 1.08);
      emitRipples(kind, next);
      onReward(kind);

      if (returnTimer.current) clearTimeout(returnTimer.current);
      if (settings.returnToIdle) {
        returnTimer.current = setTimeout(() => {
          animateTo(idleColor, 500);
        }, RETURN_DELAY_MS);
      }
    },
    [
      holdPattern,
      animateTo,
      pickNext,
      tapColors,
      pop,
      emitRipples,
      rewardMode,
      onReward,
      settings.returnToIdle,
      settings.tapPreset,
      settings.holdPreset,
      settings.hapticStrength,
      idleColor,
    ],
  );

  useImperativeHandle(ref, () => ({ reward }), [reward]);

  const drainRing = useCallback(
    (duration: number) => {
      ringAnim.current?.stop();
      ringAnim.current = Animated.timing(ring, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      ringAnim.current.start();
    },
    [ring],
  );

  const handlePressIn = useCallback(() => {
    pressedAt.current = Date.now();
    holdDone.current = false;
    Animated.spring(scale, {
      toValue: 0.94,
      speed: 30,
      bounciness: 4,
      useNativeDriver: true,
    }).start();

    if (mode === "tap") return;

    setHolding(true);
    ringAnim.current?.stop();
    ring.setValue(0);
    ringAnim.current = Animated.timing(ring, {
      toValue: 1,
      duration: holdSeconds * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    ringAnim.current.start(({ finished }) => {
      if (!finished) return;
      holdDone.current = true;
      setHolding(false);
      reward("hold");
      // Let the full ring sit for a beat, then drain.
      setTimeout(() => drainRing(700), 600);
    });
  }, [mode, holdSeconds, ring, scale, reward, drainRing]);

  const handlePressOut = useCallback(() => {
    const held = Date.now() - pressedAt.current;
    Animated.spring(scale, {
      toValue: 1,
      speed: 30,
      bounciness: 8,
      useNativeDriver: true,
    }).start();

    if (mode === "tap") {
      reward("tap");
      return;
    }

    if (holdDone.current) return; // Timer already paid out.

    setHolding(false);
    if (mode === "both" && held < TAP_THRESHOLD_MS) {
      ringAnim.current?.stop();
      ring.setValue(0);
      reward("tap");
      return;
    }

    // Let go early: nothing earned, ring slides back.
    tick();
    drainRing(250);
  }, [mode, ring, scale, reward, drainRing]);

  const fill = useMemo(
    () =>
      colorMix.interpolate({
        inputRange: [0, 1],
        outputRange: [fromColor, toColor],
      }),
    [colorMix, fromColor, toColor],
  );

  // The layout box is the timer ring; ripples and bands overflow it on purpose
  // so they never push the screen around. Original mode shrinks the core to
  // leave room for its rings.
  const coreSize = bands ? Math.round(size * BANDS_CORE_RATIO) : size;
  const ringSize = coreSize + 36;
  const showRing = mode !== "tap";

  return (
    <View style={[styles.wrap, { width: ringSize, height: ringSize }]}>
      <View style={styles.layer} pointerEvents="none">
        {bands ? (
          <StandingBands
            shape={shape}
            rippleShape={rippleShape}
            size={coreSize}
            pulse={pulse}
            colors={bandColors}
            mode={rewardMode}
          />
        ) : (
          <RippleField
            shape={shape}
            rippleShape={rippleShape}
            size={coreSize}
            ripples={ripples}
            onDone={removeRipple}
          />
        )}
      </View>
      {showRing && (
        <View style={styles.layer} pointerEvents="none">
          <TimerRing
            shape={shape}
            size={ringSize}
            strokeWidth={8}
            progress={ring}
            color={lighten(toColor, 0.45)}
            trackColor={withAlpha(toColor, 0.2)}
          />
        </View>
      )}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={
          mode === "tap" ? "Reward button" : "Reward button, hold to run the timer"
        }
        accessibilityState={{ busy: holding }}
        hitSlop={12}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <ShapeCore shape={shape} size={coreSize} fill={fill} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
