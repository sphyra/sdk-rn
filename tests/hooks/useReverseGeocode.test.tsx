import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReverseGeocode } from "../../src/hooks/useReverseGeocode";
import { SphyraError } from "../../src/errors";
import type { SphyraClient } from "../../src/SphyraClient";
import type { GeocodeLang, ReverseGeocodeResult } from "../../src/types";

const DEBOUNCE = 500;

type Params = { lat: number; lon: number; lang: GeocodeLang };

function mockClient(
  over: Partial<Record<"reverseGeocode" | "getTileConfig", unknown>> = {},
): SphyraClient {
  return {
    reverseGeocode: vi.fn(),
    getTileConfig: vi.fn(),
    ...over,
  } as unknown as SphyraClient;
}

function result(lat: number, lon: number): ReverseGeocodeResult {
  return {
    displayName: `Place ${lat},${lon}`,
    city: "Yerevan",
    district: null,
    street: null,
    country: "Armenia",
    lat,
    lon,
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useReverseGeocode", () => {
  it("R1 — null params never triggers a fetch", async () => {
    const reverseGeocode = vi.fn();
    const client = mockClient({ reverseGeocode });

    const { result: hook } = renderHook(() => useReverseGeocode(client, null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(hook.current).toEqual({ data: null, loading: false, error: null });
  });

  it("R2 — debounces 500ms then calls the client once", async () => {
    const fixture = result(40.18, 44.51);
    const reverseGeocode = vi.fn().mockResolvedValue(fixture);
    const client = mockClient({ reverseGeocode });

    const { result: hook } = renderHook(() =>
      useReverseGeocode(client, { lat: 40.18, lon: 44.51, lang: "hy" }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE - 1);
    });
    expect(reverseGeocode).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(reverseGeocode).toHaveBeenCalledTimes(1);
    expect(hook.current.data).toEqual(fixture);
  });

  it("R3 — params change mid-debounce cancels the previous debounce", async () => {
    const reverseGeocode = vi.fn().mockResolvedValue(result(2, 2));
    const client = mockClient({ reverseGeocode });

    const { rerender } = renderHook(
      ({ p }: { p: Params }) => useReverseGeocode(client, p),
      { initialProps: { p: { lat: 1, lon: 1, lang: "hy" } } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(reverseGeocode).not.toHaveBeenCalled();

    rerender({ p: { lat: 2, lon: 2, lang: "hy" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(reverseGeocode).toHaveBeenCalledTimes(1);
    expect(reverseGeocode).toHaveBeenCalledWith({ lat: 2, lon: 2, lang: "hy" });
  });

  it("R4 — superseded in-flight response is discarded (latest-wins)", async () => {
    const dA = deferred<ReverseGeocodeResult>();
    const dB = deferred<ReverseGeocodeResult>();
    const reverseGeocode = vi
      .fn()
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);
    const client = mockClient({ reverseGeocode });

    const { result: hook, rerender } = renderHook(
      ({ p }: { p: Params }) => useReverseGeocode(client, p),
      { initialProps: { p: { lat: 1, lon: 1, lang: "hy" } } },
    );

    // Fire A's debounce; A is now in flight.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    expect(reverseGeocode).toHaveBeenCalledTimes(1);

    // Change params before A resolves -> A's controller is aborted.
    rerender({ p: { lat: 2, lon: 2, lang: "hy" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    expect(reverseGeocode).toHaveBeenCalledTimes(2);

    // Resolve the stale A and the current B; only B must win.
    await act(async () => {
      dA.resolve(result(1, 1));
      dB.resolve(result(2, 2));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(hook.current.data).toEqual(result(2, 2));
  });

  it("R5 — surfaces a SphyraError from the client", async () => {
    const err = new SphyraError("UPSTREAM", "boom", 503);
    const reverseGeocode = vi.fn().mockRejectedValue(err);
    const client = mockClient({ reverseGeocode });

    const { result: hook } = renderHook(() =>
      useReverseGeocode(client, { lat: 40.18, lon: 44.51, lang: "hy" }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(hook.current.error).toBe(err);
    expect(hook.current.loading).toBe(false);
  });
});
