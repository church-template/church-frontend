"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { locate } from "@/constants/bible";
import { kstCivilFromDate, civilWeekday } from "@/lib/calendar";
import type { ChallengeDetailResponse, MyProgressResponse } from "@/lib/api/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface TodayBandProps {
  detail: ChallengeDetailResponse;
  progress: MyProgressResponse;
  pending: boolean;
  onReadToday: () => void;
  onAdjust: () => void;
  onBackfill: () => void;
  onCancelToday: () => void;
}

// 오늘 읽을 범위 라벨 — currentPosition(마지막 읽은 장)의 다음 장부터 남은 목표만큼(스펙 §4).
function todayRangeLabel(detail: ChallengeDetailResponse, progress: MyProgressResponse, remaining: number): string {
  const startOrdinal = Math.min(progress.chaptersRead + 1, progress.totalChapters);
  const endOrdinal = Math.min(progress.chaptersRead + Math.max(remaining, 1), progress.totalChapters);
  const s = locate(detail.startBook, startOrdinal);
  const e = locate(detail.startBook, endOrdinal);
  if (s.book === e.book) return s.chapter === e.chapter ? `${s.book} ${s.chapter}장` : `${s.book} ${s.chapter}~${e.chapter}장`;
  return `${s.book} ${s.chapter}장 ~ ${e.book} ${e.chapter}장`;
}

// challenge-today-band(DESIGN.md): 다크 밴드 + 초대형 타이포. 문구는 일상어만 — 전문용어 금지.
export function TodayBand({ detail, progress, pending, onReadToday, onAdjust, onBackfill, onCancelToday }: TodayBandProps) {
  const status = detail.status;
  const remaining = Math.max(progress.dailyGoal - progress.todayChapters, 0);
  const percent = Math.round(progress.progressRate);
  const nextPos = locate(detail.startBook, Math.min(progress.chaptersRead + 1, progress.totalChapters));

  // "1월 5일에 시작해요" — formatDate("2026. 1. 5.")는 조사와 어색해 월·일만 직접 표기.
  const [sy, sm, sd] = detail.startDate.split("-").map(Number);
  // D-day·날짜 헤더 공용 — KST 오늘(civil) 기준 Date.UTC 산술로 런타임 TZ 무관 비교(스펙 §9).
  const todayCivil = kstCivilFromDate(new Date());
  const dDay = Math.round(
    (Date.UTC(sy, sm - 1, sd) - Date.UTC(todayCivil.y, todayCivil.m - 1, todayCivil.d)) / 86_400_000,
  );
  const weekdayLabel = WEEKDAYS[civilWeekday(todayCivil)];

  return (
    <section className="rounded-xl bg-surface-dark px-lg py-xxl text-center">
      {status === "UPCOMING" ? (
        <p className={cn(typo.displayMd, "text-on-dark")}>
          {sm}월 {sd}일에 시작해요{dDay > 0 ? ` (D-${dDay})` : ""}
        </p>
      ) : (
        <>
          {status === "ENDED" ? (
            <p className={cn(typo.bodySm, "text-on-dark-soft")}>종료된 챌린지예요. 끝까지 완주해요!</p>
          ) : null}
          {progress.todayDone ? (
            <div className="mx-auto flex max-w-[var(--container-modal)] items-center gap-md rounded-xl bg-surface-dark-elevated p-lg text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary">
                <Check size={24} className="text-on-primary" aria-hidden />
              </span>
              <span>
                <span className={cn(typo.titleSm, "block text-on-dark")}>오늘 {progress.todayChapters}장을 다 읽었어요</span>
                <span className={cn(typo.bodySm, "text-on-dark-soft")}>내일은 {nextPos.book} {nextPos.chapter}장부터예요</span>
              </span>
            </div>
          ) : (
            <>
              <p className={cn(typo.bodySm, "text-on-dark-soft")}>오늘 읽을 곳 · {todayCivil.m}월 {todayCivil.d}일 ({weekdayLabel})</p>
              <p className={cn(typo.displayXl, "mt-sm text-on-dark")}>
                {todayRangeLabel(detail, progress, remaining)}
              </p>
              <p className={cn(typo.bodySm, "mt-xs text-on-dark-soft")}>오늘 {remaining}장을 읽어요</p>
              <Button
                variant="primary"
                loading={pending}
                onClick={onReadToday}
                className="mt-lg h-14 w-full max-w-[var(--container-modal)]"
              >
                다 읽었어요
              </Button>
            </>
          )}
          <div className={cn(typo.bodySm, "mt-md flex justify-center gap-md text-on-dark-soft")}>
            {progress.todayDone ? (
              <>
                <button type="button" onClick={onAdjust} className="underline-offset-4 hover:underline">더 읽었어요</button>
                <button type="button" disabled={pending} onClick={onCancelToday} className="underline-offset-4 hover:underline">오늘 기록 취소</button>
              </>
            ) : (
              <>
                <button type="button" onClick={onAdjust} className="underline-offset-4 hover:underline">읽은 장 수 바꾸기</button>
                <button type="button" onClick={onBackfill} className="underline-offset-4 hover:underline">지난 날짜 기록</button>
              </>
            )}
          </div>
        </>
      )}

      {/* 진행바 + 문장형 통계(일상어) */}
      <div className="mx-auto mt-xl max-w-[var(--container-modal)]">
        <div className="h-2 overflow-hidden rounded-full bg-surface-dark-elevated" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary-on-dark" style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
        <div className={cn(typo.bodySm, "mt-md text-on-dark-soft leading-relaxed")}>
          {/* 문장 전체가 한 텍스트 노드로 이어져야 테스트의 getByText(regex)가 매칭된다 —
              <b> 등으로 숫자만 감싸면 DOM 텍스트가 쪼개져 문장 전체 매칭이 깨진다. */}
          <p>{progress.totalChapters}장 중 {progress.chaptersRead}장 읽었어요 ({percent}%)</p>
          {progress.streakDays > 0 ? (
            <p>{progress.streakDays}일 연속으로 읽고 있어요</p>
          ) : null}
          {progress.paceDays != null && progress.paceDays !== 0 ? (
            <p>목표보다 {Math.abs(progress.paceDays)}일 {progress.paceDays > 0 ? "빨라요" : "늦어요"}</p>
          ) : null}
          {progress.roundsCompleted >= 1 ? (
            <p className="text-primary-on-dark">{progress.roundsCompleted}회 완독 · {progress.roundsCompleted + 1}회차 진행 중</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
