import type { SphyraClient } from "@sphyra/react-native";
import type {
  DirectionsParams,
  IsochroneParams,
  MapMatchParams,
  MatrixParams,
  OptimizationParams,
  SearchSuggestParams,
  TilequeryParams,
} from "@sphyra/react-native";

export type ServiceId =
  | "directions"
  | "matrix"
  | "isochrone"
  | "mapMatch"
  | "optimize"
  | "tilequery"
  | "search"
  | "reverse";

export interface ServiceResult {
  id: ServiceId;
  ok: true;
  data: unknown;
}

export async function runService(
  client: SphyraClient,
  id: ServiceId,
  input: unknown,
): Promise<ServiceResult> {
  switch (id) {
    case "directions": {
      const data = await client.directions(input as DirectionsParams);
      return { id, ok: true, data };
    }
    case "matrix": {
      const data = await client.matrix(input as MatrixParams);
      return { id, ok: true, data };
    }
    case "isochrone": {
      const data = await client.isochrone(input as IsochroneParams);
      return { id, ok: true, data };
    }
    case "mapMatch": {
      const data = await client.mapMatch(input as MapMatchParams);
      return { id, ok: true, data };
    }
    case "optimize": {
      const data = await client.optimize(input as OptimizationParams);
      return { id, ok: true, data };
    }
    case "tilequery": {
      const params = input as TilequeryParams;
      const data = await client.tilequery(params);
      return { id, ok: true, data };
    }
    case "search": {
      const data = await client.searchSuggest(input as SearchSuggestParams);
      return { id, ok: true, data };
    }
    case "reverse": {
      const [lon, lat] = input as [number, number];
      const data = await client.reverseGeocode({ lon, lat, lang: "hy" });
      return { id, ok: true, data };
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
