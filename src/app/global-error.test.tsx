import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import GlobalError from "./global-error";

describe("global-error.tsx", () => {
  it("문구와 다시시도 버튼을 렌더하고 unstable_retry를 호출한다", () => {
    // 컴포넌트가 <html><body>를 반환해 div 안에 중첩되며 React가 경고를 낸다(무해) — 억제.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<GlobalError error={new Error("x")} unstable_retry={retry} />);

    expect(screen.getByText("문제가 발생했습니다")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalled();

    // 비상 폴백의 유일한 식별 수단인 title 보호
    expect(document.title).toBe("문제가 발생했습니다");
  });
});
