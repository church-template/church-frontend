"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission, hasAnyPermission } from "@/lib/auth/permissions";
import { MANAGE_DOMAINS, MANAGE_CATEGORIES } from "@/lib/admin/manageDomains";
import { Reveal } from "@/components/main/Reveal";

// 마이페이지 관리 허브: 보유 권한 도메인만 카드로, 테마(카테고리)별 섹션으로 묶는다.
// 관리 권한 0이면 섹션 비노출. 카드 0개인 카테고리는 제목째 숨긴다.
// 가독성: 카테고리 경계 1px 헤어라인 divider + 제목(titleSm·600)↔카드(bodyMd·400) 굵기 대비로
// '정보가 바뀌는 지점'을 시각적으로 드러낸다(그림자 단계 추가 없이 헤어라인+무게 위계만 — DESIGN 준수).
export function ManageHub({ delay }: { delay?: number }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return null;
  const allPerms = MANAGE_DOMAINS.map((d) => d.permission);
  if (!hasAnyPermission(allPerms, me)) return null;

  // 카테고리 순서대로, 보유 권한 카드가 있는 그룹만 추린다(빈 카테고리는 제외).
  const groups = MANAGE_CATEGORIES.map((cat) => ({
    cat,
    domains: MANAGE_DOMAINS.filter((d) => d.category === cat.key && hasPermission(d.permission, me)),
  })).filter((g) => g.domains.length > 0);

  return (
    <Reveal delay={delay}>
      <section className="flex flex-col gap-md">
        <h2 className={cn(typo.titleLg, "text-ink")}>관리</h2>
        {/* 관리 제목 앵커 구분선: 카테고리 사이 1px 헤어라인보다 두꺼운 2px ink 라인으로 위계를 강조한다. */}
        <hr className="border-0 border-t-2 border-ink" aria-hidden />
        <div className="flex flex-col">
          {groups.map((g, i) => (
            <div
              key={g.cat.key}
              // 첫 그룹 제외하고 위에 헤어라인 divider + 상하 여백 — 카테고리 경계(정보 변경 지점) 표시.
              className={cn("flex flex-col gap-sm", i > 0 && "mt-lg border-t border-hairline pt-lg")}
            >
              <h3 className={cn(typo.titleSm, "text-ink")}>{g.cat.label}</h3>
              <ul className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                {g.domains.map((d) => (
                  <li key={d.key}>
                    <Link
                      href={d.href}
                      className={cn(
                        typo.bodyMd,
                        "flex rounded-xl border border-hairline bg-surface-card p-base text-ink transition-colors hover:border-primary",
                      )}
                    >
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
