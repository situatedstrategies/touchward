/**
 * RevenueCat identifiers. The SDK keys are public by design (they only identify
 * the app; purchases are validated server side). The Android key is issued once
 * a Play Store app configuration exists in the RevenueCat dashboard.
 */
export const RC_API_KEYS = {
  ios: "appl_yciPIpyaMnqBetHYvpBHraTWVPC",
  android: "goog_SowsLfWjGczkPKSWleqVVtFlzRw",
} as const;

/** The one entitlement: everything unlocked. */
export const ENTITLEMENT_ID = "full";
/** The offering whose paywall the app presents. */
export const OFFERING_ID = "touchward_full";
