import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { DEPT_PAGE } from "@/constants/departments";

// 부서 인도자 메타 — 1인이라 카드 대신 가벼운 한 줄(스펙 D3). 라벨은 상수 주입.
export function DeptLeader({ name }: { name: string }) {
  return (
    <p className={cn(typo.datetime, "text-muted")}>
      {DEPT_PAGE.leaderLabel} · {name}
    </p>
  );
}
