"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

// 스크롤 중 뷰포트 중앙에 가장 가까운 시대 카드를 active로 추적(좌측 sticky 연도·사진과 동기).
// rAF 스로틀 스크롤 — 항상 가장 가까운 카드를 고르므로 상단/하단에서도 stale 없이 합리적 active 유지.
export function useHistoryScrollEngine(
  cardsRef: MutableRefObject<(HTMLElement | null)[]>,
): number {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    const cards = cardsRef.current.slice();
    let ticking = false;
    let rafId = 0;

    const update = () => {
      const viewportCenter = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(rafId);
    };
  }, [cardsRef]);

  return active;
}
