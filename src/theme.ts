import { useColorScheme } from "react-native";
import { isDarkColor } from "./palette";

export interface Theme {
  dark: boolean;
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  ringTrack: string;
}

const light: Theme = {
  dark: false,
  background: "#F4F4F5",
  surface: "#FFFFFF",
  border: "#D4D4D8",
  text: "#18181B",
  muted: "#52525B",
  accent: "#C41200",
  ringTrack: "#E4E4E7",
};

const dark: Theme = {
  dark: true,
  background: "#0B0B0F",
  surface: "#18181B",
  border: "#3F3F46",
  text: "#F4F4F5",
  muted: "#A1A1AA",
  accent: "#FF4D3D",
  ringTrack: "#27272A",
};

/** Used on the home screen while the ripples shape is selected: the icon's deep navy. */
export const RIPPLE_THEME: Theme = {
  dark: true,
  background: "#081B4E",
  surface: "#12276A",
  border: "#2C4699",
  text: "#F1F6FF",
  muted: "#A9B8E6",
  accent: "#8FE9FF",
  ringTrack: "rgba(255, 255, 255, 0.14)",
};

/**
 * The theme to draw the home screen with for a backdrop setting: the navy
 * theme for "navy", the phone's theme for "system", and for a solid color a
 * dark or light theme with that color as the ground.
 */
export function themeForBackdrop(backdrop: string, system: Theme): Theme {
  if (backdrop === "navy") return RIPPLE_THEME;
  if (backdrop === "system" || !backdrop.startsWith("#")) return system;
  if (isDarkColor(backdrop)) {
    return {
      ...dark,
      background: backdrop,
      surface: "rgba(255, 255, 255, 0.10)",
      border: "rgba(255, 255, 255, 0.28)",
      ringTrack: "rgba(255, 255, 255, 0.16)",
    };
  }
  return {
    ...light,
    background: backdrop,
    surface: "rgba(255, 255, 255, 0.55)",
    border: "rgba(0, 0, 0, 0.18)",
    ringTrack: "rgba(0, 0, 0, 0.10)",
  };
}

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
