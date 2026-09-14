import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { NEON } from "../design/palette";

/** The icon's ground: a top to bottom navy fade with a soft blue glow behind the button. */
export function NavyBackdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="navy" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={NEON.backgroundTop} />
          <Stop offset="1" stopColor={NEON.backgroundBottom} />
        </LinearGradient>
        <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={NEON.centerGlow} stopOpacity={0.45} />
          <Stop offset="1" stopColor={NEON.centerGlow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#navy)" />
      <Circle cx="50%" cy="48%" r="42%" fill="url(#centerGlow)" />
    </Svg>
  );
}
