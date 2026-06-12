"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SiteHeader } from "@/components/shell/SiteHeader";
import CrossHero from "@/hero/CrossHero";
import type { HeroMedia } from "@/hero/types";

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
  /** 히어로 뒤에 이어지는 본문 섹션들 — main 랜드마크 안에 함께 둔다. */
  children?: ReactNode;
}

// 메인 전용 합성(스펙 §8) — T07 SiteHeader의 스크롤 전환 TODO 해소.
// 히어로(320vh)와 교차하는 동안 투명(on-dark), 벗어나면 fixed 유지 + 라이트 스킨(solid).
// reduced-motion에선 히어로가 정적(덮개 없는 80vh)이라 IO 전환 시점이 불확정 +
// 밝은 배경 위 on-dark 텍스트 가독성 위험 → 라이트 스킨으로 즉시 고정.
export function HeroHeaderSync({ media, caption, children }: HeroHeaderSyncProps) {
  const heroWrapRef = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      return; // 정적 히어로 — IO 불필요(solid는 reduced가 직접 결정)
    }
    const el = heroWrapRef.current;
    if (!el) {
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <>
      <SiteHeader variant="transparent" solid={reduced || pastHero} />
      <main className="flex-1">
        <div ref={heroWrapRef}>
          <CrossHero media={media} caption={caption} />
        </div>
        {children}
      </main>
    </>
  );
}
