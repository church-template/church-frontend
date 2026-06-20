import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// MAP_EMBED_SRC가 설정된 배포 환경의 iframe 분기 검증 — 본 테스트 파일에서만 모듈 모킹.
vi.mock("@/constants/church", () => ({
  CHURCH_ADDRESS: "충청남도 예산군 삽교읍 수암산로 260",
  MAP_EMBED_SRC: "https://map.example.com/embed/1",
  mapSearchUrl: (address: string) => `https://map.kakao.com/?q=${encodeURIComponent(address)}`,
}));

import LocationPage from "./page";

describe("LocationPage (embed)", () => {
  it("MAP_EMBED_SRC가 설정되면 iframe을 렌더한다", () => {
    render(<LocationPage />);
    const iframe = screen.getByTitle("교회 위치 지도");
    expect(iframe.getAttribute("src")).toBe("https://map.example.com/embed/1");
    expect(screen.queryByRole("link", { name: "지도에서 보기" })).toBeNull();
  });
});
