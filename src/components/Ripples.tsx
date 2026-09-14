import React, { useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import type { RippleModeSpec } from "./rippleModes";

/**
 * The look comes from the app icon: a gradient core with a bright rim, three
 * thick wavy neon bands, and a deep navy behind it all. Ripples ignores the
 * color settings and always uses this palette.
 */
export const RIPPLE_PALETTE = {
  backgroundTop: "#12307C",
  backgroundBottom: "#040A26",
  centerGlow: "#2453E6",
  coreCenter: "#2C66FF",
  coreMid: "#5FC4FF",
  coreEdge: "#C9F6FF",
  coreRim: "#EAFEFF",
  timer: "#8FE9FF",
  timerTrack: "rgba(255, 255, 255, 0.14)",
};

/** Core diameter as a fraction of the button size. */
export const RIPPLE_CORE_RATIO = 0.34;
/** The whole figure (outer band plus glow) as a fraction of the button size. */
export const RIPPLE_FIGURE_RATIO = 1.42;

interface RingSpec {
  /** Center-line radius of the band, as a fraction of the button size. */
  radius: number;
  /** Band thickness, as a fraction of the button size. */
  width: number;
  /** Number of waves around the ring and how far they push in and out. */
  waves: number;
  amplitude: number;
  phase: number;
  /** Band colors: inner edge, outer edge, and the glow around it. */
  inner: string;
  outer: string;
  glow: string;
}

const RINGS: RingSpec[] = [
  {
    radius: 0.3,
    width: 0.072,
    waves: 8,
    amplitude: 0.03,
    phase: 0.4,
    inner: "#79D6FF",
    outer: "#E6A9FF",
    glow: "#C08DFF",
  },
  {
    radius: 0.47,
    width: 0.072,
    waves: 9,
    amplitude: 0.032,
    phase: 1.7,
    inner: "#4A9DFF",
    outer: "#8DEDFF",
    glow: "#5CC9FF",
  },
  {
    radius: 0.64,
    width: 0.072,
    waves: 8,
    amplitude: 0.036,
    phase: 2.9,
    inner: "#6C77FF",
    outer: "#BBA4FF",
    glow: "#9088FF",
  },
];

interface Props {
  /** The full button size the figure is proportioned to. */
  size: number;
  /** 0 to 1 over one wave of `mode.duration`. The parent runs it on each reward. */
  pulse: Animated.Value;
  /** The press and reward pop, applied to the core only. */
  coreScale: Animated.Value;
  /** Timing and swell of the wave. */
  mode: RippleModeSpec;
}

/**
 * Three standing wavy bands around a glowing core. At rest it looks like the
 * icon. On each reward a wave of brightness and a slight swell runs outward
 * through the bands, inner to outer, using the pulse timing.
 * Decorative only: the parent's Pressable sits around it.
 */
export function Ripples({ size, pulse, coreScale, mode }: Props) {
  const figure = Math.ceil(size * RIPPLE_FIGURE_RATIO);
  const coreSize = Math.round(size * RIPPLE_CORE_RATIO);
  return (
    <View style={[styles.figure, { width: figure, height: figure }]} pointerEvents="none">
      {RINGS.map((ring, index) => (
        <Band
          key={ring.radius}
          spec={ring}
          index={index}
          size={size}
          pulse={pulse}
          mode={mode}
        />
      ))}
      <Animated.View style={{ transform: [{ scale: coreScale }] }}>
        <Core size={coreSize} />
      </Animated.View>
    </View>
  );
}

function Band({
  spec,
  index,
  size,
  pulse,
  mode,
}: {
  spec: RingSpec;
  index: number;
  size: number;
  pulse: Animated.Value;
  mode: RippleModeSpec;
}) {
  const R = spec.radius * size;
  const w = spec.width * size;
  const glowPad = w * 1.1;
  const box = Math.ceil(2 * (R * (1 + spec.amplitude) + w / 2 + glowPad));
  const c = box / 2;

  const paths = useMemo(() => {
    const wave = (radius: number) =>
      wavyPath(c, c, radius, spec.waves, spec.amplitude * R, spec.phase);
    return {
      center: wave(R),
      innerHalf: wave(R - w / 4),
      outerHalf: wave(R + w / 4),
      rim: wave(R + w / 2 - 1),
    };
  }, [c, R, w, spec.waves, spec.amplitude, spec.phase]);

  const animated = useMemo(() => {
    // Each band runs its own 0 to 1 inside the shared pulse, offset by its stagger.
    const start = Math.min((index * mode.stagger) / mode.duration, 0.98);
    const mid = Math.min(start + 0.28, 0.99);
    const local = pulse.interpolate({
      inputRange: [start, mid, 1],
      outputRange: [0, 0.35, 1],
      extrapolate: "clamp",
    });
    return {
      opacity: local.interpolate({
        inputRange: [0, 0.2, 0.6, 1],
        outputRange: [0.8, 1, 0.92, 0.8],
      }),
      transform: [
        {
          scale: local.interpolate({
            inputRange: [0, 0.45, 1],
            outputRange: [1, mode.swell, 1],
          }),
        },
      ],
    };
  }, [pulse, index, mode.stagger, mode.duration, mode.swell]);

  return (
    <Animated.View style={[styles.layer, { width: box, height: box }, animated]}>
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        {/* Soft glow: wide, faint strokes behind the band. */}
        <Path
          d={paths.center}
          stroke={spec.glow}
          strokeWidth={w + glowPad * 2}
          strokeOpacity={0.14}
          fill="none"
          strokeLinejoin="round"
        />
        <Path
          d={paths.center}
          stroke={spec.glow}
          strokeWidth={w + glowPad}
          strokeOpacity={0.24}
          fill="none"
          strokeLinejoin="round"
        />
        {/* The band itself: darker inner half, lighter outer half. */}
        <Path
          d={paths.innerHalf}
          stroke={spec.inner}
          strokeWidth={w / 2 + 1}
          fill="none"
          strokeLinejoin="round"
        />
        <Path
          d={paths.outerHalf}
          stroke={spec.outer}
          strokeWidth={w / 2 + 1}
          fill="none"
          strokeLinejoin="round"
        />
        {/* Thin bright rim on the outer edge. */}
        <Path
          d={paths.rim}
          stroke="#FFFFFF"
          strokeWidth={1.5}
          strokeOpacity={0.55}
          fill="none"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

function Core({ size }: { size: number }) {
  const glowPad = Math.round(size * 0.36);
  const box = size + glowPad * 2;
  const c = box / 2;
  const r = size / 2;
  return (
    <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
      <Defs>
        <RadialGradient id="rippleCore" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={RIPPLE_PALETTE.coreCenter} />
          <Stop offset="0.62" stopColor={RIPPLE_PALETTE.coreMid} />
          <Stop offset="1" stopColor={RIPPLE_PALETTE.coreEdge} />
        </RadialGradient>
        <RadialGradient id="rippleCoreGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0.55" stopColor={RIPPLE_PALETTE.coreMid} stopOpacity={0.55} />
          <Stop offset="1" stopColor={RIPPLE_PALETTE.coreMid} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={r + glowPad} fill="url(#rippleCoreGlow)" />
      <Circle cx={c} cy={c} r={r} fill="url(#rippleCore)" />
      <Circle
        cx={c}
        cy={c}
        r={r - 1.5}
        stroke={RIPPLE_PALETTE.coreRim}
        strokeWidth={2.5}
        fill="none"
      />
    </Svg>
  );
}

/**
 * A closed path around (cx, cy) whose radius rises and falls `waves` times:
 * r = radius + amplitude * sin(waves * angle + phase). Enough points that the
 * stroke reads as a smooth curve.
 */
function wavyPath(
  cx: number,
  cy: number,
  radius: number,
  waves: number,
  amplitude: number,
  phase: number,
): string {
  const steps = 144;
  const parts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(waves * a + phase);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `${parts.join(" ")} Z`;
}

const styles = StyleSheet.create({
  figure: {
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    position: "absolute",
  },
});
