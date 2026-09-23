import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { Camera, MapView, type CameraRef } from "@maplibre/maplibre-react-native";
import { useSphyra } from "../context/SphyraProvider";
import { applyStyleVariant, DEFAULT_MODE, DEFAULT_PRESET, pitchForMode } from "../map/presets";
import { SphyraError } from "../errors";
import type { StyleMode, StylePreset, SphyraStyle } from "../types";

export interface SphyraMapCameraOptions {
  center?: [number, number]; // [lon, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  animationDuration?: number;
}

export interface SphyraMapHandle {
  /** Imperatively move the camera (delegates to the underlying maplibre Camera ref). */
  setCamera(options: SphyraMapCameraOptions): void;
}

export interface SphyraMapProps {
  preset?: StylePreset; // default "day"
  mode?: StyleMode; // default "3d"
  center?: [number, number]; // [lon, lat]
  zoom?: number;
  /**
   * Zoom floor the camera may not pull back past — gestures included.
   *
   * MapLibre Native has no globe: below the zoom where the viewport grows wider
   * than the world (`512 * 2^zoom` dp, so ~z1.5 on a 13" tablet in landscape) it
   * repeats the mercator plane sideways and the map reads as several copies of
   * the world. `@sphyra/js` hands that range to the globe projection instead;
   * native has nothing to hand it to, so consumers set a floor. Unset = the
   * MapLibre default (0).
   */
  minZoom?: number;
  /** Zoom ceiling the camera may not pass. Unset = the MapLibre default. */
  maxZoom?: number;
  /**
   * Box the camera *centre* may not leave, as MapLibre's `{ ne, sw }` of
   * `[lon, lat]`. On Android this becomes `setLatLngBoundsForCameraTarget`.
   *
   * Pair it with `minZoom` to stop the user panning off the top or bottom of the
   * mercator plane, where the native renderer has no geometry and paints a slab
   * of the `background` layer instead. `worldPanBounds(minZoom, viewportHeight)`
   * computes the right box; the SDK does not apply one on its own, because only
   * the consumer knows how tall the map is laid out.
   */
  maxBounds?: { ne: [number, number]; sw: [number, number] };
  bearing?: number;
  pitch?: number; // default: pitch from the mode table
  onLoad?: () => void;
  onError?: (err: SphyraError) => void;
  /** Label language forwarded to `getMapStyle`. Default is the API's `local`. */
  language?: string;
  onRegionChange?: (region: unknown) => void;
  /** Fires continuously *during* a gesture, before it settles. */
  onRegionIsChanging?: (region: unknown) => void;
  style?: Record<string, unknown>; // RN View style passthrough for the MapView
  /** Map layers/controls (markers, ShapeSource, DirectionsControl, …) render as MapView children. */
  children?: ReactNode;
  /** Map background press — GeoJSON feature from MapLibre (Point geometry carries tap coordinates). */
  onPress?: (feature: GeoJSON.Feature) => void;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  compassEnabled?: boolean;
  /** Corner the compass sits in: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right. */
  compassViewPosition?: number;
  /** Offset from that corner, e.g. `{ x: 16, y: 64 }` to clear a status bar or header. */
  compassViewMargins?: { x: number; y: number };
  /**
   * Show the MapLibre attribution ("i") control. Defaults to the MapLibre default
   * (shown). Set `false` to hide it — consumers that hide it are responsible for
   * surfacing the required attribution elsewhere.
   */
  attributionEnabled?: boolean;
  attributionPosition?: { top?: number; left?: number; right?: number; bottom?: number };
  /** Show the MapLibre logo. Defaults to the MapLibre default (shown). */
  logoEnabled?: boolean;
  logoPosition?: { top?: number; left?: number; right?: number; bottom?: number };
}

/**
 * Hold `zoom` inside [`min`, `max`]. `undefined` bounds are no bounds, and an
 * undefined `zoom` stays undefined so MapLibre keeps its own default rather than
 * being pinned to a floor the caller never asked for.
 */
function clampZoom(zoom: number | undefined, min?: number, max?: number): number | undefined {
  if (zoom === undefined) return undefined;
  let next = zoom;
  if (min !== undefined && next < min) next = min;
  if (max !== undefined && next > max) next = max;
  return next;
}

function toSphyraError(err: unknown): SphyraError {
  return err instanceof SphyraError
    ? err
    : new SphyraError("UNKNOWN", err instanceof Error ? err.message : "Failed to load map style");
}

export const SphyraMap = forwardRef<SphyraMapHandle, SphyraMapProps>(function SphyraMap(props, ref) {
  const client = useSphyra();
  const preset = props.preset ?? DEFAULT_PRESET;
  const mode = props.mode ?? DEFAULT_MODE;
  const [baseStyle, setBaseStyle] = useState<SphyraStyle | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearRefresh = (): void => {
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    const scheduleRefresh = (style: SphyraStyle): void => {
      clearRefresh();
      const expiresMs = glyphExpiresMs(style);
      if (expiresMs === null) return;
      const delay = Math.max(0, expiresMs - Date.now() - STYLE_REFRESH_LEAD_MS);
      refreshTimerRef.current = setTimeout(() => {
        void load();
      }, delay);
    };

    const load = async (): Promise<void> => {
      try {
        const s = await client.getMapStyle(
          props.language !== undefined ? { language: props.language } : {},
        );
        if (cancelled) return;
        setBaseStyle(s);
        scheduleRefresh(s);
      } catch (err) {
        if (!cancelled) props.onError?.(toSphyraError(err));
      }
    };

    void load();
    return () => {
      cancelled = true;
      clearRefresh();
    };
  }, [client, props.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapStyle = useMemo(
    () => (baseStyle ? applyStyleVariant(baseStyle, preset, mode) : null),
    [baseStyle, preset, mode],
  );

  useImperativeHandle(ref, () => ({
    setCamera(options) {
      cameraRef.current?.setCamera?.({
        centerCoordinate: options.center,
        // `<Camera minZoomLevel>` bounds gestures, but an imperative setCamera is
        // allowed to overshoot it on both platforms — clamp here so every route to
        // the camera obeys the same floor.
        zoomLevel: clampZoom(options.zoom, props.minZoom, props.maxZoom),
        pitch: options.pitch,
        heading: options.bearing,
        animationDuration: options.animationDuration ?? 0,
      });
    },
  }));

  if (!mapStyle) return null; // style still loading (or errored → onError already fired)

  const pitch = props.pitch ?? (baseStyle ? pitchForMode(baseStyle, mode) : 0);

  return (
    <MapView
      style={props.style}
      mapStyle={mapStyle}
      onDidFinishLoadingMap={() => props.onLoad?.()}
      onRegionDidChange={(region: unknown) => props.onRegionChange?.(region)}
      onRegionIsChanging={(region: unknown) => props.onRegionIsChanging?.(region)}
      onPress={props.onPress}
      zoomEnabled={props.zoomEnabled}
      rotateEnabled={props.rotateEnabled}
      pitchEnabled={props.pitchEnabled}
      compassEnabled={props.compassEnabled}
      compassViewPosition={props.compassViewPosition}
      compassViewMargins={props.compassViewMargins}
      attributionEnabled={props.attributionEnabled}
      attributionPosition={props.attributionPosition}
      logoEnabled={props.logoEnabled}
      logoPosition={props.logoPosition}
      // Native MapLibre CJK fallback. Current @maplibre/maplibre-react-native typings omit it.
      {...({ localIdeographFontFamily: "sans-serif" } as Record<string, unknown>)}
    >
      <Camera
        ref={cameraRef}
        centerCoordinate={props.center}
        zoomLevel={clampZoom(props.zoom, props.minZoom, props.maxZoom)}
        minZoomLevel={props.minZoom}
        maxZoomLevel={props.maxZoom}
        maxBounds={props.maxBounds}
        pitch={pitch}
        heading={props.bearing}
      />
      {props.children}
    </MapView>
  );
});

/** Refetch map style this far before glyph/sprite signatures expire. */
const STYLE_REFRESH_LEAD_MS = 5 * 60 * 1000;

function glyphExpiresMs(style: SphyraStyle): number | null {
  const glyphs = typeof style.glyphs === "string" ? style.glyphs : null;
  if (!glyphs) return null;
  const match = /[?&]expires=(\d+)/.exec(glyphs);
  if (!match) return null;
  return Number(match[1]) * 1000;
}