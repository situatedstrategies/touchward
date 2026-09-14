import { Animated } from "react-native";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";
import type { Shape } from "../types";
import { GLOW_BOX_RATIO, GLOW_VIEWBOX, SHAPE_PATHS, scaleAboutCenter } from "./shapes";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  shape: Shape;
  /** Diameter of the shape itself; the drawn box is larger to fit the glow. */
  size: number;
  /** Animated color (JS driver) for the fill and the glow. */
  fill: Animated.AnimatedInterpolation<string | number>;
}

/**
 * The button itself, in any shape: a soft glow behind it, the animated color
 * fill, a lighter edge (the icon's core is deep in the middle and pale at the
 * rim), and a thin bright rim. Each layer is the same path so every shape gets
 * the same treatment.
 */
export function ShapeCore({ shape, size, fill }: Props) {
  const box = Math.ceil(size * GLOW_BOX_RATIO);
  const d = SHAPE_PATHS[shape];
  return (
    <Svg width={box} height={box} viewBox={GLOW_VIEWBOX}>
      <Defs>
        <RadialGradient id="coreEdgeLight" cx="50%" cy="50%" r="50%">
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.5} />
        </RadialGradient>
      </Defs>
      {/* Glow: two enlarged, faint copies. */}
      <AnimatedPath d={d} fill={fill} opacity={0.12} transform={scaleAboutCenter(1.28)} />
      <AnimatedPath d={d} fill={fill} opacity={0.26} transform={scaleAboutCenter(1.13)} />
      {/* The shape. */}
      <AnimatedPath d={d} fill={fill} />
      {/* Pale edge and bright rim. */}
      <Path d={d} fill="url(#coreEdgeLight)" />
      <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2.2} />
    </Svg>
  );
}
