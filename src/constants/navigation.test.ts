import { describe, it, expect } from "vitest";
import { NAV_PRIMARY, NAV_AUTH, FOOTER_COLUMNS } from "./navigation";

describe("navigation IA", () => {
  it("최상위 메뉴는 5종(교회소개·예배·설교·소식·교육부서)", () => {
    expect(NAV_PRIMARY.map((i) => i.label)).toEqual([
      "교회소개",
      "예배",
      "설교",
      "소식",
      "교육부서",
    ]);
  });

  it("교회소개 하위에 오시는 길(/about/location)이 있다", () => {
    const about = NAV_PRIMARY.find((i) => i.label === "교회소개");
    expect(about?.children?.some((c) => c.href === "/about/location")).toBe(true);
  });

  it("소식 하위에 공지·일정·주보·갤러리가 있다", () => {
    const news = NAV_PRIMARY.find((i) => i.label === "소식");
    expect(news?.children?.map((c) => c.href)).toEqual([
      "/notices",
      "/events",
      "/bulletins",
      "/gallery",
    ]);
  });

  it("인증 링크는 로그인·마이페이지", () => {
    expect(NAV_AUTH.map((l) => l.href)).toEqual(["/login", "/mypage"]);
  });

  it("푸터 열은 3개", () => {
    expect(FOOTER_COLUMNS).toHaveLength(3);
  });

  it("푸터 교회소개 열이 NAV_PRIMARY 교회소개의 children과 동일하다", () => {
    const footerAbout = FOOTER_COLUMNS.find((c) => c.title === "교회소개");
    const navAbout = NAV_PRIMARY.find((i) => i.label === "교회소개");
    expect(footerAbout?.links).toEqual(navAbout?.children);
  });
});
