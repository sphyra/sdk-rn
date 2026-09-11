import { useEffect, useState } from "react";
import { useSphyra } from "../context/SphyraProvider";
import { SphyraError } from "../errors";
import type { GeocodeLang, GeocodeResult } from "../types";

export interface ForwardGeocodeState {
  results: GeocodeResult[];
  loading: boolean;
  error: SphyraError | null;
}

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

function toSphyraError(err: unknown): SphyraError {
  return err instanceof SphyraError
    ? err
    : new SphyraError("UNKNOWN", err instanceof Error ? err.message : "Unknown error");
}

/**
 * Debounced (400ms) forward geocode for address search. Idle/guard branch:
 * when disabled or the trimmed query is shorter than two characters the hook
 * makes no API call and clears results. Each effect run owns an AbortController;
 * the cleanup clears the pending debounce and aborts the controller, so a
 * superseded in-flight response is discarded before it can call setState
 * (latest-wins — the client itself is not abortable).
 *
 * The user-typed query is never logged.
 */
export function useForwardGeocode(params: {
  query: string;
  lang: GeocodeLang;
  enabled?: boolean;
  limit?: number;
}): ForwardGeocodeState {
  const client = useSphyra();
  const { query, lang, enabled = true, limit } = params;

  const [state, setState] = useState<ForwardGeocodeState>({
    results: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true }));
      client
        .forwardGeocode({ q: trimmed, lang, limit })
        .then((results) => {
          if (controller.signal.aborted) return;
          setState({ results, loading: false, error: null });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setState((prev) => ({ results: prev.results, loading: false, error: toSphyraError(err) }));
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [client, query, lang, enabled, limit]);

  return state;
}
