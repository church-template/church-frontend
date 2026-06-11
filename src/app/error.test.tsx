import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/x" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import ErrorBoundary from "./error";

describe("error.tsx", () => {
  it("에러 문구·다시시도(unstable_retry)·스택 비노출", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const err = Object.assign(new Error("민감한 내부 오류"), {
      stack: "secret-stack-trace",
    });
    render(<ErrorBoundary error={err} unstable_retry={retry} />);

    expect(screen.getByText("문제가 발생했습니다")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalled();

    // 스택·원문 메시지가 화면에 노출되지 않는다.
    expect(document.body.textContent).not.toContain("secret-stack-trace");
    expect(document.body.textContent).not.toContain("민감한 내부 오류");
  });
});
