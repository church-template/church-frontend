import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CHURCH_PHOTOS } from "@/constants/content";
import ChurchPhotosPage from "./page";

describe("ChurchPhotosPage", () => {
  it("제목과 준비 중 안내 문구를 렌더한다", () => {
    render(<ChurchPhotosPage />);
    expect(screen.getByText(CHURCH_PHOTOS.title)).toBeDefined();
    expect(screen.getByText(CHURCH_PHOTOS.empty)).toBeDefined();
  });
});
