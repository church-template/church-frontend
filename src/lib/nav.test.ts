import { describe, it, expect } from "vitest";
import { isActivePath, isActiveItem } from "./nav";
import { NAV_PRIMARY } from "@/constants/navigation";

describe("isActivePath", () => {
  it("정확히 일치하면 활성", () => {
    expect(isActivePath("/about", "/about")).toBe(true);
  });
  it("하위 경로(prefix)면 활성", () => {
    expect(isActivePath("/about/history", "/about")).toBe(true);
  });
  it("부분 문자열은 오탐하지 않는다", () => {
    expect(isActivePath("/aboutus", "/about")).toBe(false);
  });
  it("루트('/')는 정확 일치만", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/sermons", "/")).toBe(false);
  });
});

describe("isActiveItem", () => {
  const about = NAV_PRIMARY.find((i) => i.label === "교회안내")!;
  it("자식 중 하나가 활성이면 부모도 활성", () => {
    expect(isActiveItem("/about/history", about)).toBe(true);
  });
  it("관련 없는 경로면 비활성", () => {
    expect(isActiveItem("/sermons", about)).toBe(false);
  });

  it("대표 href가 활성이면 항목이 활성이다", () => {
    // 예배·설교 항목은 href=/worship
    const worship = NAV_PRIMARY.find((i) => i.label === "예배·설교")!;
    expect(isActiveItem("/worship", worship)).toBe(true);
    expect(isActiveItem("/worship/sunday", worship)).toBe(true);
    expect(isActiveItem("/about", worship)).toBe(false);
  });

  it("children 중 하나가 활성이면 부모도 활성(/events → 소식)", () => {
    // 소식의 대표 href=/notices이지만 /events는 자식 — 소식이 활성이어야 한다.
    const news = NAV_PRIMARY.find((i) => i.label === "소식")!;
    expect(isActiveItem("/events", news)).toBe(true);
    expect(isActiveItem("/gallery", news)).toBe(true);
    expect(isActiveItem("/sermons", news)).toBe(false);
  });
});
