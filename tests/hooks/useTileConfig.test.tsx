import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTileConfig } from "../../src/hooks/useTileConfig";
import { SphyraError } from "../../src/errors";
import type { SphyraClient } from "../../src/SphyraClient";
import type { TileConfigResponse } from "../../src/types";

function mockClient(
  over: Partial<Record<"reverseGeocode" | "getTileConfig", unknown>> = {},
): SphyraClient {
  return {
    reverseGeocode: vi.fn(),
    getTileConfig: vi.fn(),
    ...over,
  } as unknown as SphyraClient;
}

/** A tile-config fixture whose expiry is `secondsFromNow` ahead of the (fake) clock. */
function tileFixture(secondsFromNow: number): TileConfigResponse {
  return {
    tileUrlTemplate: "http://127.0.0.1:4000/tiles/{z}/{x}/{y}?sig=abc",
    styleUrl: "http://127.0.0.1:4000/api/v1/map-style.json",
    expiresAt: Math.floor(Date.now() / 1000) + secondsFromNow,
    attribution: "© OpenStreetMap contributors",
  };
}

/** Flush pending promise microtasks under fake timers without advancing real delays. */
async function flush(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useTileConfig", () => {
  it("T1 — fetches on mount and returns data", async () => {
    const fixture = tileFixture(3600);
    const getTileConfig = vi.fn().mockResolvedValue(fixture);
    const client = mockClient({ getTileConfig });

    const { result } = renderHook(() => useTileConfig(client));
    await flush();

    expect(result.current.data).toEqual(fixture);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getTileConfig).toHaveBeenCalledTimes(1);
  });

  it("T2 — auto-refreshes 5 minutes before expiry", async () => {
    // 10 minutes out -> refresh scheduled at +5 min. Second response is far in the
    // future so the refetch does not immediately reschedule into a tight loop.
    const getTileConfig = vi
      .fn()
      .mockResolvedValueOnce(tileFixture(600))
      .mockResolvedValue(tileFixture(100_000));
    const client = mockClient({ getTileConfig });

    renderHook(() => useTileConfig(client));
    await flush();
    expect(getTileConfig).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(getTileConfig).toHaveBeenCalledTimes(2);
  });

  it("T3 — clears the refresh timer on unmount", async () => {
    const getTileConfig = vi.fn().mockResolvedValue(tileFixture(600));
    const client = mockClient({ getTileConfig });

    const { unmount } = renderHook(() => useTileConfig(client));
    await flush();
    expect(getTileConfig).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    // No refetch after unmount, and no setState-after-unmount warning.
    expect(getTileConfig).toHaveBeenCalledTimes(1);
  });

  it("T4 — surfaces a SphyraError from the fetch", async () => {
    const err = new SphyraError("UPSTREAM", "boom", 503);
    const getTileConfig = vi.fn().mockRejectedValue(err);
    const client = mockClient({ getTileConfig });

    const { result } = renderHook(() => useTileConfig(client));
    await flush();

    expect(result.current.error).toBe(err);
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
