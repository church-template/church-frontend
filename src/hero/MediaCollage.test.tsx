import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import type { HeroMedia } from "./types";
import { MediaCollage } from "./MediaCollage";

// jsdom에는 matchMedia가 없다 — 쿼리별(reduced/mobile) 분기 스텁.
// useSyncExternalStore 구독이 add/removeEventListener를 호출하므로 메서드 포함.
function stubMatchMedia({ reduced = false, mobile = false } = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q: string) => ({
      matches: q.includes("prefers-reduced-motion") ? reduced : mobile,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

// jsdom에는 IntersectionObserver가 없다 — 콜백 캡처용 mock.
let ioCallback: IntersectionObserverCallback | null = null;
let observed: Element[] = [];
let ioDisconnected = false;
class MockIO {
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe(el: Element) {
    observed.push(el);
  }
  unobserve() {}
  disconnect() {
    ioDisconnected = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  ioCallback = null;
  observed = [];
  ioDisconnected = false;
});

const center: HeroMedia = { type: "image", src: "/hero-poster.jpg" };
const tiles: HeroMedia[] = [
  { type: "image", src: "/collage-1.jpg", alt: "" },
  { type: "image", src: "/collage-2.jpg", alt: "" },
  { type: "image", src: "/collage-3.jpg", alt: "" },
  { type: "image", src: "/collage-4.jpg", alt: "" },
];

describe("MediaCollage", () => {
  it("중앙 미디어 1 + 타일 4를 렌더한다(장식 alt)", () => {
    stubMatchMedia({ reduced: true });
    const { container } = render(<MediaCollage center={center} tiles={tiles} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(5);
    imgs.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
  });

  it("데스크톱 기본 모드: scroll·resize 리스너를 등록한다(스크럽)", () => {
    stubMatchMedia({});
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<MediaCollage center={center} tiles={tiles} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    expect(addSpy.mock.calls.some(([t]) => t === "resize")).toBe(true);
    addSpy.mockRestore();
  });

  it("데스크톱 언마운트: 리스너 해제 + 인라인 스타일 정리", () => {
    stubMatchMedia({});
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { container, unmount } = render(
      <MediaCollage center={center} tiles={tiles} />,
    );
    const tile = container.querySelectorAll("div[class*='tile']")[0] as HTMLElement;
    unmount();
    expect(removeSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    expect(tile.style.transform).toBe("");
    removeSpy.mockRestore();
  });

  it("모바일: 스크럽 대신 IO를 등록하고 타일 4개를 관찰한다", () => {
    stubMatchMedia({ mobile: true });
    vi.stubGlobal("IntersectionObserver", MockIO);
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<MediaCollage center={center} tiles={tiles} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(false);
    expect(observed.length).toBe(4);
    addSpy.mockRestore();
  });

  it("모바일: 화면 진입 시 표시 클래스가 붙는다(1회 슬라이드 인)", () => {
    stubMatchMedia({ mobile: true });
    vi.stubGlobal("IntersectionObserver", MockIO);
    render(<MediaCollage center={center} tiles={tiles} />);
    const target = observed[0];
    act(() => {
      ioCallback?.(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(target.className).toMatch(/tileShown/);
  });

  it("reduced-motion: 스크럽·IO 모두 미등록(CSS 정적 폴백)", () => {
    stubMatchMedia({ reduced: true });
    const ioSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ioSpy);
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<MediaCollage center={center} tiles={tiles} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(false);
    expect(ioSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it("tiles가 4개 미만이면 제공된 수만큼만 렌더한다(빈 슬롯 안전)", () => {
    stubMatchMedia({ reduced: true });
    const { container } = render(
      <MediaCollage center={center} tiles={tiles.slice(0, 2)} />,
    );
    expect(container.querySelectorAll("img").length).toBe(3);
  });

  it("center가 video이면 video 요소를 렌더한다(poster 보존)", () => {
    stubMatchMedia({ reduced: true });
    const videoCenter = {
      type: "video",
      src: "/hero.mp4",
      poster: "/hero-poster.jpg",
    } as const;
    const { container } = render(<MediaCollage center={videoCenter} tiles={tiles} />);
    expect(container.querySelector("video")?.getAttribute("poster")).toBe(
      "/hero-poster.jpg",
    );
  });

  it("모바일 언마운트: IO를 disconnect한다", () => {
    stubMatchMedia({ mobile: true });
    vi.stubGlobal("IntersectionObserver", MockIO);
    const { unmount } = render(<MediaCollage center={center} tiles={tiles} />);
    unmount();
    expect(ioDisconnected).toBe(true);
  });

  it("모바일 + reduced-motion 조합도 IO를 등록하지 않는다", () => {
    stubMatchMedia({ mobile: true, reduced: true });
    const ioSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ioSpy);
    render(<MediaCollage center={center} tiles={tiles} />);
    expect(ioSpy).not.toHaveBeenCalled();
  });

  it("video 타일이 실패하면 poster 이미지로 폴백한다", () => {
    stubMatchMedia({ reduced: true });
    const videoTiles: HeroMedia[] = [
      { type: "video", src: "/x.mp4", poster: "/collage-1.jpg" },
      ...tiles.slice(1),
    ];
    const { container } = render(<MediaCollage center={center} tiles={videoTiles} />);
    const video = container.querySelector("video")!;
    fireEvent.error(video);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('img[src="/collage-1.jpg"]')).not.toBeNull();
  });
});
