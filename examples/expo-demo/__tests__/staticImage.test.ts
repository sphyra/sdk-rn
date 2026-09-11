import { afterEach, describe, expect, it, vi } from "vitest";
import { SphyraError } from "@sphyra/react-native";
import { buildStaticPath, fetchStaticImageDataUri } from "../src/services/staticImage";

const CFG = { baseUrl: "http://192.168.1.50:4000", apiKey: "sphyra_dev_local" };

describe("fetchStaticImageDataUri", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the static PNG path with Bearer auth", async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => png.buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const params = { lon: 44.51, lat: 40.18, zoom: 12, width: 128, height: 128 };
    const uri = await fetchStaticImageDataUri(CFG, params);

    expect(fetchMock).toHaveBeenCalledWith(
      `${CFG.baseUrl}${buildStaticPath(params)}`,
      { headers: { Authorization: `Bearer ${CFG.apiKey}` } },
    );
    expect(uri.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("appends @2x for retina", async () => {
    expect(buildStaticPath({ lon: 1, lat: 2, zoom: 3, width: 64, height: 64, retina: true })).toBe(
      "/api/v1/static/1,2,3/64x64@2x.png",
    );
  });

  it("throws SphyraError on API error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error: { code: "VALIDATION_ERROR", message: "bad dims" } }),
      }),
    );

    await expect(
      fetchStaticImageDataUri(CFG, { lon: 44.51, lat: 40.18, zoom: 12, width: 128, height: 128 }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", message: "bad dims" });
  });
});
