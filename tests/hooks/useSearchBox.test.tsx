import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { useSearchBox } from "../../src/hooks/useSearchBox";
import { SphyraProvider } from "../../src/context/SphyraProvider";
import { SphyraError } from "../../src/errors";
import type { SphyraClient } from "../../src/SphyraClient";
import type { SearchSuggestResult, SearchRetrieveResult, SearchSuggestion, SearchFeature } from "../../src/types";

const DEBOUNCE = 400;

function mockClient(
  over: Partial<Record<"searchSuggest" | "searchRetrieve", unknown>> = {},
): SphyraClient {
  return {
    searchSuggest: vi.fn(),
    searchRetrieve: vi.fn(),
    ...over,
  } as unknown as SphyraClient;
}

function wrap(client: SphyraClient) {
  return ({ children }: { children: ReactNode }) => (
    <SphyraProvider client={client}>{children}</SphyraProvider>
  );
}

function suggestion(name: string): SearchSuggestion {
  return {
    id: `N${name.length}`,
    name,
    fullName: `${name}, Yerevan`,
    placeType: "cafe",
    category: "amenity",
    coordinates: [44.51, 40.18],
    distance: null,
  };
}

function suggestResult(name: string): SearchSuggestResult {
  return { suggestions: [suggestion(name)], attribution: "© OpenStreetMap contributors" };
}

function feature(name: string): SearchFeature {
  return {
    id: `N${name.length}`,
    name,
    fullName: `${name}, Yerevan`,
    placeType: "cafe",
    category: "amenity",
    coordinates: [44.51, 40.18],
    address: { street: null, city: "Yerevan", district: null, postalcode: null, country: "Armenia" },
    boundingBox: null,
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

type P = { query: string; lang: "hy" | "en" | "ru"; proximity?: [number, number]; enabled?: boolean; limit?: number };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSearchBox", () => {
  it("S1 — query < 2 chars never fetches and keeps empty suggestions", async () => {
    const searchSuggest = vi.fn();
    const client = mockClient({ searchSuggest });

    const { result: hook } = renderHook(() => useSearchBox({ query: "Y", lang: "hy" }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(searchSuggest).not.toHaveBeenCalled();
    expect(hook.current.suggestions).toEqual([]);
    expect(hook.current.loading).toBe(false);
  });

  it("S2 — query >= 2 chars debounces 400ms then calls searchSuggest once with a session token", async () => {
    const searchSuggest = vi.fn().mockResolvedValue(suggestResult("Yerevan"));
    const client = mockClient({ searchSuggest });

    const { result: hook } = renderHook(
      () => useSearchBox({ query: "Yere", lang: "hy", limit: 5, proximity: [44.51, 40.18] }),
      { wrapper: wrap(client) },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE - 1);
    });
    expect(searchSuggest).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(searchSuggest).toHaveBeenCalledTimes(1);
    const args = searchSuggest.mock.calls[0]?.[0] as { q: string; lang: string; limit?: number; proximity?: [number, number]; sessionToken?: string };
    expect(args).toMatchObject({ q: "Yere", lang: "hy", limit: 5, proximity: [44.51, 40.18] });
    expect(typeof args.sessionToken).toBe("string");
    expect((args.sessionToken ?? "").length).toBeGreaterThan(0);
    expect(hook.current.suggestions).toEqual(suggestResult("Yerevan").suggestions);
  });

  it("S3 — enabled: false never fetches", async () => {
    const searchSuggest = vi.fn();
    const client = mockClient({ searchSuggest });

    renderHook(() => useSearchBox({ query: "Yere", lang: "hy", enabled: false }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(searchSuggest).not.toHaveBeenCalled();
  });

  it("S4 — query change mid-debounce cancels the previous debounce (one call)", async () => {
    const searchSuggest = vi.fn().mockResolvedValue(suggestResult("Yer"));
    const client = mockClient({ searchSuggest });

    const { rerender } = renderHook(({ p }: { p: P }) => useSearchBox(p), {
      wrapper: wrap(client),
      initialProps: { p: { query: "Ye", lang: "hy" } },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(searchSuggest).not.toHaveBeenCalled();

    rerender({ p: { query: "Yer", lang: "hy" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(searchSuggest).toHaveBeenCalledTimes(1);
    expect((searchSuggest.mock.calls[0]?.[0] as { q: string }).q).toBe("Yer");
  });

  it("S5 — superseded in-flight response is discarded (latest-wins)", async () => {
    const dA = deferred<SearchSuggestResult>();
    const dB = deferred<SearchSuggestResult>();
    const searchSuggest = vi.fn().mockReturnValueOnce(dA.promise).mockReturnValueOnce(dB.promise);
    const client = mockClient({ searchSuggest });

    const { result: hook, rerender } = renderHook(({ p }: { p: P }) => useSearchBox(p), {
      wrapper: wrap(client),
      initialProps: { p: { query: "Ye", lang: "hy" } },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    expect(searchSuggest).toHaveBeenCalledTimes(1);

    rerender({ p: { query: "Yer", lang: "hy" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    expect(searchSuggest).toHaveBeenCalledTimes(2);

    await act(async () => {
      dA.resolve(suggestResult("A-stale"));
      dB.resolve(suggestResult("B-fresh"));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(hook.current.suggestions).toEqual(suggestResult("B-fresh").suggestions);
  });

  it("S6 — surfaces a SphyraError from the client", async () => {
    const err = new SphyraError("UPSTREAM", "boom", 503);
    const searchSuggest = vi.fn().mockRejectedValue(err);
    const client = mockClient({ searchSuggest });

    const { result: hook } = renderHook(() => useSearchBox({ query: "Yere", lang: "hy" }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(hook.current.error).toBe(err);
    expect(hook.current.loading).toBe(false);
  });

  it("S7 — retrieve(id) uses the same session token as suggest; returns the feature or null", async () => {
    const searchSuggest = vi.fn().mockResolvedValue(suggestResult("Yerevan"));
    const searchRetrieve = vi.fn<[unknown], Promise<SearchRetrieveResult>>().mockResolvedValue({ feature: feature("Looked Up") });
    const client = mockClient({ searchSuggest, searchRetrieve });

    const { result: hook } = renderHook(() => useSearchBox({ query: "Yere", lang: "hy" }), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });
    const suggestToken = (searchSuggest.mock.calls[0]?.[0] as { sessionToken?: string }).sessionToken;

    let resolved: SearchFeature | null = null;
    await act(async () => {
      resolved = await hook.current.retrieve("N7");
    });

    expect(searchRetrieve).toHaveBeenCalledWith({ id: "N7", lang: "hy", sessionToken: suggestToken });
    expect(resolved).toEqual(feature("Looked Up"));

    // Rejection → null.
    searchRetrieve.mockRejectedValueOnce(new SphyraError("NOT_FOUND", "nope", 404));
    let nullResult: SearchFeature | null = feature("x");
    await act(async () => {
      nullResult = await hook.current.retrieve("N404");
    });
    expect(nullResult).toBeNull();
  });
});
