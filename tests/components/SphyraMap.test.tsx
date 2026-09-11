import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

// Capture the props handed to the mocked native MapView/Camera so we can assert on them.
const { lastProps, cameraSetCamera } = vi.hoisted(() => ({
  lastProps: {} as { mapView?: any; camera?: any },
  cameraSetCamera: vi.fn(),
}));

vi.mock("@maplibre/maplibre-react-native", async () => {
  const React = await import("react");
  return {
    MapView: (props: any) => {
      lastProps.mapView = props;
      return React.createElement("div", { "data-testid": "mapview" }, props.children);
    },
    Camera: React.forwardRef((props: any, ref: any) => {
      lastProps.camera = props;
      React.useImperativeHandle(ref, () => ({ setCamera: cameraSetCamera }));
      return React.createElement("div", { "data-testid": "camera" });
    }),
  };
});

import { SphyraMap, type SphyraMapHandle } from "../../src/components/SphyraMap";
import { SphyraProvider } from "../../src/context/SphyraProvider";
import { SphyraError } from "../../src/errors";
import type { SphyraClient } from "../../src/SphyraClient";

function fakeStyle() {
  return {
    version: 8,
    light: { anchor: "viewport", color: "#ffffff", intensity: 0.5 },
    layers: [
      { id: "background", paint: { "background-color": "#f5f5f5" } },
      { id: "buildings-3d", layout: {} },
      { id: "terrain-hillshade", layout: {} },
    ],
    metadata: {
      "sphyra:presets": {
        day: {
          light: { anchor: "viewport", color: "#ffffff", intensity: 0.5 },
          layers: { background: { "background-color": "#e8e8e8" } },
        },
        night: {
          light: { anchor: "viewport", color: "#0b1020", intensity: 0.2 },
          layers: { background: { "background-color": "#0b1020" } },
        },
      },
      "sphyra:modes": {
        "2d": { hiddenLayers: ["buildings-3d", "terrain-hillshade"], terrain: null, pitch: 0 },
        "3d": { hiddenLayers: [], terrain: { source: "sphyra_terrain", exaggeration: 1 }, pitch: 45 },
      },
    },
  };
}

function makeClient(getMapStyle = vi.fn().mockResolvedValue(fakeStyle())) {
  return { getMapStyle } as unknown as SphyraClient & { getMapStyle: ReturnType<typeof vi.fn> };
}

const layer = (style: any, id: string) =>
  (style.layers as any[]).find((l) => l.id === id);

beforeEach(() => {
  lastProps.mapView = undefined;
  lastProps.camera = undefined;
  cameraSetCamera.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("<SphyraMap>", () => {
  it("S1 — renders MapView with the baked style once loaded (preset honoured)", async () => {
    const client = makeClient();

    render(
      <SphyraProvider client={client}>
        <SphyraMap preset="night" mode="3d" />
      </SphyraProvider>,
    );

    await waitFor(() => expect(screen.queryByTestId("mapview")).not.toBeNull());
    expect(layer(lastProps.mapView.mapStyle, "background").paint["background-color"]).toBe("#0b1020");
  });

  it("S2 — passes camera props (pitch defaults to the mode table value)", async () => {
    const client = makeClient();

    render(
      <SphyraProvider client={client}>
        <SphyraMap mode="3d" center={[44.5, 40.18]} zoom={12} />
      </SphyraProvider>,
    );

    await waitFor(() => expect(screen.queryByTestId("camera")).not.toBeNull());
    expect(lastProps.camera.centerCoordinate).toEqual([44.5, 40.18]);
    expect(lastProps.camera.zoomLevel).toBe(12);
    expect(lastProps.camera.pitch).toBe(45);
  });

  it("S3 — changing mode re-bakes locally without a second getMapStyle call", async () => {
    const client = makeClient();

    const { rerender } = render(
      <SphyraProvider client={client}>
        <SphyraMap mode="3d" />
      </SphyraProvider>,
    );
    await waitFor(() => expect(screen.queryByTestId("mapview")).not.toBeNull());
    expect(layer(lastProps.mapView.mapStyle, "buildings-3d").layout.visibility).toBe("visible");

    rerender(
      <SphyraProvider client={client}>
        <SphyraMap mode="2d" />
      </SphyraProvider>,
    );
    await waitFor(() =>
      expect(layer(lastProps.mapView.mapStyle, "buildings-3d").layout.visibility).toBe("none"),
    );
    expect(client.getMapStyle).toHaveBeenCalledTimes(1);
  });

  it("S4 — onLoad fires from onDidFinishLoadingMap; onRegionChange forwards onRegionDidChange", async () => {
    const client = makeClient();
    const onLoad = vi.fn();
    const onRegionChange = vi.fn();

    render(
      <SphyraProvider client={client}>
        <SphyraMap onLoad={onLoad} onRegionChange={onRegionChange} />
      </SphyraProvider>,
    );
    await waitFor(() => expect(screen.queryByTestId("mapview")).not.toBeNull());

    act(() => lastProps.mapView.onDidFinishLoadingMap());
    expect(onLoad).toHaveBeenCalledTimes(1);

    const region = { properties: { zoom: 12 } };
    act(() => lastProps.mapView.onRegionDidChange(region));
    expect(onRegionChange).toHaveBeenCalledWith(region);
  });

  it("S5 — fetch failure → onError(SphyraError) and renders nothing", async () => {
    const err = new SphyraError("UPSTREAM", "style boom", 502);
    const client = makeClient(vi.fn().mockRejectedValue(err));
    const onError = vi.fn();

    render(
      <SphyraProvider client={client}>
        <SphyraMap onError={onError} />
      </SphyraProvider>,
    );

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(SphyraError);
    expect(screen.queryByTestId("mapview")).toBeNull();
  });

  it("S6 — the imperative ref exposes a working setCamera that delegates to the Camera", async () => {
    const client = makeClient();
    const ref = createRef<SphyraMapHandle>();

    render(
      <SphyraProvider client={client}>
        <SphyraMap ref={ref} mode="3d" />
      </SphyraProvider>,
    );
    await waitFor(() => expect(screen.queryByTestId("camera")).not.toBeNull());

    expect(typeof ref.current?.setCamera).toBe("function");
    act(() => ref.current!.setCamera({ center: [44.6, 40.2], zoom: 14 }));
    expect(cameraSetCamera).toHaveBeenCalledTimes(1);
    expect(cameraSetCamera.mock.calls[0]![0]).toMatchObject({
      centerCoordinate: [44.6, 40.2],
      zoomLevel: 14,
    });
  });
});
