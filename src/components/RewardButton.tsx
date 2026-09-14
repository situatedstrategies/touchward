import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { playReward, stopHaptics, tick } from "../haptics/engine";
import { getPattern } from "../haptics/patterns";
import type { Settings } from "../types";
import { RIPPLE_MODES } from "./rippleModes";
import { RIPPLE_CORE_RATIO, RIPPLE_FIGURE_RATIO, RIPPLE_PALETTE, Ripples } from "./Ripples";
import { SHAPE_PATHS, SHAPE_VIEWBOX } from "./shapes";
import { TimerRing } from "./TimerRing";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Presses shorter than this count as a tap in "both" mode. */
const TAP_THRESHOLD_MS = 250;
/** How long a color stays before snapping back when returnToIdle is on. */
const RETURN_DELAY_MS = 900;

/** Lets the screen trigger a reward from outside: a deep link, a notification, a side button. */
export interface RewardButtonHandle {
  reward: (kind: "tap" | "hold") => void;
}

interface Props {
  settings: Settings;
  size: number;
  ringTrackColor: string;
  onReward: (kind: "tap" | "hold") => void;
  ref?: React.Ref<RewardButtonHandle>;
}

export function RewardButton({ settings, size, ringTrackColor, onReward, ref }: Props) {
  const { mode, shape, tapPattern, holdPattern, holdSeconds, idleColor, tapColors } = settings;
  const isRipples = shape === "ripples";
  const rippleMode = RIPPLE_MODES[settings.rewardMode] ?? RIPPLE_MODES.pulse;

  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const colorMix = useRef(new Animated.Value(1)).current;
  // 0 to 1 across one ripple wave; run on every reward. Only drawn for the ripples shape.
  const pulse = useRef(new Animated.Value(0)).current;

  const [fromColor, setFromColor] = useState(idleColor);
  const [toColor, setToColor] = useState(idleColor);
  // Mirrors toColor so timers and animation callbacks never read a stale value.
  const currentColor = useRef(idleColor);
  const colorIndex = useRef(-1);
  const pressedAt = useRef(0);
  const holdDone = useRef(false);
  const ringAnim = useRef<Animated.CompositeAnimation | null>(null);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

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

  const nextColor = useCallback((): string => {
    if (tapColors.length === 0) return idleColor;
    if (settings.randomColors) {
      if (tapColors.length === 1) return tapColors[0];
      let i = Math.floor(Math.random() * tapColors.length);
      if (i === colorIndex.current) i = (i + 1) % tapColors.length;
      colorIndex.current = i;
      return tapColors[i];
    }
    colorIndex.current = (colorIndex.current + 1) % tapColors.length;
    return tapColors[colorIndex.current];
  }, [tapColors, idleColor, settings.randomColors]);

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

  const ripple = useCallback(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    // One wave per repeat, each a fresh 0 to 1 run (both ends are the resting look).
    const steps: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < rippleMode.repeats; i++) {
      steps.push(
        Animated.timing(pulse, {
          toValue: 1,
          duration: rippleMode.duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      );
    }
    Animated.sequence(steps).start();
  }, [pulse, rippleMode]);

  const reward = useCallback(
    (kind: "tap" | "hold") => {
      // A Pulsar preset from settings wins. Otherwise ripples taps follow the
      // reward mode, everything else plays its named pattern. Holds keep their own.
      if (kind === "hold") {
        playReward({ preset: settings.holdPreset, pulses: getPattern(holdPattern).pulses });
      } else if (isRipples) {
        playReward({
          preset: settings.tapPreset,
          pattern: rippleMode.pulsar,
          strength: settings.hapticStrength,
          pulses: rippleMode.pulses,
        });
      } else {
        playReward({ preset: settings.tapPreset, pulses: getPattern(tapPattern).pulses });
      }
      animateTo(nextColor(), kind === "hold" ? 400 : 220);
      pop(kind === "hold" ? 1.14 : 1.08);
      if (isRipples) ripple();
      onReward(kind);

      if (returnTimer.current) clearTimeout(returnTimer.current);
      if (settings.returnToIdle) {
        returnTimer.current = setTimeout(() => {
          animateTo(idleColor, 500);
        }, RETURN_DELAY_MS);
      }
    },
    [
      tapPattern,
      holdPattern,
      animateTo,
      nextColor,
      pop,
      isRipples,
      rippleMode,
      ripple,
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

  // Ripples: the whole figure is the tap target and the hold timer hugs the core,
  // in the gap before the first band. Other shapes: the timer wraps the shape.
  const coreSize = isRipples ? Math.round(size * RIPPLE_CORE_RATIO) : size;
  const ringSize = isRipples ? coreSize + 28 : size + 36;
  const wrapSize = isRipples ? Math.ceil(size * RIPPLE_FIGURE_RATIO) : ringSize;
  const showRing = mode !== "tap";

  const timerLayer = showRing && (
    <View style={styles.layer} pointerEvents="none">
      <TimerRing
        size={ringSize}
        strokeWidth={8}
        progress={ring}
        color={isRipples ? RIPPLE_PALETTE.timer : toColor}
        trackColor={isRipples ? RIPPLE_PALETTE.timerTrack : ringTrackColor}
      />
    </View>
  );

  return (
    <View style={[styles.wrap, { width: wrapSize, height: wrapSize }]}>
      {!isRipples && timerLayer}
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
        {isRipples ? (
          <Ripples size={size} pulse={pulse} coreScale={scale} mode={rippleMode} />
        ) : (
          <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
            <Svg width={size} height={size} viewBox={SHAPE_VIEWBOX}>
              <AnimatedPath d={SHAPE_PATHS[shape]} fill={fill} />
            </Svg>
          </Animated.View>
        )}
      </Pressable>
      {isRipples && timerLayer}
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
