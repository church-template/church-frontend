"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./MediaCollage.module.css";
import { lerp, clamp01, segment, easeOut } from "./scrub";
import type { HeroMedia } from "./types";

export interface MediaCollageProps {
  /** 중앙 카드 — 히어로와 동일 미디어를 넘겨 핸드오프 이음새를 없앤다(스펙 C1·C3) */
  center: HeroMedia;
  /** 주변 타일 — 데스크톱 4장 콜라주, 모바일은 세로 스택(스펙 C4·C6) */
  tiles: HeroMedia[];
}

// 연출 수치(스펙 §4 동결, C7 개정) — 중앙 inset 목표(%)·타일 진입 구간/거리(vw·vh)
const CENTER = { vEnd: 14, hEnd: 34, seg: [0, 0.55] } as const;
const TILES = [
  { seg: [0.15, 0.7], from: { x: 0, y: -40 } }, // T1 좌상 — 위에서
  { seg: [0.25, 0.8], from: { x: -50, y: 0 } }, // T2 좌하 — 왼쪽에서
  { seg: [0.2, 0.75], from: { x: 50, y: 0 } }, // T3 우상 — 오른쪽에서
  { seg: [0.3, 0.85], from: { x: 0, y: 40 } }, // T4 우하 — 아래에서
] as const;

const REDUCED_MQ = "(prefers-reduced-motion: reduce)";
const MOBILE_MQ = "(max-width: 639px)"; // CSS 모듈의 모바일 분기와 동기

// 미디어쿼리를 구독형으로 읽는다 — effect 내 동기 setState 없이, 회전(브레이크포인트 전환)에도 반응.
function useMediaFlag(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// 영상/이미지 공용 렌더 — CrossHero와 동일한 onError→poster 폴백(14A.5 패턴).
function CollageMedia({ media }: { media: HeroMedia }) {
  const [videoFailed, setVideoFailed] = useState(false);
  if (media.type === "video" && !videoFailed) {
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        src={media.src}
        poster={media.poster}
        onError={() => setVideoFailed(true)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어; 콘텐츠 이미지는 T10에서 next/image
    <img
      src={media.type === "video" ? (media.poster ?? "") : media.src}
      alt={media.type === "image" ? (media.alt ?? "") : ""}
    />
  );
}

export function MediaCollage({ center, tiles }: MediaCollageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useMediaFlag(REDUCED_MQ);
  const isMobile = useMediaFlag(MOBILE_MQ);

  useEffect(() => {
    // reduced-motion: 스크럽·IO 모두 미등록 — CSS가 정적 상태를 표시한다(스펙 §6).
    if (reduced) {
      return;
    }

    if (isMobile) {
      // 모바일(C6): 세로 스택 카드 — 화면 진입 시 1회 슬라이드 인(스크럽 없음, 터치 자연스러움).
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add(styles.tileShown);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.25 },
      );
      tileRefs.current.forEach((el) => {
        if (el) {
          io.observe(el);
        }
      });
      return () => io.disconnect();
    }

    // 데스크톱(C5·C7): 스크롤 진행도 비례 스크럽 — CrossHero와 동일한 rAF 패턴.
    const root = rootRef.current!;
    const centerEl = centerRef.current!;
    // 라디우스는 토큰을 1회 읽어 합성 — 하드코딩 금지(스펙 §4).
    const radius =
      parseFloat(getComputedStyle(root).getPropertyValue("--radius-xl")) || 0;
    // unmount 시 ref callback이 null을 먼저 채우므로 cleanup용 스냅샷을 별도 캡처한다.
    const tileEls = tileRefs.current.slice();

    let ticking = false;

    const update = () => {
      const total = root.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - root.offsetTop) / total);

      const tc = easeOut(segment(p, CENTER.seg[0], CENTER.seg[1]));
      const v = lerp(0, CENTER.vEnd, tc);
      const h = lerp(0, CENTER.hEnd, tc);
      const r = lerp(0, radius, tc);
      centerEl.style.clipPath = `inset(${v}% ${h}% round ${r}px)`;

      tileEls.forEach((el, i) => {
        if (!el) return;
        const conf = TILES[i];
        const tt = segment(p, conf.seg[0], conf.seg[1]);
        el.style.opacity = String(tt);
        el.style.transform = `translate(${lerp(conf.from.x, 0, tt)}vw, ${lerp(conf.from.y, 0, tt)}vh)`;
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      // 브레이크포인트 전환 시 모바일 CSS 레이아웃과 충돌하지 않게 스크럽 인라인 스타일 제거(스펙 §6).
      centerEl.style.clipPath = "";
      tileEls.forEach((el) => {
        if (el) {
          el.style.opacity = "";
          el.style.transform = "";
        }
      });
    };
  }, [reduced, isMobile]);

  return (
    <section ref={rootRef} className={styles.collage}>
      <div className={styles.frame}>
        <div ref={centerRef} className={styles.center}>
          <CollageMedia media={center} />
        </div>
        {tiles.slice(0, TILES.length).map((m, i) => (
          <div
            key={`${m.src}-${i}`}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className={`${styles.tile} ${styles[`tile${i + 1}`]}`}
          >
            <CollageMedia media={m} />
          </div>
        ))}
      </div>
    </section>
  );
}
