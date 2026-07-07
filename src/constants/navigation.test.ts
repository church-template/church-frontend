import { describe, it, expect } from "vitest";
import { NAV_PRIMARY, NAV_LOGIN, NAV_MYPAGE, FOOTER_COLUMNS } from "./navigation";
import { allDepartmentSlugs } from "./departments";

describe("navigation IA", () => {
  it("최상위 메뉴는 4종(교회안내·예배·설교·사역·교회소식)", () => {
    expect(NAV_PRIMARY.map((i) => i.label)).toEqual([
      "교회안내",
      "예배·설교",
      "사역",
      "교회소식",
    ]);
  });

  it("모든 항목이 href와 children을 가진다", () => {
    for (const item of NAV_PRIMARY) {
      expect(typeof item.href).toBe("string");
      expect(Array.isArray(item.children)).toBe(true);
      expect(item.children.length).toBeGreaterThan(0);
    }
  });

  it("교회안내 하위에 연락처 및 위치(/about/location)가 있다", () => {
    const about = NAV_PRIMARY.find((i) => i.label === "교회안내");
    expect(about?.children?.some((c) => c.href === "/about/location")).toBe(true);
  });

  it("교회소식 하위에 공지·일정·주보·갤러리가 있다", () => {
    const news = NAV_PRIMARY.find((i) => i.label === "교회소식");
    expect(news?.children?.map((c) => c.href)).toEqual([
      "/notices",
      "/events",
      "/bulletins",
      "/gallery",
    ]);
  });

  it("예배·설교 하위에 예배시간·설교·성경통독이 있다", () => {
    const worship = NAV_PRIMARY.find((i) => i.label === "예배·설교");
    expect(worship?.children?.map((c) => c.href)).toEqual(["/worship", "/sermons", "/challenges"]);
  });

  it("사역 하위 링크는 모두 DEPARTMENTS의 부서 slug로 연결된다(드리프트 감시)", () => {
    const ministry = NAV_PRIMARY.find((i) => i.label === "사역");
    const slugs = new Set(allDepartmentSlugs());
    expect(ministry?.children.length).toBeGreaterThan(0);
    for (const child of ministry!.children) {
      const slug = child.href.replace("/departments/", "");
      expect(slugs.has(slug)).toBe(true);
    }
  });

  it("모든 하위 링크에 icon 키가 있다", () => {
    for (const item of NAV_PRIMARY) {
      for (const child of item.children) {
        expect(typeof child.icon).toBe("string");
      }
    }
  });

  it("인증 링크는 NAV_LOGIN(로그인)·NAV_MYPAGE(마이페이지) 두 개 독립 상수", () => {
    expect(NAV_LOGIN.href).toBe("/login");
    expect(NAV_MYPAGE.href).toBe("/mypage");
  });

  it("푸터 열은 4개(교회안내·예배·설교·사역·교회소식)", () => {
    expect(FOOTER_COLUMNS).toHaveLength(4);
    expect(FOOTER_COLUMNS.map((c) => c.title)).toEqual([
      "교회안내",
      "예배·설교",
      "사역",
      "교회소식",
    ]);
  });

  it("푸터 교회안내 열이 NAV_PRIMARY 교회안내의 children과 동일하다", () => {
    const footerAbout = FOOTER_COLUMNS.find((c) => c.title === "교회안내");
    const navAbout = NAV_PRIMARY.find((i) => i.label === "교회안내");
    expect(footerAbout?.links).toEqual(navAbout?.children);
  });
});
