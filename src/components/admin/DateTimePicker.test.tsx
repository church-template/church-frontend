// src/components/admin/DateTimePicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DateTimePicker } from "./DateTimePicker";

describe("DateTimePicker", () => {
  it("기본은 datetime-local 입력", () => {
    const { container } = render(<DateTimePicker value="2026-06-14T10:00" onChange={() => {}} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("datetime-local");
    expect(input.value).toBe("2026-06-14T10:00");
  });

  it("allDay면 date 입력이고 값은 날짜로 슬라이스된다", () => {
    const { container } = render(<DateTimePicker value="2026-06-14T10:00" allDay onChange={() => {}} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("date");
    expect(input.value).toBe("2026-06-14");
  });

  it("입력 변경 시 onChange로 값을 올린다", () => {
    const onChange = vi.fn();
    const { container } = render(<DateTimePicker value="" onChange={onChange} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-06-14T09:30" } });
    expect(onChange).toHaveBeenCalledWith("2026-06-14T09:30");
  });
});
