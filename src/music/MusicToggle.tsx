import { Pressable } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { useSettings } from "../store/settings";
import { useGate, useUnlock } from "../store/unlock";
import { isMusicAvailable } from "./player";

const ICON_SIZE = 22;

/**
 * A speaker on the home screen that turns the music on and off without
 * opening Customize. Music is part of the unlock, so turning it on in the
 * free app shows the paywall first, like the switch in the Sound section.
 * Builds without the audio module do not show it.
 */
export function MusicToggle({ scale, color }: { scale: number; color: string }) {
  const { settings, update } = useSettings();
  const { unlocked } = useUnlock();
  const gate = useGate();
  if (!isMusicAvailable()) return null;
  const on = settings.music.enabled && unlocked;
  const size = ICON_SIZE * scale;
  const toggle = () =>
    gate(on, () => update({ music: { ...settings.music, enabled: !settings.music.enabled } }));

  return (
    <Pressable
      onPress={toggle}
      hitSlop={12}
      accessibilityRole="switch"
      accessibilityLabel={on ? "Turn music off" : "Turn music on"}
      accessibilityState={{ checked: on }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : on ? 1 : 0.55 })}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Speaker body and cone */}
        <Path
          d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"
          fill={on ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        {on ? (
          <>
            <Path
              d="M15.5 9.2a4 4 0 0 1 0 5.6"
              fill="none"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Path
              d="M18.2 6.8a7.5 7.5 0 0 1 0 10.4"
              fill="none"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </>
        ) : (
          <Line
            x1={15}
            y1={9}
            x2={20}
            y2={15}
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        )}
      </Svg>
    </Pressable>
  );
}
