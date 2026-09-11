import { useEffect, useState } from "react";
import type { SphyraClient } from "../SphyraClient";
import { SphyraError } from "../errors";
import type { GeocodeLang, ReverseGeocodeResult } from "../types";

export interface ReverseGeocodeState {
  data: ReverseGeocodeResult | null;
  loading: boolean;
  error: SphyraError | null;
}

const DEBOUNCE_MS = 500;

function toSphyraError(err: unknown): SphyraError {
  return err instanceof SphyraError
    ? err
    : new SphyraError("UNKNOWN", err instanceof Error ? err.message : "Unknown error");
}

/**
 * Debounced (500ms) reverse geocode. When `params` is null the hook is idle.
 * Each effect run owns an AbortController; the cleanup clears the pending debounce
 * and aborts the controller, so a superseded in-flight response is discarded
 * before it can call setState (latest-wins — the client itself is not abortable).
 *
 * GDPR: never logs lat/lon/lang, the result, or displayName.
 */
export function useReverseGeocode(
  client: SphyraClient,
  params: { lat: number; lon: number; lang: GeocodeLang } | null,
): ReverseGeocodeState {
  const [state, setState] = useState<ReverseGeocodeState>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (params === null) {
      return;
    }
    const { lat, lon, lang } = params;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true }));
      client
        .reverseGeocode({ lat, lon, lang })
        .then((data) => {
          if (controller.signal.aborted) return;
          setState({ data, loading: false, error: null });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setState((prev) => ({ data: prev.data, loading: false, error: toSphyraError(err) }));
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [client, params?.lat, params?.lon, params?.lang]);

  return state;
}
