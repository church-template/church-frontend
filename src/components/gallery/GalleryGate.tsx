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

// 갤러리 회원전용 게이트(가이드 2.3). 권한 없으면 children을 마운트하지 않아 API 호출 0회.
// 분기 순서 중요: useMe는 enabled:!!accessToken이라 비로그인 시 isPending이 영구 true →
// !accessToken을 isPending보다 먼저 평가한다(아니면 비로그인에게 Skeleton이 영구 노출).
export function GalleryGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isPending, isError, refetch } = useMe();

  // persist 하이드레이션 전 첫 페인트에서 토큰이 null로 보여 로그인 안내가 깜빡이는 것 방지.
  if (!hydrated) return <GallerySkeleton />;

  if (!accessToken) {
    return (
      <GalleryNotice
        title="로그인 후 이용 가능합니다"
        body="갤러리는 교인 전용입니다. 로그인해 주세요."
        action={
          <Link
            href={`/login?next=${encodeURIComponent(sanitizeNext(pathname))}`}
            className={buttonVariants("primary")}
          >
            로그인
          </Link>
        }
      />
    );
  }
  if (isPending) return <GallerySkeleton />;
  if (isError || !me) {
    return (
      <GalleryNotice
        title="정보를 불러오지 못했습니다"
        body="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }
  if (!hasPermission("GALLERY_VIEW", me)) {
    return (
      <GalleryNotice
        title="교인 승인 후 이용 가능합니다"
        body="갤러리 열람은 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요."
      />
    );
  }
  return <>{children}</>;
}

function GallerySkeleton() {
  return (
    <div data-testid="gallery-skeleton" className="mt-xl grid gap-base sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}

function GalleryNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="mt-xl flex flex-col items-center gap-sm py-xxl text-center">
      <p className={cn(typo.titleMd, "text-ink")}>{title}</p>
      <p className={cn(typo.bodyMd, "text-muted")}>{body}</p>
      {action ? <div className="mt-sm">{action}</div> : null}
    </div>
  );
}
