import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeptGallery } from "./DeptGallery";
import type { DeptPhoto } from "@/constants/departments";

const photos: DeptPhoto[] = [
  { src: "/dept/student/1.jpg", alt: "사진 1" },
  { src: "/dept/student/2.jpg", alt: "사진 2" },
];

describe("DeptGallery", () => {
  it("헤딩과 썸네일 버튼을 렌더하고 초기엔 라이트박스가 닫혀 있다", () => {
    render(<DeptGallery heading="활동 사진" photos={photos} />);
    expect(screen.getByRole("heading", { name: "활동 사진" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: /크게 보기/ })).toHaveLength(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("썸네일 클릭 시 라이트박스가 열리고 카운터를 보인다", () => {
    render(<DeptGallery heading="활동 사진" photos={photos} />);
    fireEvent.click(screen.getByRole("button", { name: "1번째 사진 크게 보기" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("1 / 2")).toBeDefined();
  });

  it("→ 키로 다음 사진으로 이동한다", () => {
    render(<DeptGallery heading="활동 사진" photos={photos} />);
    fireEvent.click(screen.getByRole("button", { name: "1번째 사진 크게 보기" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByText("2 / 2")).toBeDefined();
  });
});
