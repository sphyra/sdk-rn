import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { useGeocoderControl } from "../../src/controls/useGeocoderControl";
import { SphyraProvider } from "../../src/context/SphyraProvider";
import type { SphyraClient } from "../../src/SphyraClient";
import type { SearchFeature, SearchSuggestion, SearchSuggestResult } from "../../src/types";

const DEBOUNCE = 400;

function suggestion(): SearchSuggestion {
  return {
    id: "poi.1",
    name: "Cafe X",
    fullName: "Cafe X, Yerevan",
    placeType: "cafe",
    category: "amenity",
    coordinates: [44.51, 40.18],
    distance: null,
  };
}
function suggestResult(): SearchSuggestResult {
  return { suggestions: [suggestion()], attribution: "" };
}
function feature(): SearchFeature {
  return {
    id: "poi.1",
    name: "Cafe X",
    fullName: "Cafe X, Yerevan",
    placeType: "cafe",
    category: "amenity",
    coordinates: [44.51, 40.18],
    address: { street: null, city: "Yerevan", district: null, postalcode: null, country: "Armenia" },
    boundingBox: null,
  };
}

function mockClient(over: Partial<Record<"searchSuggest" | "searchRetrieve", unknown>> = {}): SphyraClient {
  return {
    searchSuggest: vi.fn().mockResolvedValue(suggestResult()),
    searchRetrieve: vi.fn().mockResolvedValue({ feature: feature() }),
    ...over,
  } as unknown as SphyraClient;
}

function wrap(client: SphyraClient) {
  return ({ children }: { children: ReactNode }) => <SphyraProvider client={client}>{children}</SphyraProvider>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useGeocoderControl", () => {
  it("GH1 — setQuery('ca') + 400ms → searchSuggest called; suggestions populated", async () => {
    const searchSuggest = vi.fn().mockResolvedValue(suggestResult());
    const client = mockClient({ searchSuggest });
    const { result } = renderHook(() => useGeocoderControl({ lang: "hy", proximity: [44.5, 40.18] }), {
      wrapper: wrap(client),
    });

    act(() => result.current.setQuery("ca"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(searchSuggest).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toEqual(suggestResult().suggestions);
  });

  it("GH2 — select() retrieves, sets selected + query to fullName, resolves feature", async () => {
    const searchRetrieve = vi.fn().mockResolvedValue({ feature: feature() });
    const client = mockClient({ searchRetrieve });
    const { result } = renderHook(() => useGeocoderControl({ lang: "hy" }), { wrapper: wrap(client) });

    let resolved: SearchFeature | null = null;
    await act(async () => {
      resolved = await result.current.select(suggestion());
    });

    expect(searchRetrieve).toHaveBeenCalledWith(expect.objectContaining({ id: "poi.1" }));
    expect(resolved).toEqual(feature());
    expect(result.current.selected).toEqual(feature());
    expect(result.current.query).toBe("Cafe X, Yerevan");
  });

  it("GH3 — clear() resets selected to null and query to ''", async () => {
    const client = mockClient();
    const { result } = renderHook(() => useGeocoderControl({ lang: "hy" }), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.select(suggestion());
    });
    expect(result.current.selected).not.toBeNull();

    act(() => result.current.clear());
    expect(result.current.selected).toBeNull();
    expect(result.current.query).toBe("");
  });
});
