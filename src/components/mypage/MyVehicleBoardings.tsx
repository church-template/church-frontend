"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatClockTime } from "@/lib/date";
import { useHasPermission } from "@/lib/auth/useMe";
import { useVehicleRuns } from "@/components/vehicles/queries";
import { Reveal } from "@/components/main/Reveal";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// 마이페이지 "내 차량 탑승"(my-challenge-history 동형). 다가오는 운행 중 내 신청만(백엔드 이력 API 없음).
// 권한 미보유·0건이면 섹션째 null. Reveal은 null 체크 뒤 내부에서 감싼다(빈 wrapper가 gap 차지 방지).
export function MyVehicleBoardings({ delay }: { delay?: number }) {
  const canView = useHasPermission("VEHICLE_APPLY");
  const list = useVehicleRuns(0, canView);

  const mine = canView && list.data ? list.data.content.filter((r) => r.myRequest != null) : [];
  if (mine.length === 0) return null;

  const departLabel = (r: VehicleRunCardResponse) => `${formatDate(r.departsAt)} ${formatClockTime(r.departsAt)}`;

  return (
    <Reveal delay={delay}>
      <section className="rounded-xl border border-hairline bg-surface-card p-xl">
        <h2 className={cn(typo.titleSm, "text-ink")}>내 차량 탑승</h2>
        <ul className="mt-md flex flex-col">
          {mine.map((r) => (
            <li key={r.id} className="border-t border-hairline first:border-t-0">
              <Link href="/vehicle-runs" className="flex flex-col gap-xxs py-md hover:text-primary">
                <span className="flex items-center gap-sm">
                  <span className={cn(typo.bodyMd, "font-semibold text-ink")}>{departLabel(r)} 출발</span>
                  <Badge variant="primary" className="gap-xxs">
                    <Check size={14} aria-hidden />
                    신청됨
                  </Badge>
                </span>
                <span className={cn(typo.bodySm, "text-muted")}>
                  픽업: {r.myRequest?.pickupLocation ?? "위치 첨부됨"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}
