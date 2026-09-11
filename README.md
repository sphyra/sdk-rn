<p align="center">
  <a href="https://sphyra.kidup.am">
    <img src="assets/logo-wordmark.svg" alt="Sphyra" width="300" />
  </a>
</p>

<p align="center">
  <strong>@sphyra/react-native</strong><br />
  React Native SDK for the Sphyra map &amp; geocoding API
</p>

<p align="center">
  MapLibre React Native · Hooks · Presets &amp; 2D/3D · TypeScript strict
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#setup">Setup</a> ·
  <a href="#map">Map</a> ·
  <a href="#geocoding">Geocoding</a> ·
  <a href="#runnable-demo">Demo</a>
</p>

---

## Overview

Sphyra is a self-hosted OpenStreetMap stack for **Armenia**. `@sphyra/react-native` wraps the same REST API as `@sphyra/js` with React Native primitives: a ready-made `<SphyraMap>`, declarative markers, geocoding hooks, and Phase-10 map controls.

**What you get out of the box**

- `SphyraProvider` + `useSphyra()` — shared client context
- `<SphyraMap>` — signed style, day/dusk/night presets, 2D/3D switching
- `<SphyraMarker>` / `<SphyraPopup>` — declarative map overlays
- `useReverseGeocode`, `useForwardGeocode`, `useTileConfig` — debounced data hooks
- Full TypeScript types in `dist/index.d.ts`

> **Runnable reference:** [`examples/expo-demo/`](examples/expo-demo/) — Expo dev-client demo with full parity to the web demo.

## Prerequisites

```bash
cd sphyra/api
docker compose up -d
curl http://localhost:4000/health   # → {"status":"ok"}
```

The dev key `sphyra_dev_local` is seeded automatically. Never commit a production key.

### Environments

| Environment | `baseUrl` | `apiKey` | Notes |
|-------------|-----------|----------|-------|
| **Local simulator** | `http://localhost:4000` | `sphyra_dev_local` | Works on iOS Simulator / Android emulator |
| **Physical device** | `http://<your-lan-ip>:4000` | `sphyra_dev_local` | Replace `localhost` — the device cannot reach your laptop's loopback |
| **Production** | `https://sphyra.kidup.am` | `SPHYRA_API_KEY` | From your secret store |

## Install

```bash
pnpm add @sphyra/react-native @maplibre/maplibre-react-native
```

`@sphyra/react-native` is **not yet on npm**. Until publish:

```bash
pnpm add file:../sdk-rn @maplibre/maplibre-react-native
# or: pnpm add git+https://github.com/sphyra/sdk-rn.git#main @maplibre/maplibre-react-native
```

| Package | Role |
|---------|------|
| `@maplibre/maplibre-react-native ^10.0.0` | **Required** peer — map rendering |
| `react`, `react-native` | Provided by your host app |

Complete native setup per the [MapLibre React Native guide](https://maplibre.org/maplibre-react-native/docs/setup/getting-started) before running on device.

## Setup

Wrap your app (or map screen) in `SphyraProvider`:

```tsx
import { SphyraClient, SphyraProvider } from "@sphyra/react-native";

const client = new SphyraClient({
  baseUrl: "http://localhost:4000",
  apiKey: "sphyra_dev_local",
});

export default function App() {
  return (
    <SphyraProvider client={client}>
      <YourMapScreen />
    </SphyraProvider>
  );
}
```

## Map

`<SphyraMap>` reads the client from context, fetches the signed style once, and switches presets/modes locally — no style re-fetch.

```tsx
import { View, Image, StyleSheet } from "react-native";
import { SphyraMap, SphyraMarker } from "@sphyra/react-native";

function MapScreen() {
  return (
    <View style={styles.fill}>
      <SphyraMap
        preset="day"
        mode="3d"
        center={[44.5152, 40.1872]}
        zoom={13}
        style={styles.fill}
        onError={(err) => console.warn(err.code, err.message)}
      >
        <SphyraMarker
          id="republic-square"
          coordinate={[44.5152, 40.1872]}
          onPress={() => console.log("marker pressed")}
        >
          <Image source={require("./pin.png")} style={{ width: 32, height: 32 }} />
        </SphyraMarker>
      </SphyraMap>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
```

<details>
<summary><strong>Lower level — <code>useTileConfig(client)</code></strong></summary>

Use when you need raw signed URLs instead of `<SphyraMap>`. Auto-refreshes five minutes before expiry.

```tsx
import { useSphyra, useTileConfig } from "@sphyra/react-native";

function TileConfigPanel() {
  const client = useSphyra();
  const { data, loading, error } = useTileConfig(client);

  if (loading) return null;
  if (error) return null;
  // data.styleUrl · data.tileUrl · data.expiresAt
  return null;
}
```

</details>

## Geocoding

### Reverse — `useReverseGeocode(client, params)`

Takes **`client` as the first argument**. Pass `null` to stay idle. Debounced 500 ms.

```tsx
import { useSphyra, useReverseGeocode } from "@sphyra/react-native";
import { Text } from "react-native";

function ReverseExample() {
  const client = useSphyra();
  const { data, loading, error } = useReverseGeocode(client, {
    lat: 40.1872,
    lon: 44.5152,
    lang: "hy",
  });

  if (loading) return <Text>Loading…</Text>;
  if (error) return <Text>{error.code}: {error.message}</Text>;
  return <Text>{data?.displayName ?? "—"}</Text>;
  // → "Հանրապետության հրապարակ, Երևան, Հայաստան"
}
```

### Forward — `useForwardGeocode({ query, lang, … })`

Reads the client from **`SphyraProvider` context** — no `client` argument. Debounced; queries when trimmed length ≥ 2.

```tsx
import { useForwardGeocode } from "@sphyra/react-native";
import { Text } from "react-native";

function SearchExample() {
  const { results, loading, error } = useForwardGeocode({
    query: "Աբովյան",
    lang: "hy",
    limit: 5,
  });

  if (loading) return <Text>Searching…</Text>;
  if (error) return <Text>{error.code}: {error.message}</Text>;

  return (
    <>
      {results.map((r, i) => (
        <Text key={i}>{r.displayName}</Text>
      ))}
    </>
  );
}
```

> **Hook signatures differ by design** — do not pass `client` to `useForwardGeocode`; do pass it to `useReverseGeocode` and `useTileConfig`.

## Error handling

| Source | How errors appear |
|--------|-------------------|
| **Hooks** | `error: SphyraError \| null` on hook state (`.code`, `.statusCode`, `.message`) |
| **Client methods** | Thrown `SphyraError` — use `try/catch` + `instanceof SphyraError` |

**Retry policy** (same as `@sphyra/js`): 5xx / `TIMEOUT` / `NETWORK` retry 3× at 1s / 2s / 4s; 4xx fail immediately; default timeout 10 000 ms (`timeout` on `SphyraClient`).

## Runnable demo

[`examples/expo-demo/`](examples/expo-demo/) mirrors the `@sphyra/js` web demo: map presets, Phase-10 services, interactive directions, and search — built with Expo dev client.

See the demo's own README for LAN-IP setup and run commands.

## TypeScript

All public types ship in `dist/index.d.ts`:

| Type | Purpose |
|------|---------|
| `SphyraClientOptions` | Client constructor |
| `SphyraMapProps` / `SphyraMarkerProps` | Map components |
| `ReverseGeocodeState` | `useReverseGeocode` return shape |
| `ForwardGeocodeState` | `useForwardGeocode` return shape |
| `TileConfigState` | `useTileConfig` return shape |
| `GeocodeLang` | `"hy"` \| `"en"` \| `"ru"` |

```bash
pnpm typecheck
```

---

<p align="center">
  <sub>Armenia-only coverage · <a href="https://sphyra.kidup.am">sphyra.kidup.am</a> · Built for <a href="https://kidup.am">KidUp</a></sub>
</p>

## Commit hygiene

This repository must show only its human authors in the contributor list. A local hook
rejects AI co-author trailers before a commit is created — enable it once per clone:

```bash
git config core.hooksPath .githooks
```

The same check runs in CI (`no-ai-trailers`) over every commit in a merge/pull request
range, so a bypassed local hook still fails the pipeline.
