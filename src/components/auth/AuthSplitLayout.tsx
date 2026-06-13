// src/components/auth/AuthSplitLayout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { CHURCH_NAME, HERO, HERO_CAPTION } from "@/constants/church";

// 히어로 미디어에서 정지 이미지 추출 — video면 poster, image면 src (둘 다 없으면 덮개만).
const posterSrc = HERO.type === "video" ? (HERO.poster ?? "") : HERO.src;

// 인증 전용 풀스크린 스플릿(DESIGN auth-split). 헤더·푸터 없음 — 좌상단 로고가 홈 링크.
// 진입 1회 연출(B안): 사진이 풀스크린 → 좌측 절반으로 clip-path 수축, 폼 카드 페이드인(globals.css).
// 사진은 viewport 전체를 덮어야 하므로 aside(좌 50%) 밖 풀블리드 레이어로 둔다. 텍스트는 on-dark만(노트 3).
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh bg-surface-soft">
      {/* 풀블리드 사진 레이어(데스크톱 전용·장식). clip-path가 좌측 절반으로 정착 — root 배경 위에 깔린다. */}
      <div aria-hidden className="auth-hero-media absolute inset-0 hidden md:block">
        {posterSrc !== "" ? (
          // eslint-disable-next-line @next/next/no-img-element -- 장식 배경(alt 없음), next/image 최적화 불필요
          <img src={posterSrc} alt="" className="absolute inset-0 size-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-cover-dark/60" />
      </div>
      {/* 좌측 패널 — 로고·슬로건만(사진은 뒤 레이어). z-10으로 사진 위에 얹힌다. */}
      <aside className="relative z-10 hidden w-1/2 flex-col justify-between p-xl md:flex">
        <Link href="/" className={cn(typo.titleMd, "w-fit text-on-dark")}>
          {CHURCH_NAME}
        </Link>
        <div className="flex flex-col gap-xs">
          {HERO_CAPTION.map((line) => (
            <p key={line} className={cn(typo.titleLg, "text-on-dark")}>
              {line}
            </p>
          ))}
        </div>
      </aside>
      {/* 우측 폼 패널 — 모바일 단독 풀폭. 배경은 root가 담당(투명)이라 갈라지는 사진이 비친다. */}
      <main className="relative z-10 flex min-h-dvh flex-1 flex-col overflow-y-auto px-lg py-xl">
        <Link href="/" className={cn(typo.titleMd, "w-fit text-ink md:hidden")}>
          {CHURCH_NAME}
        </Link>
        <div className="auth-hero-form flex flex-1 items-center justify-center py-lg">
          {children}
        </div>
      </main>
    </div>
  );
}
