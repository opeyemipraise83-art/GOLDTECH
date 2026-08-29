import { describe, it, expect } from "vitest";
import { EXPORT_PRESETS, matchPreset, getPreset } from "../exportPresets";

describe("export presets", () => {
  it("includes the platform presets plus custom", () => {
    const ids = EXPORT_PRESETS.map((p) => p.id);
    expect(ids).toContain("custom");
    expect(ids).toContain("tiktok");
    expect(ids).toContain("reels");
    expect(ids).toContain("shorts");
    expect(ids).toContain("youtube");
  });

  it("vertical presets are 9:16 and youtube is 16:9", () => {
    expect(getPreset("tiktok").aspect).toBe("9:16");
    expect(getPreset("reels").aspect).toBe("9:16");
    expect(getPreset("shorts").aspect).toBe("9:16");
    expect(getPreset("youtube").aspect).toBe("16:9");
  });

  it("every non-custom preset defines aspect, fps and quality", () => {
    for (const p of EXPORT_PRESETS.filter((x) => x.id !== "custom")) {
      expect(p.aspect).toBeTruthy();
      expect(typeof p.fps).toBe("number");
      expect(p.quality).toBeTruthy();
      expect(p.hint).toBeTruthy();
    }
  });

  it("matchPreset finds a preset from settings, else custom", () => {
    expect(matchPreset("9:16", 30, "full")).toBe("tiktok"); // first vertical match
    expect(matchPreset("16:9", 30, "full")).toBe("youtube");
    expect(matchPreset("16:9", 24, "full")).toBe("custom");
    expect(matchPreset("9:16", 30, "720p")).toBe("custom");
  });

  it("getPreset returns null for unknown ids", () => {
    expect(getPreset("nope")).toBeNull();
  });
});
