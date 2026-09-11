function poi(name: string, category: string, lon: number, lat: number) {
  return {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [lon, lat] as [number, number] },
    properties: { name, category },
  };
}

export const SAMPLE_POINTS = {
  type: "FeatureCollection" as const,
  features: [
    poi("Cascade Complex", "landmark", 44.5152, 40.1893),
    poi("Republic Square", "landmark", 44.5136, 40.1772),
    poi("Matenadaran", "museum", 44.5215, 40.1916),
    poi("Opera Theatre", "culture", 44.5147, 40.1853),
    poi("Victory Park", "park", 44.5215, 40.199),
    poi("Tsitsernakaberd Memorial", "memorial", 44.4735, 40.1922),
    poi("Zvartnots Cathedral", "heritage", 44.336, 40.1601),
    poi("Garni Temple", "heritage", 44.73, 40.1122),
    poi("Geghard Monastery", "heritage", 44.8181, 40.1399),
    poi("Lake Sevan", "nature", 45.0282, 40.564),
    poi("Khor Virap", "heritage", 44.5772, 39.878),
    poi("Yerevan Zoo", "attraction", 44.546, 40.2008),
  ],
};

export interface Landmark {
  id: string;
  coordinate: [number, number];
  title: string;
  description: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: "cascade",
    coordinate: [44.5152, 40.1893],
    title: "Cascade Complex",
    description: "Giant limestone stairway and the Cafesjian art collection.",
  },
  {
    id: "republic-square",
    coordinate: [44.5136, 40.1772],
    title: "Republic Square",
    description: "Yerevan's central square and singing fountains.",
  },
  {
    id: "matenadaran",
    coordinate: [44.5215, 40.1916],
    title: "Matenadaran",
    description: "Repository of ancient Armenian manuscripts.",
  },
];

export const DIRECTIONS_WAYPOINTS: [number, number][] = [
  [44.5152, 40.1893],
  [44.5136, 40.1772],
];

export const MATRIX_SOURCES: [number, number][] = [
  [44.5152, 40.1893],
  [44.5136, 40.1772],
  [44.5028, 40.1936],
];

export const MATRIX_TARGETS: [number, number][] = [
  [44.5136, 40.1772],
  [44.5152, 40.1893],
  [44.5264, 40.1878],
];

export const ISOCHRONE_ORIGIN: [number, number] = [44.5136, 40.1772];

export const MAP_MATCH_TRACE: [number, number][] = [
  [44.5136, 40.1772],
  [44.5142, 40.179],
  [44.5148, 40.1815],
  [44.515, 40.184],
  [44.5152, 40.1872],
  [44.5152, 40.1893],
];

export const OPTIMIZE_STOPS: [number, number][] = [
  [44.5152, 40.1893],
  [44.5136, 40.1772],
  [44.5028, 40.1936],
  [44.5264, 40.1878],
];

export const SEARCH_SAMPLE = { q: "Yerevan", limit: 3 };

export const STATIC_IMAGE_SAMPLE = {
  lon: 44.51,
  lat: 40.18,
  zoom: 12,
  width: 128,
  height: 128,
  retina: false,
};

export const YEREVAN_CENTER: [number, number] = [44.5152, 40.1872];
export const DEFAULT_ZOOM = 12;
