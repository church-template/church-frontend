import { describe, it, expect } from "vitest";
import { lerp, clamp01, segment, easeOut } from "./scrub";

describe("scrub helpers", () => {
  it("lerp — 구간 보간", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(30, 0, 0.5)).toBe(15);
  });

  it("clamp01 — 0~1 고정", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(2)).toBe(1);
  });

  it("segment — 구간 진행도(범위 밖은 0/1)", () => {
    expect(segment(0.1, 0.2, 0.4)).toBe(0);
    expect(segment(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(segment(0.5, 0.2, 0.4)).toBe(1);
  });

  it("easeOut — 처음 빠르고 끝에서 안착(1-(1-t)³)", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(0.5)).toBeCloseTo(0.875);
    expect(easeOut(1)).toBe(1);
  });
});
