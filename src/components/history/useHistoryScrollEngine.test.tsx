import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { useHistoryScrollEngine } from "./useHistoryScrollEngine";

afterEach(() => vi.unstubAllGlobals());

function Harness({ n = 3 }: { n?: number }) {
  const ref = useRef<(HTMLElement | null)[]>([]);
  const active = useHistoryScrollEngine(ref);
  return (
    <div>
      <span data-testid="active">{active}</span>
      {Array.from({ length: n }).map((_, i) => (
        <section key={i} ref={(el) => { ref.current[i] = el; }} />
      ))}
    </div>
  );
}

// jsdom의 getBoundingClientRect는 0을 반환해 active 값 자체는 검증 불가(0 고정) — 리스너 등록/해제만 검증.
describe("useHistoryScrollEngine (active 시대 추적)", () => {
  it("scroll·resize 리스너를 등록한다", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<Harness n={3} />);
    expect(addSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    expect(addSpy.mock.calls.some(([t]) => t === "resize")).toBe(true);
    addSpy.mockRestore();
  });

  it("언마운트 시 리스너를 해제한다", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Harness n={3} />);
    unmount();
    expect(removeSpy.mock.calls.some(([t]) => t === "scroll")).toBe(true);
    removeSpy.mockRestore();
  });

  it("초기 active는 0", () => {
    const { getByTestId } = render(<Harness n={3} />);
    expect(getByTestId("active").textContent).toBe("0");
  });
});
