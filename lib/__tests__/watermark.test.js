import { describe, it, expect } from "vitest";
import { logoRect, LOGO_POSITION_LIST } from "../watermark.js";

const img = (w, h) => ({ naturalWidth: w, naturalHeight: h });

describe("logoRect", () => {
  it("returns null for a missing or zero-size image", () => {
    expect(logoRect(null, 1920, 1080)).toBeNull();
    expect(logoRect(img(0, 0), 1920, 1080)).toBeNull();
  });

  it("sizes the logo as a fraction of frame width, preserving aspect", () => {
    const r = logoRect(img(200, 100), 1000, 1000, { position: "br", size: 0.2 });
    expect(r.w).toBeCloseTo(200, 5);   // 20% of 1000
    expect(r.h).toBeCloseTo(100, 5);   // half of width (2:1 image)
  });

  it("positions bottom-right inside the frame with a margin", () => {
    const r = logoRect(img(100, 100), 1000, 1000, { position: "br", size: 0.1 });
    expect(r.x + r.w).toBeLessThan(1000);
    expect(r.y + r.h).toBeLessThan(1000);
    expect(r.x).toBeGreaterThan(500);
    expect(r.y).toBeGreaterThan(500);
  });

  it("top-left sits near the origin", () => {
    const r = logoRect(img(100, 100), 1000, 1000, { position: "tl", size: 0.1 });
    expect(r.x).toBeLessThan(100);
    expect(r.y).toBeLessThan(100);
  });

  it("exposes four corner positions", () => {
    expect(LOGO_POSITION_LIST.map((p) => p.id).sort()).toEqual(["bl", "br", "tl", "tr"]);
  });
});
