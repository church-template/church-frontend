"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { SiteHeader } from "@/components/shell/SiteHeader";
import HeroReveal from "@/hero/HeroReveal";
import type { CollageTile, HeroMedia } from "@/hero/types";

const REDUCED_MQ = "(prefers-reduced-motion: reduce)";

// reduced-motion을 구독형으로 읽는다 — effect 내 동기 setState 없이(SSR 스냅샷은 false).
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MQ);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MQ).matches,
    () => false,
  );
}

export interface HeroHeaderSyncProps {
  media: HeroMedia;
  caption: ReactNode;
  /** 히어로 콜라주 타일 — HeroReveal에 전달. */
  tiles: CollageTile[];
  /** 중앙 카드 비율(= 포스터 원본 비율) — 콜라주 컬럼 폭 계산의 입력. */
  posterAspect: number;
  /** 히어로 뒤에 이어지는 본문 섹션들 — main 랜드마크 안에 함께 둔다. */
  children?: ReactNode;
}

// 메인 전용 합성(스펙 §8) — SiteHeader 투명↔솔리드를 HeroReveal 타임라인에 배선.
// 모바일도 데스크톱과 동일한 십자가 스크럽을 타므로 onSolid로 통지 → 흰 캔버스 노출 시점에 solid 전환(양방향).
// reduced만 흰 캔버스 정적 스택이라 on-dark 투명 헤더가 안 보임 → 처음부터 solid 고정.
export function HeroHeaderSync({
  media,
  caption,
  tiles,
  posterAspect,
  children,
}: HeroHeaderSyncProps) {
  const reduced = useReducedMotion();
  const [solid, setSolid] = useState(false);

  return (
    <>
      <SiteHeader variant="transparent" solid={reduced || solid} />
      <main className="flex-1">
        <HeroReveal
          media={media}
          caption={caption}
          tiles={tiles}
          posterAspect={posterAspect}
          onSolid={setSolid}
        />
        {children}
      </main>
    </>
  );
}
