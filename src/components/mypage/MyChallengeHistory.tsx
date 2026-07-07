"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/date";
import { useHasPermission } from "@/lib/auth/useMe";
import { useMyParticipations } from "@/components/challenges/queries";
import { STATUS_LABELS } from "@/components/challenges/ChallengeDetail";
import { Reveal } from "@/components/main/Reveal";

// 내 통독 이력(스펙 §4). 권한 미보유·0건이면 섹션째 비노출(ManageHub 관례) — 로딩·에러도 조용히 null.
// Reveal은 null 체크 뒤 컴포넌트 내부에서 감싼다(ManageHub와 동일 관례) — 바깥에서 감싸면
// null 반환 시에도 빈 wrapper div가 flex 부모의 gap을 차지해 마이페이지에 빈 틈이 남는다.
export function MyChallengeHistory({ delay }: { delay?: number }) {
  const canView = useHasPermission("CHALLENGE_PARTICIPATE");
  const parts = useMyParticipations(0, canView);

  if (!canView || !parts.data || parts.data.content.length === 0) return null;

  return (
    <Reveal delay={delay}>
      <section className="rounded-xl border border-hairline bg-surface-card p-xl">
        <h2 className={cn(typo.titleSm, "text-ink")}>내 통독 이력</h2>
        <ul className="mt-md flex flex-col">
          {parts.data.content.map((p) => (
            <li key={p.challenge.id} className="border-t border-hairline first:border-t-0">
              <Link href={`/challenges/${p.challenge.id}`} className="flex flex-col gap-xxs py-md hover:text-primary">
                <span className="flex items-center gap-sm">
                  <span className={cn(typo.bodyMd, "font-semibold text-ink")}>{p.challenge.title}</span>
                  <Badge variant={p.challenge.status === "ONGOING" ? "primary" : "default"}>
                    {STATUS_LABELS[p.challenge.status]}
                  </Badge>
                  {p.completed ? <Badge variant="primary">완독</Badge> : null}
                </span>
                <span className={cn(typo.bodySm, "text-muted")}>
                  {formatDate(p.challenge.startDate)} ~ {formatDate(p.challenge.endDate)} ·{" "}
                  {Math.round(p.progressRate)}% · {p.streakDays}일 연속
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}
