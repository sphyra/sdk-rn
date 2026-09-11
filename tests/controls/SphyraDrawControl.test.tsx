import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { act, cleanup, render } from "@testing-library/react";

const { state } = vi.hoisted(() => ({
  state: { shape: undefined as any, layers: [] as string[] },
}));

vi.mock("@maplibre/maplibre-react-native", async () => {
  const React = await import("react");
  const layer = (testid: string) => (props: any) => {
    state.layers.push(props.id);
    return React.createElement("div", { "data-testid": testid });
  };
  return {
    ShapeSource: (props: any) => {
      state.shape = props.shape;
      return React.createElement("div", { "data-testid": "shapesource" }, props.children);
    },
    CircleLayer: layer("circlelayer"),
    LineLayer: layer("linelayer"),
    FillLayer: layer("filllayer"),
  };
});

import { SphyraDrawControl, type SphyraDrawControlHandle } from "../../src/controls/SphyraDrawControl";

beforeEach(() => {
  state.shape = undefined;
  state.layers = [];
});
afterEach(() => cleanup());

function suffixes(): string[] {
  return state.layers.map((id) => id.replace(/^sphyra-draw-/, ""));
}

describe("<SphyraDrawControl>", () => {
  it("DC1 — layer set per mode (point→circle; line→line+circle; polygon→fill+line+circle)", () => {
    render(<SphyraDrawControl mode="point" />);
    expect(suffixes()).toEqual(["vertices"]);

    cleanup();
    state.layers = [];
    render(<SphyraDrawControl mode="line" />);
    expect(suffixes().sort()).toEqual(["line", "vertices"]);

    cleanup();
    state.layers = [];
    render(<SphyraDrawControl mode="polygon" />);
    expect(suffixes().sort()).toEqual(["fill", "line", "vertices"]);
  });

  it("DC2 — addVertex updates the rendered ShapeSource.shape; onChange fired with the FC", () => {
    const onChange = vi.fn();
    const ref = createRef<SphyraDrawControlHandle>();
    render(<SphyraDrawControl mode="point" ref={ref} onChange={onChange} />);

    act(() => ref.current!.addVertex([44.5, 40.1]));

    expect(state.shape.features).toHaveLength(1);
    expect(state.shape.features[0].geometry).toEqual({ type: "Point", coordinates: [44.5, 40.1] });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "FeatureCollection", features: expect.any(Array) }),
    );
  });

  it("DC3 — undo removes last vertex; clear empties; getFeatures returns current FC", () => {
    const ref = createRef<SphyraDrawControlHandle>();
    render(<SphyraDrawControl mode="line" ref={ref} />);

    act(() => ref.current!.addVertex([44.5, 40.1]));
    act(() => ref.current!.addVertex([44.6, 40.2]));
    act(() => ref.current!.addVertex([44.7, 40.3]));
    act(() => ref.current!.undo());
    expect(ref.current!.getFeatures().features[0]!.geometry).toEqual({
      type: "LineString",
      coordinates: [[44.5, 40.1], [44.6, 40.2]],
    });

    act(() => ref.current!.clear());
    expect(ref.current!.getFeatures().features).toHaveLength(0);
  });
});
