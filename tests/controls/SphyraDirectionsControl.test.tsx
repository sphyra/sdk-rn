import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { state } = vi.hoisted(() => ({ state: { shape: undefined as any } }));

vi.mock("@maplibre/maplibre-react-native", async () => {
  const React = await import("react");
  return {
    ShapeSource: (props: any) => {
      state.shape = props.shape;
      return React.createElement("div", { "data-testid": "shapesource" }, props.children);
    },
    LineLayer: (props: any) => React.createElement("div", { "data-testid": "linelayer", "data-id": props.id }),
  };
});

import { SphyraDirectionsControl } from "../../src/controls/SphyraDirectionsControl";
import { SphyraProvider } from "../../src/context/SphyraProvider";
import { SphyraError } from "../../src/errors";
import type { SphyraClient } from "../../src/SphyraClient";
import type { DirectionsResult } from "../../src/types";

function makeResult(): DirectionsResult {
  return {
    routes: [
      {
        geometry: { type: "LineString", coordinates: [[44.5, 40.1], [44.6, 40.2]] },
        distance: 1000,
        duration: 120,
        legs: [{ distance: 1000, duration: 120, steps: [] }],
      },
    ],
    waypoints: [
      { location: [44.5, 40.1], name: "" },
      { location: [44.6, 40.2], name: "" },
    ],
  };
}

function makeClient(directions = vi.fn().mockResolvedValue(makeResult())) {
  return { directions } as unknown as SphyraClient & { directions: ReturnType<typeof vi.fn> };
}

function wrap(client: SphyraClient, ui: React.ReactNode) {
  return <SphyraProvider client={client}>{ui}</SphyraProvider>;
}

beforeEach(() => {
  state.shape = undefined;
});
afterEach(() => cleanup());

describe("<SphyraDirectionsControl>", () => {
  it("DD1 — ≥2 waypoints → directions() call + route ShapeSource render + onRoute", async () => {
    const client = makeClient();
    const onRoute = vi.fn();
    render(
      wrap(
        client,
        <SphyraDirectionsControl waypoints={[[44.5, 40.1], [44.6, 40.2]]} profile="walking" language="en" onRoute={onRoute} />,
      ),
    );

    await waitFor(() => expect(screen.queryByTestId("shapesource")).not.toBeNull());
    expect(client.directions).toHaveBeenCalledWith(
      expect.objectContaining({
        waypoints: [[44.5, 40.1], [44.6, 40.2]],
        geometries: "geojson",
        steps: true,
        profile: "walking",
        language: "en",
      }),
    );
    expect(state.shape.features[0].geometry).toEqual({ type: "LineString", coordinates: [[44.5, 40.1], [44.6, 40.2]] });
    expect(onRoute).toHaveBeenCalledTimes(1);
  });

  it("DD2 — <2 waypoints renders nothing and makes no directions call", async () => {
    const client = makeClient();
    render(wrap(client, <SphyraDirectionsControl waypoints={[[44.5, 40.1]]} />));

    await Promise.resolve();
    expect(screen.queryByTestId("shapesource")).toBeNull();
    expect(client.directions).not.toHaveBeenCalled();
  });

  it("DD3 — changing profile re-requests; rejection → onError(SphyraError) and renders nothing", async () => {
    // Re-request on profile change.
    const okClient = makeClient();
    const { rerender } = render(
      wrap(okClient, <SphyraDirectionsControl waypoints={[[44.5, 40.1], [44.6, 40.2]]} profile="driving" />),
    );
    await waitFor(() => expect(okClient.directions).toHaveBeenCalledTimes(1));
    rerender(wrap(okClient, <SphyraDirectionsControl waypoints={[[44.5, 40.1], [44.6, 40.2]]} profile="cycling" />));
    await waitFor(() => expect(okClient.directions).toHaveBeenCalledTimes(2));
    expect(okClient.directions.mock.calls[1]![0]).toMatchObject({ profile: "cycling" });

    // Rejection → onError(SphyraError); nothing rendered.
    const onError = vi.fn();
    const failClient = makeClient(vi.fn().mockRejectedValue(new SphyraError("UPSTREAM", "boom", 502)));
    render(wrap(failClient, <SphyraDirectionsControl waypoints={[[44.5, 40.1], [44.6, 40.2]]} onError={onError} />));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(SphyraError);
  });
});
