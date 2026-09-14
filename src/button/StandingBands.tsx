import { useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { lighten } from "../design/palette";
import type { Shape } from "../types";
import type { RippleModeSpec } from "./rewardModes";
import { GLOW_BOX_RATIO, GLOW_VIEWBOX, ripplePath, type RippleShape } from "./shapes";

/** Band scale relative to the core box, inner to outer, and when its part of the wave starts. */
const BANDS = [
  { scale: 1.45, start: 0 },
  { scale: 1.95, start: 0.1 },
  { scale: 2.45, start: 0.2 },
];

interface Props {
  shape: Shape;
  rippleShape: RippleShape;
  /** Diameter of the core the bands sit around. */
  size: number;
  /** 0 to 1 over one wave; the parent runs it on each reward. */
  pulse: Animated.Value;
  /** One color per band, inner to outer. */
  colors: string[];
  mode: RippleModeSpec;
}

/**
 * The original look: three standing outlines around the core, in the ripple
 * outline and the ripple colors. At rest they glow softly. On each reward a
 * wave of brightness and a slight swell runs outward through them.
 */
export function StandingBands({ shape, rippleShape, size, pulse, colors, mode }: Props) {
  const box = Math.ceil(size * GLOW_BOX_RATIO);
  const d = useMemo(() => ripplePath(shape, rippleShape), [shape, rippleShape]);
  return (
    <View style={[styles.field, { width: box, height: box }]} pointerEvents="none">
      {BANDS.map((band, i) => (
        <Band
          key={band.scale}
          box={box}
          d={d}
          scale={band.scale}
          start={band.start}
          color={colors[i % colors.length]}
          pulse={pulse}
          mode={mode}
        />
      ))}
    </View>
  );
}

function Band({
  box,
  d,
  scale,
  start,
  color,
  pulse,
  mode,
}: {
  box: number;
  d: string;
  scale: number;
  start: number;
  color: string;
  pulse: Animated.Value;
  mode: RippleModeSpec;
}) {
  const style = useMemo(() => {
    // Each band runs its own 0 to 1 inside the shared pulse, offset by its start.
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
            outputRange: [scale, scale * (mode.swell ?? 1.07), scale],
          }),
        },
      ],
    };
  }, [pulse, start, scale, mode.swell]);

  const w = mode.width / scale; // Keep the drawn band about the same thickness at every ring.
  return (
    <Animated.View style={[styles.band, { width: box, height: box }, style]}>
      <Svg width={box} height={box} viewBox={GLOW_VIEWBOX}>
        <Path d={d} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={w * 2.6} />
        <Path d={d} fill="none" stroke={color} strokeWidth={w} />
        <Path
          d={d}
          fill="none"
          stroke={lighten(color, 0.45)}
          strokeWidth={w * 0.5}
          strokeOpacity={0.9}
        />
        <Path
          d={d}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.5}
          strokeWidth={0.7 / scale}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  field: { alignItems: "center", justifyContent: "center" },
  band: { position: "absolute" },
});
