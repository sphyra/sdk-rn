import type { StyleMode, StylePreset, SphyraPresetDef, SphyraModeDef, SphyraStyle } from "../types";

export const STYLE_PRESETS: readonly StylePreset[] = ["dawn", "day", "dusk", "night"];
export const STYLE_MODES: readonly StyleMode[] = ["2d", "3d"];
export const DEFAULT_PRESET: StylePreset = "day";
export const DEFAULT_MODE: StyleMode = "3d";

export function isStylePreset(v: unknown): v is StylePreset {
  return typeof v === "string" && (STYLE_PRESETS as readonly string[]).includes(v);
}
export function isStyleMode(v: unknown): v is StyleMode {
  return typeof v === "string" && (STYLE_MODES as readonly string[]).includes(v);
}

function metadata(style: SphyraStyle): Record<string, unknown> {
  const m = style["metadata"];
  return m && typeof m === "object" ? (m as Record<string, unknown>) : {};
}

/** Read metadata["sphyra:presets"] (null if the style lacks the 10-012 contract). */
export function readPresetTable(style: SphyraStyle): Record<StylePreset, SphyraPresetDef> | null {
  const t = metadata(style)["sphyra:presets"];
  return t && typeof t === "object" ? (t as Record<StylePreset, SphyraPresetDef>) : null;
}

/** Read metadata["sphyra:modes"] (null if the style lacks the 10-012 contract). */
export function readModeTable(style: SphyraStyle): Record<StyleMode, SphyraModeDef> | null {
  const t = metadata(style)["sphyra:modes"];
  return t && typeof t === "object" ? (t as Record<StyleMode, SphyraModeDef>) : null;
}

/** Union of every layer that any mode hides — the runtime-toggleable set. Empty if no contract. */
export function toggleableLayers(style: SphyraStyle): string[] {
  const modes = readModeTable(style);
  if (!modes) return [];
  const set = new Set<string>();
  for (const def of Object.values(modes)) for (const id of def.hiddenLayers) set.add(id);
  return [...set];
}

/** Camera pitch for a mode from the table; falls back to 45 for 3d / 0 for 2d. */
export function pitchForMode(style: SphyraStyle, mode: StyleMode): number {
  return readModeTable(style)?.[mode]?.pitch ?? (mode === "3d" ? 45 : 0);
}

interface StyleLayer {
  id: string;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
}

/** Ground road stack — must render before fill-extrusion so buildings occlude roads/labels in 3D. */
export const ROAD_GROUND_LAYER_IDS = [
  "roads-casing",
  "roads-rim",
  "roads-line",
  "roads-lanes",
  "roads-crosswalk-base",
  "roads-crosswalk",
  "roads-oneway",
  "roads-label",
] as const;

/** POI badges, address numbers, and place names sit above extruded buildings. */
export const LAYERS_ABOVE_BUILDINGS_3D = [
  "pois-circle",
  "pois-icon",
  "pois-label",
  "buildings-housenumber-label",
  "housenumbers-label",
  "landuse-label",
  "places-label",
  "water-label",
] as const;

function extractLayer(layers: StyleLayer[], id: string): StyleLayer | null {
  const idx = layers.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  return layers.splice(idx, 1)[0] ?? null;
}

/** Normalize: … → road stack → buildings-3d → POIs / housenumbers / place labels. */
export function apply3dGroundDepth(style: SphyraStyle): void {
  const layers = (style["layers"] as StyleLayer[] | undefined) ?? [];
  const buildings3d = extractLayer(layers, "buildings-3d");
  if (!buildings3d) return;

  const roadLayers: StyleLayer[] = [];
  for (const id of ROAD_GROUND_LAYER_IDS) {
    const layer = extractLayer(layers, id);
    if (layer) roadLayers.push(layer);
  }

  const roadsLabel = roadLayers.find((l) => l.id === "roads-label");
  if (roadsLabel?.layout) {
    roadsLabel.layout = {
      ...roadsLabel.layout,
      "text-pitch-alignment": "map",
      "text-rotation-alignment": "map",
    };
  }

  let insertIdx = layers.findIndex((l) =>
    (LAYERS_ABOVE_BUILDINGS_3D as readonly string[]).includes(l.id),
  );
  if (insertIdx < 0) insertIdx = layers.length;

  layers.splice(insertIdx, 0, ...roadLayers, buildings3d);
  enforceOpaqueBuildings3d(buildings3d);
}

function enforceOpaqueBuildings3d(layer: { id: string; paint?: Record<string, unknown> }): void {
  layer.paint = { ...(layer.paint ?? {}), "fill-extrusion-opacity": 1 };
}

/**
 * Pure: deep-clone the style and bake `preset` (palette + top-level light) and `mode`
 * (3D-only layer visibility) into it. No network. The clone is what <MapView mapStyle> renders.
 */
export function applyStyleVariant(style: SphyraStyle, preset: StylePreset, mode: StyleMode): SphyraStyle {
  const clone = JSON.parse(JSON.stringify(style)) as SphyraStyle;
  const layers = (clone["layers"] as StyleLayer[] | undefined) ?? [];
  const presets = readPresetTable(clone);
  if (presets?.[preset]) {
    const def = presets[preset];
    clone["light"] = { ...def.light };
    for (const [layerId, paint] of Object.entries(def.layers)) {
      const layer = layers.find((l) => l.id === layerId);
      if (layer) layer.paint = { ...(layer.paint ?? {}), ...paint };
    }
  }
  const modes = readModeTable(clone);
  if (modes?.[mode]) {
    const hidden = new Set(modes[mode].hiddenLayers);
    for (const id of toggleableLayers(clone)) {
      const layer = layers.find((l) => l.id === id);
      if (layer) layer.layout = { ...(layer.layout ?? {}), visibility: hidden.has(id) ? "none" : "visible" };
    }
  }
  apply3dGroundDepth(clone);
  const b3d = layers.find((l) => l.id === "buildings-3d");
  if (b3d) enforceOpaqueBuildings3d(b3d);
  return clone;
}
