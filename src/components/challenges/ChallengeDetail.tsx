"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { ApiError } from "@/lib/auth/apiError";
import { formatDate } from "@/lib/date";
import { kstCivilFromDate } from "@/lib/calendar";
import { formatRange } from "@/constants/bible";
import { useChallenge, useMyProgress, useMyLogs, useJoinChallenge, useRecordRead, useCancelRead } from "./queries";
import { TodayBand } from "./TodayBand";
import { ReadingCalendar } from "./ReadingCalendar";
import { ReadDialog, type ReadDialogTarget } from "./ReadDialog";
import type { ChallengeStatus } from "@/lib/api/types";

export const STATUS_LABELS: Record<ChallengeStatus, string> = {
  UPCOMING: "예정", ONGOING: "진행 중", ENDED: "종료",
};

const monthRange = (y: number, m: number) => ({
  from: `${y}-${String(m).padStart(2, "0")}-01`,
  to: `${y}-${String(m).padStart(2, "0")}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`,
});
const civilToday = () => kstCivilFromDate(new Date());

export function ChallengeDetail({ id }: { id: number }) {
  const detail = useChallenge(id);
  const joined = detail.data?.joined ?? false;
  const progress = useMyProgress(id, joined); // joined일 때만 — 미참여 404 방지(스펙 §3)

  const [month, setMonth] = useState(() => {
    const t = civilToday();
    return { year: t.y, month: t.m };
  });
  const logs = useMyLogs(id, monthRange(month.year, month.month), joined);

  const [target, setTarget] = useState<ReadDialogTarget | null>(null);
  const [dialogError, setDialogError] = useState<string | undefined>();
  const calendarRef = useRef<HTMLDivElement>(null);

  const join = useJoinChallenge(id);
  const record = useRecordRead(id);
  const cancel = useCancelRead(id);
  const pending = record.isPending || cancel.isPending;

  // read 400(날짜 범위·장 수)은 다이얼로그 인라인, 나머지는 errorCode 토스트(스펙 §7).
  const onDialogError = (e: unknown) => {
    if (e instanceof ApiError && e.errorCode === "INVALID_INPUT_VALUE") setDialogError(e.detail ?? "입력값을 확인해 주세요.");
    else adminOnError({ onReedit: () => void progress.refetch() })(e);
  };
  const closeDialog = () => { setTarget(null); setDialogError(undefined); };

  if (detail.isPending) {
    return (
      <div className="mt-xl flex flex-col gap-lg" aria-hidden>
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    // 삭제된 챌린지(RESOURCE_NOT_FOUND) 포함 — 목록으로 탈출구 제공(스펙 §7).
    return (
      <div className="mt-xl flex flex-col items-center gap-sm py-xxl text-center" role="status">
        <p className={cn(typo.titleMd, "text-ink")}>챌린지를 불러오지 못했습니다</p>
        <div className="flex items-center gap-sm">
          <Button variant="secondary" onClick={() => detail.refetch()}>다시 시도</Button>
          <Link href="/challenges" className={buttonVariants("secondary")}>목록으로</Link>
        </div>
      </div>
    );
  }
  const c = detail.data;
  const remaining = progress.data ? Math.max(progress.data.dailyGoal - progress.data.todayChapters, 0) : c.dailyGoal;

  return (
    <div className="mt-xl flex flex-col gap-lg">
      <header>
        <div className="flex items-center gap-sm">
          <h1 className={cn(typo.displayMd, "text-ink")}>{c.title}</h1>
          <Badge variant={c.status === "ONGOING" ? "primary" : "default"}>{STATUS_LABELS[c.status]}</Badge>
        </div>
        <p className={cn(typo.datetime, "mt-xs text-muted")}>
          {formatDate(c.startDate)} ~ {formatDate(c.endDate)} · {formatRange(c.startBook, c.endBook)} {c.totalChapters}장
        </p>
      </header>

      {joined ? (
        progress.data ? (
          <TodayBand
            detail={c}
            progress={progress.data}
            pending={pending}
            onReadToday={() => record.mutate({}, { onError: adminOnError({ onReedit: () => { void progress.refetch(); } }) })}
            onAdjust={() => {
              const t = civilToday();
              const alreadyRecorded = progress.data.todayChapters > 0;
              setTarget({
                date: `${t.y}-${String(t.m).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`,
                label: "오늘", existing: null,
                add: alreadyRecorded,
                defaultChapters: alreadyRecorded ? 1 : Math.max(remaining, 1),
              });
            }}
            onBackfill={() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            onCancelToday={() => cancel.mutate({}, { onError: adminOnError({ onReedit: () => { void progress.refetch(); } }) })}
          />
        ) : (
          <Skeleton className="h-72 w-full rounded-xl" />
        )
      ) : (
        // 참여 전 CTA — TodayBand 자리의 다크 밴드(스펙 §4)
        <section className="rounded-xl bg-surface-dark px-lg py-xxl text-center">
          <p className={cn(typo.displayMd, "text-on-dark")}>
            {c.totalChapters}장을 {c.targetDays}일 동안, 하루 {c.dailyGoal}장씩
          </p>
          <Button
            variant="primary" loading={join.isPending}
            onClick={() => join.mutate(undefined, {
              onError: adminOnError({ onDuplicate: () => { notify.error("이미 참여 중이에요."); void detail.refetch(); } }),
            })}
            className="mt-lg h-14 w-full max-w-[var(--container-modal)]"
          >
            챌린지 참여하기
          </Button>
        </section>
      )}

      {joined ? (
        <div ref={calendarRef}>
          <ReadingCalendar
            startDate={c.startDate} endDate={c.endDate}
            logs={logs.data ?? []}
            year={month.year} month={month.month}
            onMonthChange={(year, m) => setMonth({ year, month: m })}
            onSelectDay={(date, existing) => {
              // 오늘 = 남은 목표(remaining), 과거 빈 날 = 하루 목표(dailyGoal) — remaining은 "오늘" 개념이라 과거엔 무의미.
              const t = civilToday();
              const isToday = date === `${t.y}-${String(t.m).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`;
              setTarget({
                date,
                label: `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`,
                existing,
                defaultChapters: isToday ? Math.max(remaining, 1) : Math.max(progress.data?.dailyGoal ?? 1, 1),
              });
            }}
          />
        </div>
      ) : null}

      {c.description ? (
        <section className="rounded-xl border border-hairline p-xl">
          <MarkdownContent source={c.description} />
        </section>
      ) : null}

      <ReadDialog
        target={target}
        onOpenChange={(v) => { if (!v) closeDialog(); }}
        pending={pending}
        error={dialogError}
        onRecord={(date, chapters) =>
          record.mutate({ chapters, date }, { onSuccess: closeDialog, onError: onDialogError })}
        onCancelRecord={(date) =>
          cancel.mutate({ date }, { onSuccess: closeDialog, onError: onDialogError })}
      />
    </div>
  );
}
