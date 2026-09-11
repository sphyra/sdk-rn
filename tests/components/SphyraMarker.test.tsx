import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { lastProps } = vi.hoisted(() => ({ lastProps: {} as { marker?: any } }));

vi.mock("@maplibre/maplibre-react-native", async () => {
  const React = await import("react");
  return {
    PointAnnotation: (props: any) => {
      lastProps.marker = props;
      return React.createElement("div", { "data-testid": "marker" }, props.children);
    },
  };
});

import { createElement } from "react";
import { SphyraMarker } from "../../src/components/SphyraMarker";

beforeEach(() => {
  lastProps.marker = undefined;
});

afterEach(() => {
  cleanup();
});

describe("<SphyraMarker>", () => {
  it("MK1 — passes id/coordinate/draggable + renders children", () => {
    render(
      <SphyraMarker id="m1" coordinate={[44.5, 40.18]} draggable>
        {createElement("span", { "data-testid": "icon" }, "pin")}
      </SphyraMarker>,
    );

    expect(screen.queryByTestId("marker")).not.toBeNull();
    expect(lastProps.marker.id).toBe("m1");
    expect(lastProps.marker.coordinate).toEqual([44.5, 40.18]);
    expect(lastProps.marker.draggable).toBe(true);
    expect(screen.queryByTestId("icon")).not.toBeNull();
  });

  it("MK2 — onPress fires via onSelected", () => {
    const onPress = vi.fn();
    render(
      <SphyraMarker id="m1" coordinate={[44.5, 40.18]} onPress={onPress}>
        {createElement("span", null, "pin")}
      </SphyraMarker>,
    );

    lastProps.marker.onSelected();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("MK3 — onDragEnd parses payload geometry", () => {
    const onDragEnd = vi.fn();
    render(
      <SphyraMarker id="m1" coordinate={[44.5, 40.18]} draggable onDragEnd={onDragEnd}>
        {createElement("span", null, "pin")}
      </SphyraMarker>,
    );

    lastProps.marker.onDragEnd({ geometry: { coordinates: [44.5, 40.18] } });
    expect(onDragEnd).toHaveBeenCalledWith([44.5, 40.18]);
  });
});
