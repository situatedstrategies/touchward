import React from "react";
import { Animated } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Shape } from "../types";
import { SHAPE_LENGTHS, SHAPE_PATHS, SHAPE_VIEWBOX } from "./shapes";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  /** The outline to trace: the same shape as the button, drawn a step larger. */
  shape: Shape;
  size: number;
  strokeWidth: number;
  /** 0 to 1. */
  progress: Animated.Value;
  color: string;
  trackColor: string;
}

/**
 * The hold timer: the button's own outline, filling clockwise from 12 o'clock
 * as you hold. Driven by an Animated.Value so the parent controls timing.
 */
export function TimerRing({ shape, size, strokeWidth, progress, color, trackColor }: Props) {
  const d = SHAPE_PATHS[shape];
  const total = SHAPE_LENGTHS[shape];
  // Stroke width is given in pixels; the path lives in a 100 unit box.
  const w = (strokeWidth * 100) / size;
  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [total, 0],
    extrapolate: "clamp",
  });

  return (
    <Svg width={size} height={size} viewBox={SHAPE_VIEWBOX}>
      <Path d={d} stroke={trackColor} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${total} ${total}`}
        strokeDashoffset={dashOffset}
      />
    </Svg>
  );
}
