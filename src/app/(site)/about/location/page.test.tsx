import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CHURCH_ADDRESS, CHURCH_PHONE, CHURCH_EMAIL } from "@/constants/church";
import { LOCATION } from "@/constants/content";
import LocationPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("LocationPage", () => {
  it("제목·연락처·약도(폴백)·교통 안내를 렌더한다", () => {
    // Reveal이 useEffect에서 matchMedia를 호출 — jsdom 미구현이라 reduced 경로로 스텁(about/* 테스트 관례).
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<LocationPage />);
    expect(screen.getByText(LOCATION.title)).toBeDefined();
    expect(screen.getByText(CHURCH_ADDRESS)).toBeDefined();
    // 전화·이메일은 tel/mailto 링크로 노출(고령 사용자 탭 발신)
    expect(
      screen.getByRole("link", { name: CHURCH_PHONE }).getAttribute("href"),
    ).toBe(`tel:${CHURCH_PHONE}`);
    expect(
      screen.getByRole("link", { name: CHURCH_EMAIL }).getAttribute("href"),
    ).toBe(`mailto:${CHURCH_EMAIL}`);
    // MAP_EMBED_SRC가 비어 있으므로 약도 이미지 + 외부 지도(카카오·네이버) 링크가 노출된다.
    expect(screen.getByAltText(LOCATION.map.alt)).toBeDefined();
    expect(screen.getByRole("link", { name: "카카오맵에서 보기" })).toBeDefined();
    expect(screen.getByRole("link", { name: "네이버지도에서 보기" })).toBeDefined();
    // 교통 안내 섹션
    expect(screen.getByText(LOCATION.directionsHeading)).toBeDefined();
    expect(screen.getByText(LOCATION.directions[0].title)).toBeDefined();
  });
});
