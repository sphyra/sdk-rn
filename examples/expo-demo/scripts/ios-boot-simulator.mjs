#!/usr/bin/env node
/**
 * Boot the newest iOS 26.x iPhone 17 Pro, set it as Simulator default, and open Simulator.app.
 * KidUp's `pnpm ios` does this via scripts/ios-resync-simulator-default.mjs — expo-demo needs the same
 * or `expo run:ios` may build without bringing the simulator window to the front.
 */
import { execSync } from "node:child_process";

const DOMAIN = "com.apple.iphonesimulator";
const KEY = "CurrentDeviceUDID";
const TARGET_NAME = "iPhone 17 Pro";

function listDevices() {
  const raw = execSync("xcrun simctl list devices available -j", {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function runtimeMajor(runtimeKey) {
  const m = runtimeKey.match(/iOS-(\d+)-/u);
  return m ? parseInt(m[1], 10) : 0;
}

function runtimeMinor(runtimeKey) {
  const m = runtimeKey.match(/iOS-\d+-(\d+)/u);
  return m ? parseInt(m[1], 10) : 0;
}

function pickIPhone17ProOnIos26(data) {
  /** @type {{ runtime: string; udid: string; name: string } | null} */
  let best = null;
  for (const [runtime, list] of Object.entries(data.devices ?? {})) {
    if (runtimeMajor(runtime) < 26) continue;
    for (const d of list) {
      if (!d.isAvailable || d.name !== TARGET_NAME) continue;
      const score = runtimeMajor(runtime) * 100 + runtimeMinor(runtime);
      const bestScore = best
        ? runtimeMajor(best.runtime) * 100 + runtimeMinor(best.runtime)
        : -1;
      if (score > bestScore) best = { runtime, udid: d.udid, name: d.name };
    }
  }
  return best;
}

function main() {
  const choice = pickIPhone17ProOnIos26(listDevices());
  if (!choice) {
    console.error(
      `[ios:sim] No "${TARGET_NAME}" on iOS 26+. Install an iOS 26 simulator runtime in Xcode → Settings → Platforms.`,
    );
    process.exit(1);
  }

  console.log(`[ios:sim] Using ${choice.name} (${choice.udid}) — ${choice.runtime}`);
  execSync(`defaults write ${DOMAIN} ${KEY} -string "${choice.udid}"`, { stdio: "inherit" });

  try {
    execSync(`xcrun simctl boot "${choice.udid}"`, { stdio: "pipe" });
  } catch {
    /* already booted */
  }

  execSync("open -a Simulator", { stdio: "inherit" });
  console.log("[ios:sim] Simulator opened. Building and launching app…");
}

main();
