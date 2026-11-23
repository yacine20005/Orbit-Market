#!/usr/bin/env bash
set -euo pipefail

CLEAN_PREBUILD=false
ANDROID_ABIS="arm64-v8a,armeabi-v7a"

for arg in "$@"; do
  case "$arg" in
    --clean)
      CLEAN_PREBUILD=true
      ;;
    --all-abis)
      ANDROID_ABIS="armeabi-v7a,arm64-v8a,x86,x86_64"
      ;;
    -h|--help)
      echo "Usage: bash scripts/build-apk.sh [--clean] [--all-abis]"
      echo "  --clean     Regenerate the native android/ project via expo prebuild --clean"
      echo "  --all-abis  Build all 4 ABIs (including x86/x86_64) instead of arm64-v8a,armeabi-v7a"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: bash scripts/build-apk.sh [--clean] [--all-abis]" >&2
      exit 1
      ;;
  esac
done

# Resolve JAVA_HOME (prefer explicit env, then Homebrew openjdk@17, then macOS java_home)
if [ -z "${JAVA_HOME:-}" ]; then
  if [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  elif command -v /usr/libexec/java_home >/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  fi
fi

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "Error: JDK 17+ not found (JAVA_HOME is unset or invalid)." >&2
  echo "Install JDK 17 (e.g. 'brew install openjdk@17' on macOS) or set JAVA_HOME before running." >&2
  exit 1
fi

# Resolve ANDROID_HOME
if [ -z "${ANDROID_HOME:-}" ]; then
  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
  elif [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  fi
fi

if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME" ]; then
  echo "Error: Android SDK not found (ANDROID_HOME is unset or directory missing)." >&2
  echo "Install Android SDK (platforms;android-37, build-tools;37.0.0, ndk;27.1.12297006) or set ANDROID_HOME." >&2
  exit 1
fi

export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
export GRADLE_OPTS="${GRADLE_OPTS:--Xmx4096m -XX:MaxMetaspaceSize=1024m}"

APP_VERSION="$(node -p "require('./package.json').version")"
RELEASE_TAG="v${APP_VERSION}"
APK_FILENAME="orbit-market-${RELEASE_TAG}.apk"

echo "// ORBIT MARKET ${RELEASE_TAG} // ANDROID APK BUILD PIPELINE"
echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "ABIS=$ANDROID_ABIS"

if [ "$CLEAN_PREBUILD" = true ]; then
  echo "[1/3] Regenerating native Android project via Expo Prebuild (--clean)..."
  npx expo prebuild --platform android --clean --no-install
elif [ ! -d "android" ]; then
  echo "[1/3] Generating native Android project via Expo Prebuild..."
  npx expo prebuild --platform android --no-install
else
  echo "[1/3] Reusing existing android/ directory (pass --clean to regenerate)..."
fi

echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "[2/3] Compiling standalone Release APK with Gradle..."
(
  cd android
  ./gradlew assembleRelease --no-daemon \
    -Dorg.gradle.jvmargs="-Xmx4096m -XX:MaxMetaspaceSize=1024m" \
    -PreactNativeArchitectures="$ANDROID_ABIS"
)

APK_SOURCE="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_SOURCE" ]; then
  cp "$APK_SOURCE" "$APK_FILENAME"
  echo "[3/3] APK successfully generated at: $(pwd)/${APK_FILENAME}"
  ls -lh "$APK_FILENAME"
else
  echo "Error: APK not found at $APK_SOURCE" >&2
  exit 1
fi
