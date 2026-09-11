#!/usr/bin/env bash
# Ensures Expo / adb / emulator binaries resolve when ANDROID_HOME is unset (common outside Android Studio).
# Honors ANDROID_HOME if already set. Default SDK path matches Android Studio on macOS.
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

if [[ "${1:-}" == "adb" ]]; then
  shift
  ADB="$ANDROID_HOME/platform-tools/adb"
  if [[ ! -x "$ADB" ]]; then
    echo "[with-android-env] adb not found at $ADB — install Android SDK platform-tools." >&2
    exit 1
  fi
  exec "$ADB" "$@"
fi

exec "$@"
