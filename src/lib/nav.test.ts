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
  const about = NAV_PRIMARY.find((i) => i.label === "교회소개")!;
  it("자식 중 하나가 활성이면 부모도 활성", () => {
    expect(isActiveItem("/about/history", about)).toBe(true);
  });
  it("관련 없는 경로면 비활성", () => {
    expect(isActiveItem("/sermons", about)).toBe(false);
  });

  it("href 직접 항목도 활성 판정한다", () => {
    const sermons = NAV_PRIMARY.find((i) => i.label === "설교")!;
    expect(isActiveItem("/sermons", sermons)).toBe(true);
    expect(isActiveItem("/sermons/abc", sermons)).toBe(true);
    expect(isActiveItem("/about", sermons)).toBe(false);
  });
});
