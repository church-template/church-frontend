import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReadDialog } from "./ReadDialog";

const base = { onOpenChange: vi.fn(), pending: false, onRecord: vi.fn(), onCancelRecord: vi.fn() };

describe("ReadDialog", () => {
  it("기록 모드: 기본값=남은 목표, 저장 시 onRecord(date, chapters)", async () => {
    const onRecord = vi.fn();
    render(<ReadDialog {...base} onRecord={onRecord} target={{ date: "2026-01-20", label: "1월 20일", existing: null, defaultChapters: 4 }} />);
    const input = screen.getByLabelText("읽은 장 수") as HTMLInputElement;
    expect(input.value).toBe("4");
    fireEvent.change(input, { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith("2026-01-20", 6));
  });

  it("0 이하 입력이면 검증 에러, onRecord 미호출", async () => {
    const onRecord = vi.fn();
    render(<ReadDialog {...base} onRecord={onRecord} target={{ date: "2026-01-20", label: "1월 20일", existing: null, defaultChapters: 4 }} />);
    fireEvent.change(screen.getByLabelText("읽은 장 수"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    expect(await screen.findByText("1장 이상 입력해 주세요.")).toBeDefined();
    expect(onRecord).not.toHaveBeenCalled();
  });

  it("기존 기록 있는 날: 요약 + 기록 취소 버튼", () => {
    const onCancelRecord = vi.fn();
    render(<ReadDialog {...base} onCancelRecord={onCancelRecord} target={{ date: "2026-01-19", label: "1월 19일", existing: 5, defaultChapters: 4 }} />);
    expect(screen.getByText(/5장 읽음/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "기록 취소" }));
    expect(onCancelRecord).toHaveBeenCalledWith("2026-01-19");
  });

  it("서버 에러 문자열 인라인 표시", () => {
    render(<ReadDialog {...base} error="기록 가능한 날짜가 아닙니다." target={{ date: "2026-01-20", label: "1월 20일", existing: null, defaultChapters: 4 }} />);
    expect(screen.getByText("기록 가능한 날짜가 아닙니다.")).toBeDefined();
  });

  it("add 타깃: 라벨 '더 읽은 장 수', 저장 시 onRecord(date, chapters) 그대로 호출", async () => {
    const onRecord = vi.fn();
    render(<ReadDialog {...base} onRecord={onRecord} target={{ date: "2026-01-20", label: "오늘", existing: null, defaultChapters: 1, add: true }} />);
    const input = screen.getByLabelText("더 읽은 장 수") as HTMLInputElement;
    expect(input.value).toBe("1");
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith("2026-01-20", 2));
  });
});
