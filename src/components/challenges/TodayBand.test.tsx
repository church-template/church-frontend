import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TodayBand } from "./TodayBand";
import type { ChallengeDetailResponse, MyProgressResponse } from "@/lib/api/types";

const detail: ChallengeDetailResponse = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4,
  status: "ONGOING", joined: true, version: 0, description: null,
};
const base: MyProgressResponse = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 4,
  totalChapters: 260, todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};
const noop = { onReadToday: vi.fn(), onAdjust: vi.fn(), onBackfill: vi.fn(), onCancelToday: vi.fn() };

describe("TodayBand", () => {
  it("기록 전: 오늘 범위 초대형 표기 + 다 읽었어요 버튼 + 일상어 통계", () => {
    render(<TodayBand detail={detail} progress={base} pending={false} {...noop} />);
    expect(screen.getByText("마태복음 5~8장")).toBeDefined(); // chaptersRead 4 → 5장부터 4장
    const btn = screen.getByRole("button", { name: "다 읽었어요" });
    fireEvent.click(btn);
    expect(noop.onReadToday).toHaveBeenCalled();
    expect(screen.getByText(/23일 연속으로 읽고 있어요/)).toBeDefined();
    expect(screen.getByText(/목표보다 3일 빨라요/)).toBeDefined();
    expect(screen.getByText(/260장 중 4장/)).toBeDefined();
  });

  it("권 경계 넘는 범위는 양끝 권 표기", () => {
    render(<TodayBand detail={detail} progress={{ ...base, chaptersRead: 26, currentPosition: { book: "마태복음", chapter: 26 } }} pending={false} {...noop} />);
    expect(screen.getByText("마태복음 27장 ~ 마가복음 2장")).toBeDefined(); // 마태 28장 경계 이월
  });

  it("기록 후(todayDone): 완료 카드 + 내일 안내 + 취소 버튼", () => {
    render(<TodayBand detail={detail} progress={{ ...base, todayChapters: 4, todayDone: true, chaptersRead: 8, streakDays: 24 }} pending={false} {...noop} />);
    expect(screen.getByText("오늘 4장을 다 읽었어요")).toBeDefined();
    expect(screen.getByText(/내일은 마태복음 9장부터예요/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "오늘 기록 취소" }));
    expect(noop.onCancelToday).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "다 읽었어요" })).toBeNull();
  });

  it("UPCOMING: 시작 안내, 기록 버튼 없음", () => {
    const up = { ...base, challenge: { ...base.challenge, status: "UPCOMING" as const }, chaptersRead: 0, currentPosition: null };
    render(<TodayBand detail={{ ...detail, status: "UPCOMING" }} progress={up} pending={false} {...noop} />);
    expect(screen.getByText(/1월 5일에 시작해요/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "다 읽었어요" })).toBeNull();
  });

  it("ENDED: 완주 응원 문구 + 기록은 계속 허용 + 페이스 줄 생략", () => {
    const ended = { ...base, paceDays: null, challenge: { ...base.challenge, status: "ENDED" as const } };
    render(<TodayBand detail={{ ...detail, status: "ENDED" }} progress={ended} pending={false} {...noop} />);
    expect(screen.getByText(/종료된 챌린지예요/)).toBeDefined();
    expect(screen.getByRole("button", { name: "다 읽었어요" })).toBeDefined(); // 늦은 완주 응원(스펙 §4)
    expect(screen.queryByText(/목표보다/)).toBeNull();
  });

  it("완독(roundsCompleted ≥ 1): 회차 문구", () => {
    render(<TodayBand detail={detail} progress={{ ...base, roundsCompleted: 1 }} pending={false} {...noop} />);
    expect(screen.getByText(/1회 완독 · 2회차 진행 중/)).toBeDefined();
  });
});
