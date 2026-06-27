import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// MAP_EMBED_SRC가 설정된 배포 환경의 iframe 분기 검증 — 본 테스트 파일에서만 모듈 모킹.
vi.mock("@/constants/church", () => ({
  CHURCH_ADDRESS: "충청남도 예산군 삽교읍 수암산로 260",
  CHURCH_PHONE: "041-337-2298",
  CHURCH_EMAIL: "hsk71418@naver.com",
  MAP_EMBED_SRC: "https://map.example.com/embed/1",
  mapSearchUrl: (address: string) => `https://map.kakao.com/?q=${encodeURIComponent(address)}`,
  naverMapSearchUrl: (address: string) => `https://map.naver.com/p/search/${encodeURIComponent(address)}`,
}));

import LocationPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("LocationPage (embed)", () => {
  it("MAP_EMBED_SRC가 설정되면 iframe을 렌더하고 약도 폴백 링크는 숨긴다", () => {
    // Reveal이 useEffect에서 matchMedia를 호출 — jsdom 미구현이라 reduced 경로로 스텁(about/* 테스트 관례).
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<LocationPage />);
    const iframe = screen.getByTitle("교회 위치 지도");
    expect(iframe.getAttribute("src")).toBe("https://map.example.com/embed/1");
    expect(screen.queryByRole("link", { name: "카카오맵에서 보기" })).toBeNull();
  });
});
