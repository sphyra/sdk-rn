#!/usr/bin/env bash
# Build + install on the USB-connected physical device (skips emulators).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
WITH_ENV="$ROOT/scripts/with-android-env.sh"

if [[ ! -x "$WITH_ENV" ]]; then
  echo "[android] Missing $WITH_ENV" >&2
  exit 1
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
if [[ ! -x "$ADB" ]]; then
  echo "[android] adb not found at $ADB — open Android Studio → SDK Manager → Android SDK Platform-Tools." >&2
  exit 1
fi

"$ADB" start-server >/dev/null 2>&1 || true

USB_LIST="$("$ADB" devices -l | awk '$2=="device"{print $1}' | grep -v '^emulator-' || true)"
USB_SERIAL="$(printf '%s\n' "$USB_LIST" | head -1)"

if [[ -z "$USB_SERIAL" ]]; then
  echo ""
  echo "[android] No USB device found."
  echo "  1. Plug in the phone and unlock it"
  echo "  2. Enable Developer options → USB debugging"
  echo "  3. Accept the RSA fingerprint prompt on the phone"
  echo "  4. Run: bash scripts/with-android-env.sh adb devices"
  echo "     (should show your device as 'device', not 'unauthorized')"
  echo ""
  "$ADB" devices -l || true
  exit 1
fi

USB_COUNT="$(printf '%s\n' "$USB_LIST" | sed '/^$/d' | wc -l | tr -d ' ')"
if [[ "$USB_COUNT" -gt 1 ]]; then
  echo "[android] Multiple USB devices — using ${USB_SERIAL}"
  printf '%s\n' "$USB_LIST" | tail -n +2 | sed 's/^/    also: /'
else
  echo "[android] Using USB device: ${USB_SERIAL}"
fi

# Expo `--device` matches adb *model* name (e.g. SM_A515F), not the USB serial.
DEVICE_LINE="$("$ADB" devices -l | awk -v s="$USB_SERIAL" '$1==s{print; exit}')"
EXPO_DEVICE="$(printf '%s' "$DEVICE_LINE" | sed -n 's/.*model:\([^ ]*\).*/\1/p')"
if [[ -z "$EXPO_DEVICE" ]]; then
  EXPO_DEVICE="Device ${USB_SERIAL}"
fi
echo "[android] Expo device name: ${EXPO_DEVICE}"

export ANDROID_SERIAL="$USB_SERIAL"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -n "$LAN_IP" ]]; then
  export REACT_NATIVE_PACKAGER_HOSTNAME="$LAN_IP"
  echo "[android] Metro hostname: ${LAN_IP} (set EXPO_PUBLIC_SPHYRA_URL to http://${LAN_IP}:4000 in .env)"
fi

exec "$WITH_ENV" expo run:android --device="$EXPO_DEVICE"
