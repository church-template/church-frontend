import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import CrossHero from "./CrossHero";

// jsdom에는 matchMedia가 없다 — reduced-motion 분기 제어용 스텁.
function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CrossHero", () => {
  it("카피가 DOM에 존재하고(SEO) 십자가 svg는 aria-hidden이다", () => {
    stubMatchMedia(true);
    const { container, getByText } = render(
      <CrossHero caption="말씀과 삶" media={{ type: "image", src: "/bg.jpg" }} />,
    );
    expect(getByText("말씀과 삶")).toBeDefined();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("video 에러 시 poster 이미지로 폴백한다(14A.5)", () => {
    stubMatchMedia(true);
    const { container } = render(
      <CrossHero
        caption="c"
        media={{ type: "video", src: "/hero.mp4", poster: "/hero-poster.jpg" }}
      />,
    );
    const video = container.querySelector("video")!;
    expect(video.getAttribute("poster")).toBe("/hero-poster.jpg");
    fireEvent.error(video);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/hero-poster.jpg");
  });

  it("prefers-reduced-motion이면 스크롤 리스너를 등록하지 않는다", () => {
    stubMatchMedia(true);
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<CrossHero caption="c" media={{ type: "image", src: "/bg.jpg" }} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(false);
    expect(addSpy.mock.calls.some(([t]) => t === "resize")).toBe(false);
    addSpy.mockRestore();
  });

  it("poster 없는 video가 실패하면 src 없는 이미지로 폴백한다(참조 구현 동작 고정)", () => {
    // React는 src=""(빈 문자열)을 DOM attribute로 설정하지 않으므로 getAttribute("src")는 null.
    // 이 테스트는 poster ?? "" 분기의 실제 DOM 동작을 고정한다.
    stubMatchMedia(true);
    const { container } = render(
      <CrossHero caption="c" media={{ type: "video", src: "/hero.mp4" }} />,
    );
    act(() => {
      fireEvent.error(container.querySelector("video")!);
    });
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBeNull();
  });

  it("기본 모드에서는 scroll·resize 리스너를 등록한다", () => {
    stubMatchMedia(false);
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<CrossHero caption="c" media={{ type: "image", src: "/bg.jpg" }} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    expect(addSpy.mock.calls.some(([t]) => t === "resize")).toBe(true);
    addSpy.mockRestore();
  });
});
