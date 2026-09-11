import { describe, expect, it } from "vitest";
import { mapNavigationProps } from "../../src/controls/navigation";

describe("mapNavigationProps", () => {
  it("NV1 — defaults: all four *Enabled true", () => {
    expect(mapNavigationProps()).toEqual({
      zoomEnabled: true,
      rotateEnabled: true,
      pitchEnabled: true,
      compassEnabled: true,
    });
  });

  it("NV2 — overrides: rotate/pitch off, others remain true", () => {
    expect(mapNavigationProps({ rotate: false, pitch: false })).toEqual({
      zoomEnabled: true,
      rotateEnabled: false,
      pitchEnabled: false,
      compassEnabled: true,
    });
  });
});
