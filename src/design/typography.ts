import { Platform, type TextStyle } from "react-native";

/**
 * Type system: Josefin Sans SemiBold for headings, Avenir Next for body text.
 *
 * Josefin Sans is bundled through @expo-google-fonts and loaded in App.tsx.
 * Avenir Next ships with iOS, so it is used by its PostScript names there. It
 * is not on Android and is not freely redistributable, so Android falls back to
 * Nunito Sans, a close humanist geometric match, also bundled. To use real
 * Avenir Next on Android, add licensed .ttf files under assets/fonts, register
 * them in App.tsx, and point the android entries below at them.
 */
export const FONT = {
  heading: "JosefinSans_600SemiBold",
  body: Platform.select({ ios: "AvenirNext-Regular", default: "NunitoSans_400Regular" }),
  bodyMedium: Platform.select({ ios: "AvenirNext-Medium", default: "NunitoSans_500Medium" }),
  bodySemibold: Platform.select({
    ios: "AvenirNext-DemiBold",
    default: "NunitoSans_600SemiBold",
  }),
} as const;

/** Headings get moderate tracking: about 6 percent of the font size. */
export function heading(fontSize: number, tracking = 0.06): TextStyle {
  return {
    fontFamily: FONT.heading,
    fontSize,
    letterSpacing: Math.round(fontSize * tracking * 10) / 10,
  };
}

export function body(fontSize: number): TextStyle {
  return { fontFamily: FONT.body, fontSize };
}

export function bodyMedium(fontSize: number): TextStyle {
  return { fontFamily: FONT.bodyMedium, fontSize };
}

export function bodySemibold(fontSize: number): TextStyle {
  return { fontFamily: FONT.bodySemibold, fontSize };
}
