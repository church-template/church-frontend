import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 탑승 "신청됨" 확정 상태 — 채움 칩(primary-soft)이 템플릿처럼 보여, 단일 액센트·절제 원칙대로
// 체크 + 텍스트 인라인으로. 카드·마이페이지 공유(반복 수정 방지). 아이콘 aria-hidden(텍스트가 의미).
export function AppliedStatus({ className }: { className?: string }) {
  return (
    <span className={cn(typo.bodyMd, "inline-flex items-center gap-xxs font-semibold text-primary", className)}>
      <Check size={18} aria-hidden />
      신청됨
    </span>
  );
}
