import { ActionSheetIOS, Alert, Platform, Pressable } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useGate, useUnlock } from "../store/unlock";
import { MUSIC_APPS, openMusicApp } from "./musicApps";

const ICON_SIZE = 22;

function chooseMusicApp(): void {
  const labels = MUSIC_APPS.map((a) => a.label);
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "Play music alongside Touchward",
        options: [...labels, "Cancel"],
        cancelButtonIndex: labels.length,
      },
      (index) => {
        const app = MUSIC_APPS[index];
        if (app) void openMusicApp(app);
      },
    );
    return;
  }
  Alert.alert("Play music alongside Touchward", undefined, [
    ...MUSIC_APPS.map((app) => ({ text: app.label, onPress: () => void openMusicApp(app) })),
    { text: "Cancel", style: "cancel" as const },
  ]);
}

/**
 * A note on the home screen that opens Apple Music or Spotify. Part of the
 * unlock, like playing other music alongside Touchward at all: in the free app
 * the note is dimmed and a tap shows the paywall first, then the choice.
 */
export function MusicAppsButton({ scale, color }: { scale: number; color: string }) {
  const { unlocked } = useUnlock();
  const gate = useGate();
  const size = ICON_SIZE * scale;
  return (
    <Pressable
      onPress={() => gate(false, chooseMusicApp)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={
        unlocked ? "Open Apple Music or Spotify" : "Open Apple Music or Spotify (unlock)"
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : unlocked ? 1 : 0.55 })}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Two beamed eighth notes */}
        <Path
          d="M9 17.5V6.5l10-2v11"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={6.5} cy={17.5} r={2.5} fill="none" stroke={color} strokeWidth={1.8} />
        <Circle cx={16.5} cy={15.5} r={2.5} fill="none" stroke={color} strokeWidth={1.8} />
      </Svg>
    </Pressable>
  );
}
