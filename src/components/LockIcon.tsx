import Svg, { Path, Rect } from "react-native-svg";

/** A small padlock, drawn in the given color, for options that need the unlock. */
export function LockIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessibilityLabel="Locked">
      <Path
        d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5"
        stroke={color}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
      <Rect x={2.2} y={5.5} width={7.6} height={5.3} rx={1.4} fill={color} />
    </Svg>
  );
}
