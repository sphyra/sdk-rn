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
  "transit-line",
  "roads-tunnel",
  "roads-casing",
  "roads-rim",
  "roads-line",
  "roads-bridge",
  "roads-lanes",
  "roads-crosswalk-base",
  "roads-crosswalk",
  "roads-oneway",
  // Poles, lamps and power lines are ground ink too — above the extrusions they speckled roofs.
  "infrastructure-line",
  "infrastructure-point",
  "street-furniture-circle",
  "roads-label",
] as const;

/** Drawn straight after the building stack so buildings never cover POI labels (API 11-023). */
export const LAYERS_ON_BUILDINGS_3D = ["pois"] as const;

/** Ground shadows · walls · roof cap (API 11-023), always drawn together in this order. */
export const BUILDING_FACADE_LAYERS = [
  "buildings-ao",
  "buildings-ao-contact",
  "buildings-3d",
  "buildings-3d-roof",
] as const;

/** Address numbers and place names sit above extrusions. */
export const LAYERS_ABOVE_BUILDINGS_3D = [
  "natural-peak",
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

/** Normalize: … → road/POI ground stack → facade stack → housenumbers / place labels. */
export function apply3dGroundDepth(style: SphyraStyle): void {
  const layers = (style["layers"] as StyleLayer[] | undefined) ?? [];
  if (!layers.some((l) => l.id === "buildings-3d")) return;
  const facade = BUILDING_FACADE_LAYERS.map((id) => extractLayer(layers, id)).filter(
    (layer): layer is StyleLayer => layer !== null,
  );
  const buildings3d = facade.find((l) => l.id === "buildings-3d")!;

  const roadLayers: StyleLayer[] = [];
  for (const id of ROAD_GROUND_LAYER_IDS) {
    const layer = extractLayer(layers, id);
    if (layer) roadLayers.push(layer);
  }

  const onBuildings = LAYERS_ON_BUILDINGS_3D.map((id) => extractLayer(layers, id)).filter(
    (layer): layer is StyleLayer => layer !== null,
  );

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

  layers.splice(insertIdx, 0, ...roadLayers, ...facade, ...onBuildings);
  enforceOpaqueBuildings3d(buildings3d);
}

function enforceOpaqueBuildings3d(layer: { id: string; paint?: Record<string, unknown> }): void {
  layer.paint = { ...(layer.paint ?? {}), "fill-extrusion-opacity": 1 };
}

/**
 * Root properties the web renderer uses and MapLibre Native does not implement: the sky gradient,
 * the globe projection, and Mapbox's `fog` (which MapLibre never had). The native style parser
 * warns about properties it does not know, so drop them rather than ship a style that logs on
 * every load. Mobile therefore stays mercator with a plain sky — tracked for the MapLibre Native
 * upgrade (ADR-008).
 */
function stripWebOnlyRootProperties(style: SphyraStyle): void {
  for (const key of ["sky", "projection", "fog"]) delete (style as Record<string, unknown>)[key];
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
    // `sky`, `projection` and the web-only `stars` never reach the native renderer — see the
    // strip below; the preset's light and layer paint are all MapLibre Native reads.
    for (const [layerId, paint] of Object.entries(def.layers)) {
      const layer = layers.find((l) => l.id === layerId);
      if (layer) layer.paint = { ...(layer.paint ?? {}), ...paint };
    }
  }
  const modes = readModeTable(clone);
  if (modes?.[mode]) {
    const modeDef = modes[mode];
    const hidden = new Set(modeDef.hiddenLayers);
    for (const id of toggleableLayers(clone)) {
      const layer = layers.find((l) => l.id === id);
      if (layer) layer.layout = { ...(layer.layout ?? {}), visibility: hidden.has(id) ? "none" : "visible" };
    }
    if (modeDef.terrain) clone["terrain"] = { ...modeDef.terrain };
    else delete clone["terrain"];
  }
  apply3dGroundDepth(clone);
  const b3d = layers.find((l) => l.id === "buildings-3d");
  if (b3d) enforceOpaqueBuildings3d(b3d);
  stripWebOnlyRootProperties(clone);
  return clone;
}
