import { JosefinSans_600SemiBold } from "@expo-google-fonts/josefin-sans";
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
} from "@expo-google-fonts/nunito-sans";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { isPulsarAvailable, pulsarSupportLevel } from "./src/haptics/pulsar";
// Defines the background calendar sync task; it must be registered at module scope.
import "./src/notifications/calendarTask";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SettingsProvider } from "./src/store/settings";

// Keep the splash screen up until the fonts are loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    JosefinSans_600SemiBold,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Reports which haptics engine this build has, in development only.
  useEffect(() => {
    if (__DEV__) {
      console.log(
        `[haptics] pulsar ${isPulsarAvailable() ? `available, support level ${pulsarSupportLevel()}` : "not linked, using expo-haptics"}`,
      );
    }
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <HomeScreen />
        <StatusBar style="auto" />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
