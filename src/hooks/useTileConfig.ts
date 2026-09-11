import { useEffect, useRef, useState } from "react";
import type { SphyraClient } from "../SphyraClient";
import { SphyraError } from "../errors";
import type { TileConfigResponse } from "../types";

export interface TileConfigState {
  data: TileConfigResponse | null;
  loading: boolean;
  error: SphyraError | null;
}

/** Refetch this far ahead of expiry so a fresh URL is always ready before the old one dies. */
const REFRESH_LEAD_MS = 5 * 60 * 1000;

function toSphyraError(err: unknown): SphyraError {
  return err instanceof SphyraError
    ? err
    : new SphyraError("UNKNOWN", err instanceof Error ? err.message : "Unknown error");
}

/**
 * Fetches the signed tile config on mount and schedules a refetch 5 minutes
 * before `expiresAt` (which is Unix epoch *seconds* — hence the `* 1000`).
 * The refresh timer is cleared on unmount to avoid setState-after-unmount.
 */
export function useTileConfig(client: SphyraClient): TileConfigState {
  const [state, setState] = useState<TileConfigState>({
    data: null,
    loading: true,
    error: null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const data = await client.getTileConfig();
        if (cancelled) return;
        setState({ data, loading: false, error: null });
        const delay = Math.max(0, data.expiresAt * 1000 - Date.now() - REFRESH_LEAD_MS);
        timerRef.current = setTimeout(() => {
          void load();
        }, delay);
      } catch (err) {
        if (cancelled) return;
        setState({ data: null, loading: false, error: toSphyraError(err) });
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [client]);

  return state;
}
