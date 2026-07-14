import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: notifyError } }));

import { CopyableField } from "./CopyableField";

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// dl 안에서만 쓰이는 행이라 렌더 시에도 부모를 맞춘다(dt·dd의 유효 위치).
const renderField = () =>
  render(
    <dl>
      <CopyableField label="전화번호" value="041-337-2298" href="tel:041-337-2298" />
    </dl>,
  );

describe("CopyableField", () => {
  it("복사 버튼을 누르면 값을 클립보드에 복사하고 알린다", async () => {
    renderField();
    fireEvent.click(screen.getByRole("button", { name: "전화번호 복사" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("041-337-2298"));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("전화번호를 복사했습니다."));
  });

  it("길게 누르면 복사된다", async () => {
    vi.useFakeTimers();
    renderField();
    const row = screen.getByText("041-337-2298").closest("div") as HTMLElement;

    fireEvent.pointerDown(row);
    await vi.advanceTimersByTimeAsync(600);

    expect(writeText).toHaveBeenCalledWith("041-337-2298");
  });

  it("짧게 누르면(길게 누르기 전에 떼면) 복사하지 않는다 — 링크 탭을 방해하지 않는다", async () => {
    vi.useFakeTimers();
    renderField();
    const row = screen.getByText("041-337-2298").closest("div") as HTMLElement;

    fireEvent.pointerDown(row);
    await vi.advanceTimersByTimeAsync(200);
    fireEvent.pointerUp(row);
    await vi.advanceTimersByTimeAsync(600);

    expect(writeText).not.toHaveBeenCalled();
  });

  it("클립보드가 실패하면 직접 복사하도록 안내한다", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    renderField();
    fireEvent.click(screen.getByRole("button", { name: "전화번호 복사" }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith("복사하지 못했습니다. 값을 직접 선택해 복사해 주세요."),
    );
  });

  it("값은 여전히 링크로 동작한다(전화 걸기)", () => {
    renderField();
    expect(screen.getByRole("link", { name: "041-337-2298" }).getAttribute("href")).toBe("tel:041-337-2298");
  });
});
