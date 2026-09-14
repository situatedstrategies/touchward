import { JosefinSans_600SemiBold } from "@expo-google-fonts/josefin-sans";
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
} from "@expo-google-fonts/nunito-sans";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { isPulsarAvailable, pulsarSupportLevel } from "./src/haptics/pulsar";
// Side effect import: defines the background calendar sync task at module scope.
import "./src/notifications/calendarTask";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SettingsProvider } from "./src/store/settings";

// Hold the splash screen until the fonts are in, so text never flashes in a fallback face.
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

  // One line in the dev server log that says which haptics engine this build has.
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
