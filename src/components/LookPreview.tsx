import { useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { REWARD_MODE_SPECS } from "../button/rewardModes";
import { ShapeCore } from "../button/ShapeCore";
import { GLOW_BOX_RATIO, GLOW_VIEWBOX, ripplePath } from "../button/shapes";
import { NEON, colorVariants, isHexColor, lighten } from "../design/palette";
import type { LookSettings } from "../looks/looks";

interface Props {
  look: LookSettings;
  /** Edge of the square preview. */
  size: number;
}

/**
 * A still of a look: its backdrop, the button in its resting color, and either
 * the three Original rings or one ripple mid flight in the first ripple color.
 */
export function LookPreview({ look, size }: Props) {
  const spec = REWARD_MODE_SPECS[look.rewardMode] ?? REWARD_MODE_SPECS.original;
  const bands = spec.kind === "bands";
  const core = Math.round(size * (bands ? 0.24 : 0.42));
  const box = Math.ceil(core * GLOW_BOX_RATIO);
  const fill = useMemo(() => {
    const v = new Animated.Value(1);
    return v.interpolate({ inputRange: [0, 1], outputRange: [look.idleColor, look.idleColor] });
  }, [look.idleColor]);
  const outline = ripplePath(look.shape, look.rippleShape);
  const rippleColors = look.rippleFollowButton
    ? colorVariants(look.idleColor, 3)
    : look.rippleColors.every((c) => c === look.rippleColors[0])
      ? colorVariants(look.rippleColors[0], 3)
      : look.rippleColors;
  const background =
    look.backdrop === "navy"
      ? NEON.backgroundTop
      : isHexColor(look.backdrop)
        ? look.backdrop
        : "#0B0B0F";

  const ring = (scale: number, color: string, width: number, key: string, opacity = 1) => {
    const b = box * scale;
    return (
      <View key={key} style={[styles.layer, { width: b, height: b, opacity }]}>
        <Svg width={b} height={b} viewBox={GLOW_VIEWBOX}>
          <Path
            d={outline}
            fill="none"
            stroke={color}
            strokeOpacity={0.2}
            strokeWidth={width * 2.4}
          />
          <Path d={outline} fill="none" stroke={color} strokeWidth={width} />
          <Path
            d={outline}
            fill="none"
            stroke={lighten(color, 0.5)}
            strokeWidth={width * 0.5}
          />
        </Svg>
      </View>
    );
  };

  return (
    <View style={[styles.frame, { width: size, height: size, backgroundColor: background }]}>
      {bands
        ? [1.7 / 0.9, 2.4 / 0.9, 3.2 / 0.9].map((s, i) =>
            ring(s, rippleColors[i], (spec.bandWidth ?? 18) / s, `band${i}`, 0.9),
          )
        : ring(1.75, rippleColors[0], spec.width, "ripple", 0.85)}
      <ShapeCore shape={look.shape} size={core} fill={fill} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  layer: { position: "absolute" },
});
