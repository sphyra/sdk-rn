# Sphyra Expo Demo (`@sphyra/expo-demo`)

Standalone React Native demo for **`@sphyra/react-native`** — feature parity with `sphyra/sdk-js/examples/web-demo/` (map rendering, presets, markers, clustering, directions, search, and every Phase-10 API service).

> **Not Expo Go.** `@maplibre/maplibre-react-native` is a native module. You must use a **custom dev client**: `npx expo prebuild` then `npx expo run:ios` / `npx expo run:android`.

## Prerequisites

1. Local Sphyra stack running (`sphyra/api`: `docker compose up -d`, `/health` → `{ "status": "ok" }`).
2. SDK built: `cd sphyra/sdk-rn && pnpm build` (also runs automatically via `prestart` / `preios`).
3. **LAN IP rule (critical for RN):** Set the API's `SPHYRA_PUBLIC_URL` to your dev machine's LAN IP (e.g. `http://192.168.1.50:4000`) and restart the API. The map style embeds **absolute signed tile/glyph/sprite/DEM URLs** — simulators/devices must reach that host. There is no Vite proxy in React Native.
4. Copy env: `cp .env.example .env` and set `EXPO_PUBLIC_SPHYRA_URL` to the **same LAN IP**.

See also: `sphyra-vault/05-Operations/RN-Expo-Demo.md`.

## Install & run

```bash
cd sphyra/sdk-rn/examples/expo-demo
pnpm install
npx expo prebuild
pnpm ios                 # opens Simulator.app + builds/launches (default = iOS 26 iPhone 17 Pro)
pnpm ios:26              # alias — same as pnpm ios
pnpm android             # USB physical device (USB debugging on; uses LAN IP for Metro + API)
pnpm android:emu         # Android emulator instead
```

Metro cache after SDK rebuild: `npx expo start -c`.

## Tests

```bash
pnpm test        # unit (vitest)
pnpm typecheck   # tsc --strict
pnpm smoke       # gated node:test (set SPHYRA_LOCAL_STACK=1 with stack up)
```

## LAN-IP cheat sheet

| Surface | API base the app calls | Style signed URLs must resolve to |
|---------|------------------------|-----------------------------------|
| iOS simulator | `localhost:4000` can work for API | **LAN IP** (`SPHYRA_PUBLIC_URL`) |
| Android emulator | `10.0.2.2:4000` for host | **LAN IP** |
| Physical device | LAN IP, same Wi‑Fi | **LAN IP** |
| Android USB | LAN IP in `.env` | **LAN IP** (`SPHYRA_PUBLIC_URL`) |

## Troubleshooting

- **Blank map** — wrong `SPHYRA_PUBLIC_URL` on the API (style tile URLs unreachable from simulator).
- **Stale SDK behaviour** — re-run `pnpm build` in `sdk-rn` root, then `npx expo start -c`.
- **Expo Go crash** — expected; use dev client (`expo prebuild` + `expo run:*`).
- **`Unable to resolve @babel/runtime/...`** — run `rm -rf node_modules && pnpm install` (`.npmrc` uses `node-linker=hoisted` for Metro). Then `npx expo start -c`.
- **`AbortSignal.timeout is not a function`** — stale SDK bundle. Run `cd sphyra/sdk-rn && pnpm build`, then `cd examples/expo-demo && pnpm install && npx expo start -c`. The demo uses `link:../..` so Metro always picks up the latest `dist/`.
- **`Failed to load glyph range … Open Sans Regular`** — cluster count labels used MapLibre's default font; SDK now sets `Noto Sans Regular` (the only served stack). Rebuild SDK (`pnpm build` in `sdk-rn`) and reload Metro.
- **`Tried to register two views with the same name MLRNCamera`** — Metro loaded MapLibre twice (expo-demo + sdk-rn `node_modules`). Restart with `npx expo start -c` after pulling; `metro.config.js` pins a single copy.
- **`malformed or corrupted precompiled file` / missing `.pnpm/expo-modules-core/...` header** — stale Xcode cache after `pnpm install` layout change. Run `rm -rf ~/Library/Developer/Xcode/DerivedData/SphyraExpoDemo-* ios/build && cd ios && pod install`, then `pnpm ios:26`.
