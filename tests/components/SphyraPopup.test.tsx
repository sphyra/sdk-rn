import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { lastProps } = vi.hoisted(() => ({ lastProps: {} as { markerView?: any } }));

vi.mock("@maplibre/maplibre-react-native", async () => {
  const React = await import("react");
  return {
    MarkerView: (props: any) => {
      lastProps.markerView = props;
      return React.createElement("div", { "data-testid": "popup" }, props.children);
    },
  };
});

import { createElement } from "react";
import { SphyraPopup } from "../../src/components/SphyraPopup";

beforeEach(() => {
  lastProps.markerView = undefined;
});

afterEach(() => {
  cleanup();
});

describe("<SphyraPopup>", () => {
  it("PP1 — renders MarkerView at the coordinate with default anchor + content when visible unset", () => {
    render(
      <SphyraPopup coordinate={[44.5, 40.18]}>
        {createElement("span", { "data-testid": "content" }, "hi")}
      </SphyraPopup>,
    );

    expect(screen.queryByTestId("popup")).not.toBeNull();
    expect(lastProps.markerView.coordinate).toEqual([44.5, 40.18]);
    expect(lastProps.markerView.anchor).toEqual({ x: 0.5, y: 0 });
    expect(screen.queryByTestId("content")).not.toBeNull();
  });

  it("PP2 — visible:false renders nothing", () => {
    render(
      <SphyraPopup coordinate={[44.5, 40.18]} visible={false}>
        {createElement("span", null, "hi")}
      </SphyraPopup>,
    );

    expect(screen.queryByTestId("popup")).toBeNull();
  });

  it("PP3 — custom anchor flows through", () => {
    render(
      <SphyraPopup coordinate={[44.5, 40.18]} anchor={{ x: 0, y: 1 }}>
        {createElement("span", null, "hi")}
      </SphyraPopup>,
    );

    expect(lastProps.markerView.anchor).toEqual({ x: 0, y: 1 });
  });
});
