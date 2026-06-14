import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("error가 있으면 caption 메시지와 aria-invalid를 노출한다", () => {
    render(<Textarea aria-label="본문" error="본문을 입력해 주세요." />);
    const area = screen.getByLabelText("본문");
    expect(area.getAttribute("aria-invalid")).toBe("true");
    expect(area.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("본문을 입력해 주세요.")).toBeDefined();
  });

  it("error가 없으면 메시지를 렌더하지 않고 aria-invalid도 없다", () => {
    render(<Textarea aria-label="본문" />);
    expect(screen.getByLabelText("본문").getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText("본문을 입력해 주세요.")).toBeNull();
  });
});
