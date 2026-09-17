# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# @generated begin expo-build-properties - expo prebuild (DO NOT MODIFY)
# Native modules the app talks to by name from JS that ship no keep rules of
# their own. Everything else (React Native, Expo modules, Firebase, react-native-svg,
# react-native-worklets) ships consumer rules.
-keep class com.swmansion.pulsar.** { *; }
-keep class com.reactnativevolumemanager.** { *; }
# @generated end expo-build-properties