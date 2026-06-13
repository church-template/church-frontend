// src/components/ui/Checkbox.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("라벨 클릭으로 체크 상태가 토글된다(행 전체 클릭 영역)", () => {
    render(<Checkbox label="이용약관 동의" />);
    const box = screen.getByLabelText("이용약관 동의") as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(screen.getByText("이용약관 동의"));
    expect(box.checked).toBe(true);
  });

  it("error가 있으면 caption 메시지와 aria-invalid를 노출한다", () => {
    render(<Checkbox label="동의" error="동의해 주세요." />);
    expect(screen.getByText("동의해 주세요.")).toBeDefined();
    expect(screen.getByLabelText("동의").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("동의").getAttribute("aria-describedby")).toBeTruthy();
  });

  it("error가 없으면 메시지를 렌더하지 않는다", () => {
    render(<Checkbox label="동의" />);
    expect(screen.queryByText("동의해 주세요.")).toBeNull();
    expect(screen.getByLabelText("동의").getAttribute("aria-invalid")).toBeNull();
  });

  it("disabled+checked 상태가 렌더된다(시각 토큰은 CSS 캐스케이드 — 클래스 존재만 검증)", () => {
    render(<Checkbox label="동의" defaultChecked disabled />);
    const box = screen.getByLabelText("동의") as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
    expect(box.className).toContain("checked:disabled:bg-primary-disabled");
  });
});
