"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { useAuthStore, useHasHydrated } from "@/lib/auth/authStore";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission } from "@/lib/auth/permissions";
import { sanitizeNext } from "@/lib/auth/nextParam";

// 차량 탑승 회원전용 게이트(ChallengeGate 동형). 권한 없으면 children 미마운트 → API 호출 0회.
// 분기 순서 중요: useMe는 enabled:!!accessToken이라 !accessToken을 isPending보다 먼저 평가.
export function VehicleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isPending, isError, refetch } = useMe();

  if (!hydrated) return <VehicleSkeleton />;
  if (!accessToken) {
    return (
      <VehicleNotice
        title="로그인 후 이용 가능합니다"
        body="차량 탑승 신청은 교인 전용입니다. 로그인해 주세요."
        action={
          <Link href={`/login?next=${encodeURIComponent(sanitizeNext(pathname))}`} className={buttonVariants("primary")}>
            로그인
          </Link>
        }
      />
    );
  }
  if (isPending) return <VehicleSkeleton />;
  if (isError || !me) {
    return (
      <VehicleNotice
        title="정보를 불러오지 못했습니다"
        body="잠시 후 다시 시도해 주세요."
        action={<Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>}
      />
    );
  }
  if (!hasPermission("VEHICLE_APPLY", me)) {
    return (
      <VehicleNotice
        title="교인 승인 후 이용 가능합니다"
        body="차량 탑승 신청은 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요."
      />
    );
  }
  return <>{children}</>;
}

function VehicleSkeleton() {
  return (
    <div data-testid="vehicle-skeleton" className="mt-xl flex flex-col gap-lg" aria-hidden>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function VehicleNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="mt-xl flex flex-col items-center gap-sm py-xxl text-center">
      <p className={cn(typo.titleMd, "text-ink")}>{title}</p>
      <p className={cn(typo.bodyMd, "text-muted")}>{body}</p>
      {action ? <div className="mt-sm">{action}</div> : null}
    </div>
  );
}
