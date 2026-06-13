import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { formatDate } from "@/lib/date";
import type { MeResponse } from "@/lib/auth/types";

export function AgreementStatus({ me }: { me: MeResponse }) {
  const agreed = me.termsAgreed && me.privacyAgreed;

  if (agreed) {
    return (
      <div className="flex items-center gap-xs border-t border-hairline pt-md">
        <Check size={20} aria-hidden className="text-muted" />
        <span className={cn(typo.bodySm, "text-body")}>약관 동의 · 완료</span>
        {/* 날짜는 tnum(typo.datetime)으로 — DESIGN 날짜·시간 토큰 원칙 */}
        {me.agreedAt ? (
          <span className={cn(typo.datetime, "text-muted")}>({formatDate(me.agreedAt)})</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sm rounded-xl bg-primary-soft p-lg sm:flex-row sm:items-center sm:justify-between">
      <span className={cn(typo.bodyMd, "text-ink")}>약관 재동의가 필요합니다.</span>
      <Link
        href="/agreements?next=/mypage"
        className={cn(typo.bodySm, "text-primary hover:text-primary-active")}
      >
        재동의하기 →
      </Link>
    </div>
  );
}
