import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { HeroHeaderSync } from "./HeroHeaderSync";

// jsdom에는 IntersectionObserver가 없다 — 콜백을 캡처해 교차 상태를 수동 발화.
let ioCallback: IntersectionObserverCallback;
class MockIO {
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setup(reduced = false) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  vi.stubGlobal("IntersectionObserver", MockIO);
  render(
    <HeroHeaderSync media={{ type: "image", src: "/bg.jpg" }} caption="카피">
      <p>본문</p>
    </HeroHeaderSync>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HeroHeaderSync", () => {
  it("초기에는 투명(on-dark) 헤더다", () => {
    setup();
    expect(screen.getByRole("banner").className).toContain("bg-transparent");
  });

  it("히어로 이탈 시 solid(라이트 스킨)로 전환한다", () => {
    setup();
    act(() => {
      ioCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(screen.getByRole("banner").className).toContain("bg-canvas");
  });

  it("본문 children은 main 랜드마크 안에 렌더된다", () => {
    setup();
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByText("본문")).toBeDefined();
  });

  it("히어로로 복귀 시 on-dark로 되돌아간다", () => {
    setup();
    act(() => {
      ioCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    act(() => {
      ioCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(screen.getByRole("banner").className).toContain("bg-transparent");
  });

  it("reduced-motion이면 처음부터 라이트 스킨으로 고정한다", () => {
    setup(true);
    expect(screen.getByRole("banner").className).toContain("bg-canvas");
  });
});
