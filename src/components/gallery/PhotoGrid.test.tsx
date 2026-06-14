import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhotoGrid } from "./PhotoGrid";
import type { GalleryPhotoResponse } from "@/lib/api/types";

const photos: GalleryPhotoResponse[] = [
  { id: 1, mediaId: 10, caption: "첫째", sortOrder: 0 },
  { id: 2, mediaId: 20, caption: null, sortOrder: 1 },
  { id: 3, mediaId: 30, caption: "셋째", sortOrder: 2 },
];

describe("PhotoGrid", () => {
  it("사진이 없으면 EmptyState를 보인다", () => {
    render(<PhotoGrid photos={[]} albumTitle="앨범" />);
    expect(screen.getByText("등록된 사진이 없습니다.")).toBeDefined();
  });

  it("사진 수만큼 썸네일 버튼을 렌더한다", () => {
    render(<PhotoGrid photos={photos} albumTitle="앨범" />);
    expect(
      screen.getAllByRole("button", { name: /번째 사진 크게 보기/ }).length,
    ).toBe(photos.length);
  });

  it("썸네일 클릭 시 라이트박스(dialog)가 열린다", () => {
    render(<PhotoGrid photos={photos} albumTitle="앨범" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "1번째 사진 크게 보기" }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });
});
