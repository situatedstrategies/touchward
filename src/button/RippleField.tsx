import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { lighten } from "../design/palette";
import type { Shape } from "../types";
import type { RippleModeSpec } from "./rewardModes";
import { GLOW_BOX_RATIO, GLOW_VIEWBOX, ripplePath, type RippleShape } from "./shapes";

/** One ripple in flight. `id` is unique per emission; `color` is the band color. */
export interface ActiveRipple {
  id: number;
  color: string;
  mode: RippleModeSpec;
}

interface Props {
  shape: Shape;
  rippleShape: RippleShape;
  /** Diameter of the core the ripples start from. */
  size: number;
  ripples: ActiveRipple[];
  onDone: (id: number) => void;
}

/**
 * Ripples radiating out from the core. Each one is an outline of the chosen
 * ripple shape that starts at the core's edge, swells outward to `mode.spread`
 * times the core, and fades. One tap emits one ripple (or a short burst, for
 * the Double and Wave modes), so the multicolor look builds tap by tap.
 * Decorative: never takes touches.
 */
export function RippleField({ shape, rippleShape, size, ripples, onDone }: Props) {
  const box = Math.ceil(size * GLOW_BOX_RATIO);
  const d = useMemo(() => ripplePath(shape, rippleShape), [shape, rippleShape]);
  return (
    <View style={[styles.field, { width: box, height: box }]} pointerEvents="none">
      {ripples.map((r) => (
        <Ripple key={r.id} ripple={r} box={box} d={d} onDone={onDone} />
      ))}
    </View>
  );
}

function Ripple({
  ripple,
  box,
  d,
  onDone,
}: {
  ripple: ActiveRipple;
  box: number;
  d: string;
  onDone: (id: number) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const { mode, color, id } = ripple;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: mode.duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone(id);
    });
    return () => anim.stop();
  }, [progress, mode.duration, id, onDone]);

  const style = useMemo(
    () => ({
      opacity: progress.interpolate({
        inputRange: [0, 0.12, 0.6, 1],
        outputRange: [0, 0.95, 0.55, 0],
      }),
      transform: [
        {
          // Start just outside the core's edge and travel out.
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1.04, mode.spread],
          }),
        },
      ],
    }),
    [progress, mode.spread],
  );

  const inner = color;
  const outer = lighten(color, 0.45);
  const w = mode.width;

  return (
    <Animated.View style={[styles.ripple, { width: box, height: box }, style]}>
      <Svg width={box} height={box} viewBox={GLOW_VIEWBOX}>
        {/* Soft halo behind the band. */}
        <Path d={d} fill="none" stroke={inner} strokeOpacity={0.22} strokeWidth={w * 2.4} />
        {/* Two tone band: deeper inside, paler outside. */}
        <Path d={d} fill="none" stroke={inner} strokeWidth={w} />
        <Path d={d} fill="none" stroke={outer} strokeWidth={w * 0.5} strokeOpacity={0.9} />
        {/* Bright hairline on the outer edge. */}
        <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  field: { alignItems: "center", justifyContent: "center" },
  ripple: { position: "absolute" },
});
