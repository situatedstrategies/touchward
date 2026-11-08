import { ActionSheetIOS, Alert, Platform, Pressable } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { MUSIC_APPS, MUSIC_APP_NAMES, openMusicApp } from "./musicApps";

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
 * A note on the home screen that opens the music apps for the platform. Free
 * for everyone, like playing other music alongside Touchward.
 */
export function MusicAppsButton({ scale, color }: { scale: number; color: string }) {
  const size = ICON_SIZE * scale;
  return (
    <Pressable
      onPress={chooseMusicApp}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={`Open ${MUSIC_APP_NAMES}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
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
