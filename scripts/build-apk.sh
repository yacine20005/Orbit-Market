#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "// ORBIT MARKET v2.0.0 // ANDROID APK BUILD PIPELINE"
echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"

if [ ! -d "android" ]; then
  echo "[1/3] Generating native Android project via Expo Prebuild..."
  npx expo prebuild --platform android --no-install
fi

echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "[2/3] Compiling standalone Release APK with Gradle..."
cd android
./gradlew assembleRelease --no-daemon

APK_SOURCE="app/build/outputs/apk/release/app-release.apk"
APK_DEST="../orbit-market-v2.0.0.apk"

if [ -f "$APK_SOURCE" ]; then
  cp "$APK_SOURCE" "$APK_DEST"
  echo "[3/3] APK successfully generated at: $(cd .. && pwd)/orbit-market-v2.0.0.apk"
else
  echo "Error: APK not found at $APK_SOURCE"
  exit 1
fi
