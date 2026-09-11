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
  bearing?: number;
  pitch?: number; // default: pitch from the mode table
  onLoad?: () => void;
  onError?: (err: SphyraError) => void;
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
        const s = await client.getMapStyle();
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
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapStyle = useMemo(
    () => (baseStyle ? applyStyleVariant(baseStyle, preset, mode) : null),
    [baseStyle, preset, mode],
  );

  useImperativeHandle(ref, () => ({
    setCamera(options) {
      cameraRef.current?.setCamera?.({
        centerCoordinate: options.center,
        zoomLevel: options.zoom,
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
    >
      <Camera
        ref={cameraRef}
        centerCoordinate={props.center}
        zoomLevel={props.zoom}
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