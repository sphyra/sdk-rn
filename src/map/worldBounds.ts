/**
 * Camera bounds that keep the viewport inside the mercator plane.
 *
 * MapLibre Native draws the `background` layer across the whole viewport but has
 * no geometry above ~85.05°N or below ~85.05°S. Pan past either edge and the part
 * of the screen beyond it is a flat slab of the background colour. On the web
 * there is a globe below z6 and this never arises; the native renderer has no
 * globe, so the camera has to be fenced instead.
 *
 * MapLibre constrains the camera *centre*, not the viewport — on Android
 * `maxBounds` becomes `setLatLngBoundsForCameraTarget`. So the fence has to sit
 * half a viewport below the pole, and how far that is depends on how far out the
 * camera may zoom: the world is `512 * 2^zoom` dp tall, so the most zoomed-out
 * state is the worst case. Pass the `minZoom` you gave `<SphyraMap>`.
 *
 * Pure: no react-native import, so it is usable anywhere and testable in jsdom.
 */

/** MapLibre's world size at zoom 0, in dp. */
const WORLD_SIZE_AT_Z0 = 512;

/** The latitude where the mercator projection is cut off. */
export const MERCATOR_LAT_LIMIT = 85.051128779807;

/** MapLibre's `{ ne, sw }` bounds, each `[lon, lat]`. */
export interface WorldPanBounds {
  ne: [number, number];
  sw: [number, number];
}

/** Latitude at a normalised mercator y (0 = north edge, 0.5 = equator). */
function latitudeAtMercatorY(yNorm: number): number {
  return (2 * Math.atan(Math.exp(Math.PI * (1 - 2 * yNorm))) - Math.PI / 2) * (180 / Math.PI);
}

/**
 * The box the camera centre may not leave, so that at `minZoom` no part of a
 * `viewportHeightDp`-tall viewport can sit outside the world.
 *
 * Longitude is left wide open — the world wraps sideways, so only latitude can
 * run out of map.
 */
export function worldPanBounds(minZoom: number, viewportHeightDp: number): WorldPanBounds {
  const worldHeight = WORLD_SIZE_AT_Z0 * 2 ** minZoom;
  // A viewport at least as tall as the world cannot be kept inside it at all;
  // pinning the centre to the equator is the least-wrong answer and keeps the box
  // valid rather than inverted.
  const halfViewport = viewportHeightDp > 0 ? viewportHeightDp / 2 : 0;
  const yNorm = Math.min(0.5, halfViewport / worldHeight);
  const lat = yNorm >= 0.5 ? 0 : Math.min(latitudeAtMercatorY(yNorm), MERCATOR_LAT_LIMIT);

  // `-0` is a valid number but an ugly thing to hand a native bounds object and to
  // assert on; normalise it away.
  return { ne: [180, lat], sw: [-180, lat === 0 ? 0 : -lat] };
}
