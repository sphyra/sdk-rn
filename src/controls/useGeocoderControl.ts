import { useCallback, useMemo, useState } from "react";
import { useSearchBox } from "../hooks/useSearchBox";
import type { SphyraError } from "../errors";
import type { GeocodeLang, SearchFeature, SearchSuggestion } from "../types";

export interface GeocoderControlState {
  query: string;
  setQuery: (q: string) => void;
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: SphyraError | null;
  selected: SearchFeature | null;
  /** Retrieve the full feature for a suggestion; sets `selected` + `query` on success. */
  select: (suggestion: SearchSuggestion) => Promise<SearchFeature | null>;
  clear: () => void;
}

/**
 * Headless geocoder control for RN: owns the query string, debounced suggestions (via
 * useSearchBox — 400ms, min 2 chars, proximity = map center supplied by the consumer), and a
 * select() that retrieves the full feature. The consumer renders the TextInput/list with their
 * own react-native primitives and flies the <SphyraMap> camera to `selected.coordinates`
 * (and/or drops a <SphyraMarker>). The RN SDK ships no react-native UI chrome by design.
 */
export function useGeocoderControl(params: {
  lang: GeocodeLang;
  proximity?: [number, number];
  limit?: number;
  enabled?: boolean;
}): GeocoderControlState {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchFeature | null>(null);
  const { suggestions, loading, error, retrieve } = useSearchBox({
    query,
    lang: params.lang,
    proximity: params.proximity,
    limit: params.limit,
    enabled: params.enabled,
  });

  const select = useCallback(
    async (s: SearchSuggestion): Promise<SearchFeature | null> => {
      const feature = await retrieve(s.id);
      if (feature) {
        setSelected(feature);
        setQuery(feature.fullName);
      }
      return feature;
    },
    [retrieve],
  );

  const clear = useCallback(() => {
    setSelected(null);
    setQuery("");
  }, []);

  return useMemo(
    () => ({ query, setQuery, suggestions, loading, error, selected, select, clear }),
    [query, suggestions, loading, error, selected, select, clear],
  );
}
