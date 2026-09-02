"use client";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/common/Skeleton";
import { Pagination } from "@/components/common/Pagination";
import { ApiError } from "@/lib/auth/apiError";
import { useParticipants } from "./queries";
import type { ChallengeParticipantResponse } from "@/lib/api/types";

// 순위 숫자는 매기지 않는다 — 서버 정렬(누적 장 수)만으로 진도순을 드러낸다(DESIGN.md challenge-participants).
function ParticipantRow({ p }: { p: ChallengeParticipantResponse }) {
  const percent = Math.round(p.progressRate);
  return (
    <li className={cn("border-b border-hairline px-base py-sm", p.me ? "bg-primary-soft" : null)}>
      <div className="flex items-baseline justify-between gap-sm">
        <div className="flex min-w-0 items-baseline gap-xs">
          <span className={cn(typo.bodyMd, "truncate text-ink")}>{p.name}</span>
          {p.roundsCompleted > 0 ? <Badge variant="primary">{p.roundsCompleted}회독</Badge> : null}
        </div>
        <span className={cn(typo.datetime, "shrink-0 text-muted")}>{percent}%</span>
      </div>
      <p className={cn(typo.datetime, "mt-xxs text-muted")}>
        {p.currentPosition ? `${p.currentPosition.book} ${p.currentPosition.chapter}장` : "아직 시작 전"}
      </p>
      <div
        className="mt-xs h-2 overflow-hidden rounded-full bg-surface-strong"
        role="progressbar"
        aria-label={`${p.name} 진도`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </li>
  );
}

export function ParticipantList({ id }: { id: number }) {
  const sp = useSearchParams();
  const pageParam = Number(sp.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0;
  const participants = useParticipants(id, page);

  // ponytail: 403(참여 자격 상실)은 섹션을 숨기기만 한다 — 탈퇴 UI가 없어 사실상 도달 불가 경로다.
  if (participants.error instanceof ApiError && participants.error.status === 403) return null;

  return (
    <section aria-labelledby="participants-heading">
      <h2 id="participants-heading" className={cn(typo.titleLg, "text-ink")}>
        함께 읽는 사람들
      </h2>
      {participants.isPending ? (
        <div className="mt-base flex flex-col gap-sm" aria-hidden>
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      ) : participants.isError || !participants.data ? (
        <p className={cn(typo.bodyMd, "mt-base text-muted")}>명단을 불러오지 못했습니다.</p>
      ) : participants.data.page.totalElements <= 1 ? (
        <p className={cn(typo.bodyMd, "mt-base text-muted")}>
          아직 혼자 읽고 있어요. 함께 읽을 분을 초대해 보세요.
        </p>
      ) : (
        <>
          <ul className="mt-base border-t border-hairline">
            {/* 응답에 식별자가 없어(최소 노출) 키는 인덱스 — 페이지 단위로 통째 교체되는 목록이라 안전하다. */}
            {participants.data.content.map((p, i) => (
              <ParticipantRow key={i} p={p} />
            ))}
          </ul>
          {participants.data.page.totalPages > 1 ? (
            <div className="mt-lg">
              <Pagination page={participants.data.page} scroll={false} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
