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
import { flushCrashReports, installCrashReporting } from "./src/support/crashReports";
// Defines the background calendar sync task; it must be registered at module scope.
import "./src/notifications/calendarTask";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LooksProvider } from "./src/store/looks";
import { SettingsProvider } from "./src/store/settings";

// Catch unhandled errors from the very start.
installCrashReporting();

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

  // Anything queued by a crash in an earlier run goes out once the app is up.
  useEffect(() => {
    if (ready) flushCrashReports().catch(() => {});
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
        <LooksProvider>
          <HomeScreen />
          <StatusBar style="auto" />
        </LooksProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
