import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const { lastProps } = vi.hoisted(() => ({ lastProps: {} as { userLocation?: any } }));

vi.mock("@maplibre/maplibre-react-native", async () => {
  const React = await import("react");
  return {
    UserLocation: (props: any) => {
      lastProps.userLocation = props;
      return React.createElement("div", { "data-testid": "userlocation" });
    },
  };
});

import { SphyraGeolocateControl } from "../../src/controls/SphyraGeolocateControl";

beforeEach(() => {
  lastProps.userLocation = undefined;
});
afterEach(() => cleanup());

describe("<SphyraGeolocateControl>", () => {
  it("GL1 — defaults: visible true, renderMode 'normal', showsUserHeadingIndicator true", () => {
    render(<SphyraGeolocateControl />);
    expect(lastProps.userLocation.visible).toBe(true);
    expect(lastProps.userLocation.renderMode).toBe("normal");
    expect(lastProps.userLocation.showsUserHeadingIndicator).toBe(true);
  });

  it("GL2 — overrides + onPress/onUpdate flow through", () => {
    const onPress = vi.fn();
    const onUpdate = vi.fn();
    render(
      <SphyraGeolocateControl
        visible={false}
        renderMode="native"
        showsUserHeadingIndicator={false}
        onPress={onPress}
        onUpdate={onUpdate}
      />,
    );
    expect(lastProps.userLocation.visible).toBe(false);
    expect(lastProps.userLocation.renderMode).toBe("native");
    expect(lastProps.userLocation.showsUserHeadingIndicator).toBe(false);
    expect(lastProps.userLocation.onPress).toBe(onPress);
    expect(lastProps.userLocation.onUpdate).toBe(onUpdate);
  });
});
