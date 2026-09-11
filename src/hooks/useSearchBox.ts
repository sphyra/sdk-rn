import { useCallback, useEffect, useRef, useState } from "react";
import { useSphyra } from "../context/SphyraProvider";
import { SphyraError } from "../errors";
import type { GeocodeLang, SearchSuggestion, SearchFeature } from "../types";

export interface SearchBoxState {
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: SphyraError | null;
  retrieve: (id: string) => Promise<SearchFeature | null>;
}

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

function toSphyraError(err: unknown): SphyraError {
  return err instanceof SphyraError
    ? err
    : new SphyraError("UNKNOWN", err instanceof Error ? err.message : "Unknown error");
}

/**
 * Debounced (400ms) Search-Box autocomplete. Mirrors useForwardGeocode: when disabled or the
 * trimmed query is shorter than two characters the hook makes no API call and clears results.
 * Each effect run owns an AbortController; the cleanup clears the pending debounce and aborts
 * so a superseded in-flight response is discarded before it can call setState (latest-wins).
 *
 * A single session token is generated once per hook instance and threaded into both
 * searchSuggest and the retrieve() callback (Search-Box API billing/caching parity), so a
 * retrieve after a suggest is a server-side cache hit. The user-typed query is never logged.
 */
export function useSearchBox(params: {
  query: string;
  lang: GeocodeLang;
  proximity?: [number, number];
  enabled?: boolean;
  limit?: number;
}): SearchBoxState {
  const client = useSphyra();
  const { query, lang, proximity, enabled = true, limit } = params;

  // One opaque session token per hook instance — no crypto/uuid dep.
  const sessionTokenRef = useRef<string>(Math.random().toString(36).slice(2));

  const [state, setState] = useState<{
    suggestions: SearchSuggestion[];
    loading: boolean;
    error: SphyraError | null;
  }>({ suggestions: [], loading: false, error: null });

  // Stable key for the proximity array so effect deps don't churn on identity.
  const proximityKey = proximity ? proximity.join(",") : "";

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      setState({ suggestions: [], loading: false, error: null });
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true }));
      client
        .searchSuggest({ q: trimmed, lang, limit, proximity, sessionToken: sessionTokenRef.current })
        .then((result) => {
          if (controller.signal.aborted) return;
          setState({ suggestions: result.suggestions, loading: false, error: null });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setState((prev) => ({ suggestions: prev.suggestions, loading: false, error: toSphyraError(err) }));
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // proximityKey stands in for the proximity array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, query, lang, enabled, limit, proximityKey]);

  const retrieve = useCallback(
    (id: string): Promise<SearchFeature | null> =>
      client
        .searchRetrieve({ id, lang, sessionToken: sessionTokenRef.current })
        .then((r) => r.feature)
        .catch(() => null),
    [client, lang],
  );

  return { ...state, retrieve };
}
