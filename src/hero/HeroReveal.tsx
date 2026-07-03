"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./HeroReveal.module.css";
import { lerp, clamp01, segment, easeOut } from "./scrub";
import { useMediaFlag, REDUCED_MQ, MOBILE_MQ } from "@/lib/hooks/useMediaFlag";
import type { HeroMedia } from "./types";

export interface HeroRevealProps {
  /** 중앙 카드 — 십자가로 드러난 그 영상 한 장을 그대로 축소한다(단일 <video>). */
  media: HeroMedia;
  /** 풀스크린 홀드에서 등장했다 축소 직전 퇴장하는 카피. */
  caption: ReactNode;
  /** 주변 타일 — 데스크톱 4장 콜라주, 모바일은 세로 스택. */
  tiles: HeroMedia[];
  /** 축소 시작 임계(p>=P.solid) 교차 시 헤더 solid 전환 통지(양방향). */
  onSolid?: (solid: boolean) => void;
}

// 십자가 확정 비율 (14A.3) — 변경 시 디자인 재검토 필요
const CROSS = { vbw: 16, haw: 64, hbh: 16, cp: 32 };
const START_PCT = 38; // 시작 크기 %
const DIM = 0.85; // 덮개 어둡기

// 중앙 카드 축소 목표(%) — MediaCollage 계승(스펙 §4)
const CENTER = { vEnd: 14, hEnd: 34 };

// 타일 슬롯 진입: from 거리(vw·vh)는 계승, seg는 통합 타임라인 P의 스태거로 이동.
const TILES = [
  { seg: [0.62, 0.86], from: { x: 0, y: -40 } }, // T1 좌상 — 위에서
  { seg: [0.66, 0.9], from: { x: -50, y: 0 } }, // T2 좌하 — 왼쪽에서
  { seg: [0.64, 0.88], from: { x: 50, y: 0 } }, // T3 우상 — 오른쪽에서
  { seg: [0.7, 0.96], from: { x: 0, y: 40 } }, // T4 우하 — 아래에서
] as const;

// 통합 타임라인(튜닝 가능) — 십자가 리빌 → 카피 인/홀드/아웃 → 카드 축소 → 헤더 solid.
const P = {
  crossIn: [0.0, 0.34], // easeIn 열쇠구멍
  capIn: [0.36, 0.46], // 카피 페이드/슬라이드 인
  // 홀드 0.46–0.54 (선명한 풀스크린 영상 + 카피)
  solid: 0.5, // onSolid(true) 임계 — 흰 캔버스 상단 노출 직전
  shrink: [0.54, 0.84], // easeOut clip-path 축소
  capOut: [0.54, 0.62], // 카피 페이드 아웃
} as const;

// easeIn은 CrossHero 내부 헬퍼 계승(scrub는 easeOut만 노출).
const easeIn = (t: number) => t * t * t;

function buildCrossPath() {
  const v = CROSS.vbw / 2,
    h = CROSS.haw / 2;
  const cY = -50 + CROSS.cp;
  const t1 = cY - CROSS.hbh / 2,
    t2 = cY + CROSS.hbh / 2;
  return `M ${-v} -50 H ${v} V ${t1} H ${h} V ${t2} H ${v} V 50 H ${-v} V ${t2} H ${-h} V ${t1} H ${-v} Z`;
}

// 영상/이미지 공용 렌더 — CrossHero·MediaCollage가 공유하던 onError→poster 폴백 1벌(14A.5).
function RevealMedia({ media }: { media: HeroMedia }) {
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
    // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어; 콘텐츠 이미지는 next/image
    <img
      src={media.type === "video" ? (media.poster ?? "") : media.src}
      alt={media.type === "image" ? (media.alt ?? "") : ""}
    />
  );
}

export default function HeroReveal({ media, caption, tiles, onSolid }: HeroRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useMediaFlag(REDUCED_MQ);
  const isMobile = useMediaFlag(MOBILE_MQ);

  useEffect(() => {
    // reduced-motion: 스크럽·IO 모두 미등록 — CSS가 완성 콜라주 정적 상태를 표시한다(스펙 §6).
    if (reduced) {
      return;
    }

    if (isMobile) {
      // 모바일: 십자가 인트로 생략, 세로 스택 카드 — 화면 진입 시 1회 슬라이드 인(스크럽 없음).
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

    // 데스크톱: 스크롤 진행도 비례 단일 rAF 스크럽 — 십자가 리빌 + 카피 + 축소 + 타일 통합.
    const root = rootRef.current!;
    const sticky = stickyRef.current!;
    const centerEl = centerRef.current!;
    const hole = holeRef.current!;
    const captionEl = captionRef.current!;
    // 라디우스는 토큰을 1회 읽어 합성 — 하드코딩 금지(스펙 §4).
    const radius =
      parseFloat(getComputedStyle(root).getPropertyValue("--radius-xl")) || 0;
    // unmount 시 ref callback이 null을 먼저 채우므로 cleanup용 스냅샷을 별도 캡처한다.
    const tileEls = tileRefs.current.slice();

    let startScale = 1,
      targetScale = 10,
      cx = 0,
      cy = 0,
      ticking = false,
      lastSolid = false;

    const update = () => {
      const total = root.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - root.offsetTop) / total);

      // 1) 십자가 열쇠구멍 확대(easeIn)
      const pe = easeIn(segment(p, P.crossIn[0], P.crossIn[1]));
      const s = lerp(startScale, targetScale, pe);
      hole.setAttribute("transform", `translate(${cx} ${cy}) scale(${s})`);

      // 2·3·5a) 카피 인 → 홀드 → 아웃(곱셈 퇴장)
      const capIn = segment(p, P.capIn[0], P.capIn[1]);
      const capOut = segment(p, P.capOut[0], P.capOut[1]);
      captionEl.style.opacity = String(capIn * (1 - capOut));
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, capIn)}px))`;

      // 4) 중앙 카드 축소(easeOut clip-path)
      const tc = easeOut(segment(p, P.shrink[0], P.shrink[1]));
      const v = lerp(0, CENTER.vEnd, tc);
      const h = lerp(0, CENTER.hEnd, tc);
      const r = lerp(0, radius, tc);
      centerEl.style.clipPath = `inset(${v}% ${h}% round ${r}px)`;

      // 5b) 타일 스태거 슬라이드 인
      tileEls.forEach((el, i) => {
        if (!el) return;
        const conf = TILES[i];
        const tt = segment(p, conf.seg[0], conf.seg[1]);
        el.style.opacity = String(tt);
        el.style.transform = `translate(${lerp(conf.from.x, 0, tt)}vw, ${lerp(conf.from.y, 0, tt)}vh)`;
      });

      // 헤더 — 축소 시작 직전 임계 교차 시 solid 통지(양방향).
      const solid = p >= P.solid;
      if (solid !== lastSolid) {
        lastSolid = solid;
        onSolid?.(solid);
      }

      ticking = false;
    };

    const measure = () => {
      const vw = sticky.clientWidth,
        vh = sticky.clientHeight;
      cx = vw / 2;
      cy = vh / 2;
      startScale = (Math.min(vw, vh) * (START_PCT / 100)) / 100;
      targetScale = Math.max(vw / CROSS.vbw, vh / 100) * 1.1;
      update();
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      // 브레이크포인트 전환 시 스테일 인라인이 모바일/reduced CSS를 덮지 않게 클리어(스펙 §6).
      centerEl.style.clipPath = "";
      tileEls.forEach((el) => {
        if (el) {
          el.style.opacity = "";
          el.style.transform = "";
        }
      });
      captionEl.style.opacity = "";
      captionEl.style.transform = "";
      hole.removeAttribute("transform");
    };
  }, [reduced, isMobile, onSolid]);

  return (
    <section ref={rootRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        <div ref={centerRef} className={styles.center}>
          <RevealMedia media={media} />
        </div>

        <svg className={styles.cover} aria-hidden="true">
          <defs>
            <mask id="crossMask">
              <rect width="100%" height="100%" fill="white" />
              <path ref={holeRef} d={buildCrossPath()} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`rgba(10,15,31,${DIM})`}
            mask="url(#crossMask)"
          />
        </svg>

        {tiles.slice(0, TILES.length).map((m, i) => (
          <div
            key={`${m.src}-${i}`}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className={`${styles.tile} ${styles[`tile${i + 1}`]}`}
          >
            <RevealMedia media={m} />
          </div>
        ))}

        <p ref={captionRef} className={styles.caption}>
          {caption}
        </p>
      </div>
    </section>
  );
}
