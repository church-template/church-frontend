import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CHURCH_PHOTOS } from "@/constants/content";
import ChurchPhotosPage from "./page";

describe("ChurchPhotosPage", () => {
  // 사진 상수가 채워진 뒤에도 유효하도록 데이터 기준으로 분기 없이 검증한다
  // (빈 상태 문구는 groups가 비었을 때만 렌더 — 상수가 채워지며 기대가 낡아 #117에서 현행화).
  it("제목과 그룹 탭을 렌더한다", () => {
    render(<ChurchPhotosPage />);
    expect(screen.getByText(CHURCH_PHOTOS.title)).toBeDefined();
    for (const group of CHURCH_PHOTOS.groups) {
      expect(screen.getByRole("tab", { name: group.title })).toBeDefined();
    }
  });
});
