// src/components/ui/PasswordInput.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("기본은 가림(type=password)이고 토글로 표시/재가림된다", () => {
    render(<PasswordInput id="pw" />);
    const input = document.getElementById("pw") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 표시" }));
    expect(input.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 숨기기" }));
    expect(input.type).toBe("password");
  });

  it("토글 버튼은 aria-pressed로 상태를 노출한다", () => {
    render(<PasswordInput id="pw" />);
    const toggle = screen.getByRole("button");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });

  it("error 메시지·aria-invalid를 Input과 동일하게 노출한다", () => {
    render(<PasswordInput id="pw" error="비밀번호는 8자 이상이어야 합니다." />);
    expect(screen.getByText("비밀번호는 8자 이상이어야 합니다.")).toBeDefined();
    expect((document.getElementById("pw") as HTMLInputElement).getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("토글 버튼은 폼 제출을 유발하지 않는다(type=button)", () => {
    render(<PasswordInput id="pw" />);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });
});
