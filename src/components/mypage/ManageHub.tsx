"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission, hasAnyPermission } from "@/lib/auth/permissions";
import { MANAGE_DOMAINS } from "@/lib/admin/manageDomains";
import { Reveal } from "@/components/main/Reveal";

// 마이페이지 관리 허브: 보유 권한 도메인만 카드로. 관리 권한 0이면 섹션 비노출.
// 공개 도메인 카드는 해당 공개 페이지(인라인 액션), 운영 도메인은 /mypage/manage/*로 이동.
// delay를 내부로 흡수해 권한 없을 때 Reveal 래퍼 div 자체가 렌더되지 않도록 한다.
export function ManageHub({ delay }: { delay?: number }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return null;
  const allPerms = MANAGE_DOMAINS.map((d) => d.permission);
  if (!hasAnyPermission(allPerms, me)) return null;
  const visible = MANAGE_DOMAINS.filter((d) => hasPermission(d.permission, me));
  return (
    <Reveal delay={delay}>
      <section className="flex flex-col gap-md">
        <h2 className={cn(typo.titleMd, "text-ink")}>관리</h2>
        <ul className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          {visible.map((d) => (
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
      </section>
    </Reveal>
  );
}
