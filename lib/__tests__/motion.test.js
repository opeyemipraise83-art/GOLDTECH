import { describe, it, expect } from "vitest";
import { motionTransform, MOTIONS, MOTION_LIST } from "../motion";

describe("motion presets", () => {
  it("exposes a preset list including the new presets", () => {
    const ids = MOTION_LIST.map((m) => m.id);
    expect(ids).toContain("none");
    expect(ids).toContain("zoomin");
    expect(ids).toContain("zoomout");
    expect(ids).toContain("punch");
    expect(ids).toContain("panleft");
    expect(ids).toContain("shake");
    expect(MOTION_LIST.every((m) => m.id && m.label)).toBe(true);
    expect(MOTION_LIST.length).toBe(Object.keys(MOTIONS).length);
  });

  it("none is identity", () => {
    expect(motionTransform("none", 0.5, 0.1, 1920, 1080, 3)).toEqual({ scale: 1, dx: 0, dy: 0 });
    expect(motionTransform(undefined, 0.5, 0.1, 1920, 1080, 3)).toEqual({ scale: 1, dx: 0, dy: 0 });
  });

  it("zoomin grows, zoomout shrinks over progress", () => {
    expect(motionTransform("zoomin", 0, 0.1).scale).toBeCloseTo(1);
    expect(motionTransform("zoomin", 1, 0.1).scale).toBeCloseTo(1.1);
    expect(motionTransform("zoomout", 0, 0.1).scale).toBeCloseTo(1.1);
    expect(motionTransform("zoomout", 1, 0.1).scale).toBeCloseTo(1);
  });

  it("punch eases from 1 upward and never below 1", () => {
    const a = motionTransform("punch", 0, 0.1).scale;
    const b = motionTransform("punch", 0.5, 0.1).scale;
    const c = motionTransform("punch", 1, 0.1).scale;
    expect(a).toBeCloseTo(1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("pans zoom for headroom and move dx/dy across the frame within bounds", () => {
    const W = 1920, H = 1080;
    const left0 = motionTransform("panleft", 0, 0.1, W, H, 0);
    const left1 = motionTransform("panleft", 1, 0.1, W, H, 0);
    expect(left0.scale).toBeGreaterThan(1);
    // opposite ends of the pan, and within the zoom headroom
    expect(Math.sign(left0.dx)).toBe(-Math.sign(left1.dx));
    const maxX = ((left0.scale - 1) * W) / 2;
    expect(Math.abs(left0.dx)).toBeLessThanOrEqual(maxX + 1e-6);
    const up = motionTransform("panup", 0, 0.1, W, H, 0);
    expect(up.dx).toBe(0);
    expect(Math.abs(up.dy)).toBeGreaterThan(0);
  });

  it("shake oscillates over time with zero mean-ish offsets", () => {
    const s = motionTransform("shake", 0.5, 0.1, 1920, 1080, 0);
    expect(s.scale).toBeGreaterThan(1);
    const s2 = motionTransform("shake", 0.5, 0.1, 1920, 1080, 1);
    // different time -> different offset
    expect(s.dx === s2.dx && s.dy === s2.dy).toBe(false);
  });

  it("clamps progress outside 0..1", () => {
    expect(motionTransform("zoomin", -1, 0.1).scale).toBeCloseTo(1);
    expect(motionTransform("zoomin", 2, 0.1).scale).toBeCloseTo(1.1);
  });
});
