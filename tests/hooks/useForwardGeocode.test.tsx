import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { useForwardGeocode } from "../../src/hooks/useForwardGeocode";
import { SphyraProvider } from "../../src/context/SphyraProvider";
import { SphyraError } from "../../src/errors";
import type { SphyraClient } from "../../src/SphyraClient";
import type { GeocodeResult } from "../../src/types";

const DEBOUNCE = 400;

function mockClient(
  over: Partial<
    Record<"forwardGeocode" | "reverseGeocode" | "getTileConfig", unknown>
  > = {},
): SphyraClient {
  return {
    forwardGeocode: vi.fn(),
    reverseGeocode: vi.fn(),
    getTileConfig: vi.fn(),
    ...over,
  } as unknown as SphyraClient;
}

function wrap(client: SphyraClient) {
  return ({ children }: { children: ReactNode }) => (
    <SphyraProvider client={client}>{children}</SphyraProvider>
  );
}

function hit(name: string): GeocodeResult {
  return { displayName: name, lat: 40.18, lon: 44.51, boundingBox: [0, 0, 0, 0], type: "city" };
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

type P = { query: string; lang: "hy" | "en" | "ru"; enabled?: boolean; limit?: number };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useForwardGeocode", () => {
  it("F1 — query < 2 chars never fetches and keeps empty state", async () => {
    const forwardGeocode = vi.fn();
    const client = mockClient({ forwardGeocode });

    const { result: hook } = renderHook(() => useForwardGeocode({ query: "Y", lang: "hy" }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(forwardGeocode).not.toHaveBeenCalled();
    expect(hook.current).toEqual({ results: [], loading: false, error: null });
  });

  it("F2 — query >= 2 chars debounces 400ms then calls the client once", async () => {
    const fixture = [hit("Yerevan")];
    const forwardGeocode = vi.fn().mockResolvedValue(fixture);
    const client = mockClient({ forwardGeocode });

    const { result: hook } = renderHook(() => useForwardGeocode({ query: "Yere", lang: "hy" }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE - 1);
    });
    expect(forwardGeocode).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(forwardGeocode).toHaveBeenCalledTimes(1);
    expect(forwardGeocode).toHaveBeenCalledWith({ q: "Yere", lang: "hy", limit: undefined });
    expect(hook.current.results).toEqual(fixture);
  });

  it("F3 — enabled: false never fetches and clears results", async () => {
    const forwardGeocode = vi.fn();
    const client = mockClient({ forwardGeocode });

    const { result: hook } = renderHook(
      () => useForwardGeocode({ query: "Yere", lang: "hy", enabled: false }),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(forwardGeocode).not.toHaveBeenCalled();
    expect(hook.current.results).toEqual([]);
  });

  it("F4 — query change mid-debounce cancels the previous debounce", async () => {
    const forwardGeocode = vi.fn().mockResolvedValue([]);
    const client = mockClient({ forwardGeocode });

    const { rerender } = renderHook(({ p }: { p: P }) => useForwardGeocode(p), {
      wrapper: wrap(client),
      initialProps: { p: { query: "Ye", lang: "hy" } },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(forwardGeocode).not.toHaveBeenCalled();

    rerender({ p: { query: "Yer", lang: "hy" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(forwardGeocode).toHaveBeenCalledTimes(1);
    expect(forwardGeocode).toHaveBeenCalledWith({ q: "Yer", lang: "hy", limit: undefined });
  });

  it("F5 — superseded in-flight response is discarded (latest-wins)", async () => {
    const dA = deferred<GeocodeResult[]>();
    const dB = deferred<GeocodeResult[]>();
    const forwardGeocode = vi
      .fn()
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);
    const client = mockClient({ forwardGeocode });

    const { result: hook, rerender } = renderHook(({ p }: { p: P }) => useForwardGeocode(p), {
      wrapper: wrap(client),
      initialProps: { p: { query: "Ye", lang: "hy" } },
    });

    // Fire A's debounce; A is now in flight.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    expect(forwardGeocode).toHaveBeenCalledTimes(1);

    // Change query before A resolves -> A's controller is aborted.
    rerender({ p: { query: "Yer", lang: "hy" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    expect(forwardGeocode).toHaveBeenCalledTimes(2);

    // Resolve the stale A and the current B; only B must win.
    await act(async () => {
      dA.resolve([hit("A-stale")]);
      dB.resolve([hit("B-fresh")]);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(hook.current.results).toEqual([hit("B-fresh")]);
  });

  it("F6 — surfaces a SphyraError from the client", async () => {
    const err = new SphyraError("UPSTREAM", "boom", 503);
    const forwardGeocode = vi.fn().mockRejectedValue(err);
    const client = mockClient({ forwardGeocode });

    const { result: hook } = renderHook(() => useForwardGeocode({ query: "Yere", lang: "hy" }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(hook.current.error).toBe(err);
    expect(hook.current.loading).toBe(false);
  });

  it("F7 — clearing input clears results with no new call", async () => {
    const forwardGeocode = vi.fn().mockResolvedValue([hit("Yerevan")]);
    const client = mockClient({ forwardGeocode });

    const { result: hook, rerender } = renderHook(({ p }: { p: P }) => useForwardGeocode(p), {
      wrapper: wrap(client),
      initialProps: { p: { query: "Yere", lang: "hy" } },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    expect(forwardGeocode).toHaveBeenCalledTimes(1);
    expect(hook.current.results).toEqual([hit("Yerevan")]);

    rerender({ p: { query: "", lang: "hy" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(forwardGeocode).toHaveBeenCalledTimes(1);
    expect(hook.current.results).toEqual([]);
  });

  it("F8 — limit is forwarded to the client", async () => {
    const forwardGeocode = vi.fn().mockResolvedValue([]);
    const client = mockClient({ forwardGeocode });

    renderHook(() => useForwardGeocode({ query: "Yere", lang: "hy", limit: 5 }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(forwardGeocode).toHaveBeenCalledWith({ q: "Yere", lang: "hy", limit: 5 });
  });
});
