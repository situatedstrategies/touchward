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
