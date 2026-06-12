"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./Reveal.module.css";
import { cn } from "@/lib/utils";

export interface RevealProps {
  children: ReactNode;
  /** 스태거 지연(ms) — 카드 나열 시 i*120 권장(스펙 H3) */
  delay?: number;
  className?: string;
}

// 뷰포트 진입 시 1회 fade+slide-up(스펙 H3). reduced-motion이면 IO 미등록 — CSS가 즉시 표시.
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const el = ref.current;
    if (!el) {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.shown);
          io.unobserve(entry.target);
        }
      },
      // 카드가 20%쯤 보이면 트리거 — 풀폭 밴드 카드 기준. 좁은 요소에 쓰게 되면 prop 노출 검토.
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(styles.reveal, className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
