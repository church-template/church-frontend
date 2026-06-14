import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhotoLightbox } from "./PhotoLightbox";
import type { GalleryPhotoResponse } from "@/lib/api/types";

const photos: GalleryPhotoResponse[] = [
  { id: 1, mediaId: 10, caption: "첫째", sortOrder: 0 },
  { id: 2, mediaId: 20, caption: null, sortOrder: 1 },
];

function setup(index: number) {
  const onIndexChange = vi.fn();
  render(<PhotoLightbox photos={photos} albumTitle="앨범" index={index} onIndexChange={onIndexChange} />);
  return { onIndexChange };
}

describe("PhotoLightbox", () => {
  it("현재 사진 이미지와 카운터를 보인다", () => {
    setup(0);
    expect(screen.getByRole("img").getAttribute("src")).toBe("/api/media/10");
    expect(screen.getByText("1 / 2")).toBeDefined();
  });

  it("캡션이 있으면 표시한다", () => {
    setup(0);
    expect(screen.getByText("첫째")).toBeDefined();
  });

  it("다음 버튼으로 인덱스를 1 올린다", () => {
    const { onIndexChange } = setup(0);
    fireEvent.click(screen.getByRole("button", { name: "다음 사진" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("→ 키로 다음 사진으로 이동한다", () => {
    const { onIndexChange } = setup(0);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("첫 사진에서 이전 버튼은 비활성", () => {
    setup(0);
    const prev = screen.getByRole("button", { name: "이전 사진" }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it("← 키로 이전 사진으로 이동한다", () => {
    const { onIndexChange } = setup(1);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it("마지막 사진에서 다음 버튼은 비활성", () => {
    setup(photos.length - 1);
    const next = screen.getByRole("button", { name: "다음 사진" }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("index가 null이면 닫혀 있다(dialog 없음)", () => {
    const onIndexChange = vi.fn();
    render(<PhotoLightbox photos={photos} albumTitle="앨범" index={null} onIndexChange={onIndexChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
