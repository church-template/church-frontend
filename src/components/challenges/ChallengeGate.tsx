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

// 챌린지 회원전용 게이트(GalleryGate 동형, 스펙 §2). 권한 없으면 children 미마운트 → API 호출 0회.
// 분기 순서 중요: useMe는 enabled:!!accessToken이라 !accessToken을 isPending보다 먼저 평가.
export function ChallengeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isPending, isError, refetch } = useMe();

  if (!hydrated) return <ChallengeSkeleton />;
  if (!accessToken) {
    return (
      <ChallengeNotice
        title="로그인 후 이용 가능합니다"
        body="성경통독 챌린지는 교인 전용입니다. 로그인해 주세요."
        action={
          <Link href={`/login?next=${encodeURIComponent(sanitizeNext(pathname))}`} className={buttonVariants("primary")}>
            로그인
          </Link>
        }
      />
    );
  }
  if (isPending) return <ChallengeSkeleton />;
  if (isError || !me) {
    return (
      <ChallengeNotice
        title="정보를 불러오지 못했습니다"
        body="잠시 후 다시 시도해 주세요."
        action={<Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>}
      />
    );
  }
  if (!hasPermission("CHALLENGE_PARTICIPATE", me)) {
    return (
      <ChallengeNotice
        title="교인 승인 후 이용 가능합니다"
        body="통독 챌린지 참여는 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요."
      />
    );
  }
  return <>{children}</>;
}

function ChallengeSkeleton() {
  return (
    <div data-testid="challenge-skeleton" className="mt-xl flex flex-col gap-lg" aria-hidden>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function ChallengeNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="mt-xl flex flex-col items-center gap-sm py-xxl text-center">
      <p className={cn(typo.titleMd, "text-ink")}>{title}</p>
      <p className={cn(typo.bodyMd, "text-muted")}>{body}</p>
      {action ? <div className="mt-sm">{action}</div> : null}
    </div>
  );
}
