import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SphyraProvider, useSphyra } from "../../src/context/SphyraProvider";
import type { SphyraClient } from "../../src/SphyraClient";

function mockClient(): SphyraClient {
  return {
    reverseGeocode: vi.fn(),
    getTileConfig: vi.fn(),
  } as unknown as SphyraClient;
}

describe("SphyraProvider / useSphyra", () => {
  it("P1 — useSphyra returns the client inside the provider", () => {
    const client = mockClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SphyraProvider client={client}>{children}</SphyraProvider>
    );

    const { result } = renderHook(() => useSphyra(), { wrapper });

    expect(result.current).toBe(client);
  });

  it("P2 — useSphyra throws when used outside a provider", () => {
    // React logs the thrown render error; silence it for clean test output.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useSphyra())).toThrow(
        /must be used within a <SphyraProvider>/,
      );
    } finally {
      spy.mockRestore();
    }
  });
});
