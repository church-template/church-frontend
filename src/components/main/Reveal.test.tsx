import { describe, it, expect, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { Reveal } from "./Reveal";

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
}

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

describe("Reveal", () => {
  it("IO를 등록하고 교차 시 표시 클래스를 붙인다(1회)", () => {
    stubMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", MockIO);
    const { container } = render(<Reveal>내용</Reveal>);
    expect(observed.length).toBe(1);
    const target = observed[0];
    act(() => {
      ioCallback?.(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(target.className).toMatch(/shown/);
    expect(container.textContent).toBe("내용");
  });

  it("delay를 CSS 변수로 주입한다(스태거)", () => {
    stubMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", MockIO);
    const { container } = render(<Reveal delay={240}>x</Reveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--reveal-delay")).toBe("240ms");
  });

  it("reduced-motion이면 IO를 등록하지 않는다(CSS 즉시 표시)", () => {
    stubMatchMedia(true);
    const ioSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ioSpy);
    render(<Reveal>x</Reveal>);
    expect(ioSpy).not.toHaveBeenCalled();
  });

  it("언마운트 시 disconnect한다", () => {
    stubMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", MockIO);
    const { unmount } = render(<Reveal>x</Reveal>);
    unmount();
    expect(ioDisconnected).toBe(true);
  });
});
