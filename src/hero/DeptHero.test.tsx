import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeptHero from "./DeptHero";

afterEach(() => vi.unstubAllGlobals());

// reduced-motion으로 고정 → useEffect의 스크롤 셋업을 건너뛴다(렌더만 검증).
function reducedMotion() {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
}

describe("DeptHero", () => {
  it("이미지 미디어: 제목·캡션·img(src/alt)를 렌더한다", () => {
    reducedMotion();
    const { container } = render(
      <DeptHero title="청년부" caption={<span>믿음으로</span>} media={{ type: "image", src: "/dept/7.jpg", alt: "청년부" }} />,
    );
    expect(screen.getByText("청년부")).toBeDefined();
    expect(screen.getByText("믿음으로")).toBeDefined();
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/dept/7.jpg");
    expect(img?.getAttribute("alt")).toBe("청년부");
  });

  it("영상 미디어: video를 렌더하고 onError 시 poster img로 폴백한다", () => {
    reducedMotion();
    const { container } = render(
      <DeptHero title="t" caption={<span>c</span>} media={{ type: "video", src: "/v.mp4", poster: "/p.jpg" }} />,
    );
    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe("/v.mp4");
    fireEvent.error(video!);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/p.jpg");
  });
});
