"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./HeroReveal.module.css";
import { lerp, clamp01, segment } from "./scrub";
import { useMediaFlag, REDUCED_MQ } from "@/lib/hooks/useMediaFlag";
import type { CollageTile, HeroMedia } from "./types";

export interface HeroRevealProps {
  /** 십자가로 드러나는 풀스크린 미디어. 영상이면 포스터로 굳은 뒤 페이드 아웃한다(단일 <video>). */
  media: HeroMedia;
  /** 풀스크린 홀드에서 등장했다 포스터 퇴장 직전 사라지는 카피. */
  caption: ReactNode;
  /** 콜라주 타일 — 데스크톱은 좌우 2컬럼, 모바일·reduced는 세로 스택. */
  tiles: CollageTile[];
  /** 포스터 원본 비율. 정적 스택(모바일·reduced)에서 포스터 카드를 크롭 없이 세우는 데만 쓴다. */
  posterAspect: number;
  /** 포스터 퇴장 임계(p>=P.solid) 교차 시 헤더 solid 전환 통지(양방향). */
  onSolid?: (solid: boolean) => void;
}

// 십자가 확정 비율 (14A.3) — 변경 시 디자인 재검토 필요
const CROSS = { vbw: 16, haw: 64, hbh: 16, cp: 32 };
const START_PCT = 38; // 시작 크기 %
const DIM = 0.85; // 덮개 어둡기

// 콜라주 = [좌 컬럼 | 우 컬럼] 2단, 사진 4장. 히어로 미디어는 카드로 남지 않는다 —
// 풀스크린에서 제 몫을 다 보여준 뒤 사라지고, 그 폭을 전부 사진이 가져간다(사진이 2배 커진다).
// 폭은 DESIGN.md 컨테이너(1200px)에 캡된다(콘텐츠 규칙).
//
// 슬롯에 사진을 맞추지 않고 **사진 비율에 슬롯을 맞춘다**(크롭 0). 컬럼 폭을 서로 다르게 잡아
// 좌·우 컬럼 높이를 일치시킨다. 컬럼 높이 H = 폭 · Σ(1/비율) + (n-1)·g 이고 L + R + g = W 이므로:
//
//   sL = Σ(1/좌측 비율), sR = Σ(1/우측 비율)
//   L = (W - g)·sR / (sL + sR),  R = (W - g)·sL / (sL + sR)
//   H = (W - g)·(sL·sR / (sL + sR)) + (n-1)·g
//
// 현재 자산(W=1152, g=24, n=2): L=480 · R=648, 두 컬럼 높이 754px.
// 사진을 갈아끼워도 aspect만 맞으면 정렬이 저절로 맞는다(수치 하드코딩 금지).
//
// 타일 → 컬럼 배정. 좌 컬럼은 아래에서, 우 컬럼은 위에서 흘러 들어와 격자에 멈춘다.
// 컬럼 안에서는 위 셀이 먼저 도착하도록 스태거.
const TILES = [
  { col: "L", seg: [0.7, 0.88], fromY: 40 }, // collage-1 — 좌 상
  { col: "R", seg: [0.72, 0.9], fromY: -40 }, // collage-2 — 우 상
  { col: "L", seg: [0.76, 0.94], fromY: 40 }, // collage-3 — 좌 하
  { col: "R", seg: [0.78, 0.96], fromY: -40 }, // collage-4 — 우 하
] as const;

// 통합 타임라인 — 십자가 리빌 → 카피 → 영상이 포스터로 굳음(풀스크린) → 포스터 퇴장 → 사진 그리드.
// 축소(clip-path)는 없다: 포스터를 창으로 들여다보면 면적의 13%만 보였고, 카드가 컨테이너 폭의
// 46%를 먹어 사진이 작아졌다. 풀스크린으로 다 보여준 뒤 비켜준다.
const P = {
  crossIn: [0.0, 0.34], // easeIn 열쇠구멍
  capIn: [0.36, 0.46], // 카피 페이드/슬라이드 인
  posterIn: [0.46, 0.6], // 영상 → 포스터 크로스페이드 (풀스크린 유지)
  capOut: [0.56, 0.64], // 카피 페이드 아웃
  solid: 0.64, // onSolid(true) 임계 — 포스터가 걷히며 흰 캔버스가 드러나기 직전
  heroOut: [0.66, 0.8], // 포스터 페이드 아웃 → 흰 캔버스
  // 타일 진입 0.70–0.96 (heroOut과 겹쳐 끊김 없이)
  seq: [0.7, 0.98], // 좁은 폭 전용 — 이 구간을 타일 수로 등분해 한 장씩 넘긴다
} as const;

// 좁은 폭(<640) — 2컬럼 격자면 사진이 컬럼 폭 절반까지 쪼그라든다. 격자를 포기하고 장면 단위로
// 화면 폭 가득 넘긴다(장면 분할은 seqGroups). 스크럽 길이는 CSS의 .hero 높이가 정한다(모바일 500vh).
const SINGLE_MQ = "(max-width: 639px)";
const SEQ_HOLD = 0.6; // 등분 구간 중 페이드 인에 쓰는 비율(나머지는 홀드 — 눈에 담을 시간)
const SEQ_FROM_Y = 5; // 진입 오프셋(vh)

// 영상을 실제로 재생할 환경. 이 쿼리가 안 맞으면 브라우저는 <source>를 건너뛰고 poster만 띄운다
// (HTML 스펙 "show poster flag") — 즉 모바일·reduced-motion은 영상 바이트를 0 받는다.
// JS로는 막을 수 없다: useMediaFlag의 SSR 스냅샷이 false라 서버 HTML에 <video>가 실리고,
// preload scanner가 하이드레이션 전에 이미 받기 시작한다. MOBILE_MQ의 여집합 + reduced 제외.
const VIDEO_MQ = "(min-width: 640px) and (prefers-reduced-motion: no-preference)";

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

// 중앙 미디어 렌더(타일은 항상 이미지라 이 경로를 타지 않는다).
// 영상은 src 대신 <source media>를 쓴다 — src가 있으면 <source>가 무시되므로 절대 되살리지 말 것.
// 14A.5의 onError→poster 폴백은 네이티브 동작으로 대체했다: 영상을 못 틀면(404·코덱 미지원·
// 미디어쿼리 미매칭) <video poster>가 포스터를 띄운다. 결과가 같아 JS 상태 기계가 필요 없다.
function RevealMedia({ media }: { media: HeroMedia }) {
  if (media.type === "video") {
    return (
      <video autoPlay muted loop playsInline preload="metadata" poster={media.poster}>
        <source src={media.src} media={VIDEO_MQ} />
      </video>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어; 콘텐츠 이미지는 next/image
    <img src={media.src} alt={media.alt ?? ""} />
  );
}

export default function HeroReveal({
  media,
  caption,
  tiles,
  posterAspect,
  onSolid,
}: HeroRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useMediaFlag(REDUCED_MQ);

  useEffect(() => {
    if (reduced) {
      // reduced-motion: 폭 무관하게 CSS 정적 스택(포스터 카드 + 사진 4장)이 전부를 표시한다.
      // JS 기하가 필요 없다 — 스크럽 없는 화면에서 굳이 절대좌표 격자를 만들 이유가 없다.
      return;
    }

    // 모바일 포함 전 폭 공통: 스크롤 진행도 비례 단일 rAF 스크럽 — 십자가 리빌 + 카피 + 축소 + 타일 통합.
    // 모바일은 <source media>가 안 맞아 <video>가 poster를 그대로 보여주므로(§RevealMedia 주석)
    // 영상 다운로드 없이 같은 스크럽을 탄다.
    const root = rootRef.current!;
    const sticky = stickyRef.current!;
    const centerEl = centerRef.current!;
    const posterEl = posterRef.current; // 영상 히어로일 때만 존재
    const hole = holeRef.current!;
    const captionEl = captionRef.current!;
    // unmount 시 ref callback이 null을 먼저 채우므로 cleanup용 스냅샷을 별도 캡처한다.
    const tileEls = tileRefs.current.slice();

    let startScale = 1,
      targetScale = 10,
      cx = 0,
      cy = 0,
      ticking = false,
      lastSolid = false,
      // 영상이 안 도는 환경(모바일)에서는 포스터가 곧 히어로다. <video poster>는 브라우저마다
      // object-fit 적용이 달라 믿을 수 없으므로, 포스터 <img>를 처음부터 덮어 crop-cover를 보장한다.
      posterOnly = false,
      single = false; // 좁은 폭 — 콜라주 격자 대신 장면 단위 순차 표시

    // 슬롯은 실제로 넘어온 타일 수만큼만 — TILES를 그대로 순회하면 tiles가 모자랄 때 터진다.
    const slots = TILES.slice(0, tiles.length);

    // 좁은 폭의 장면 분할 — 1번은 세로가 길어 혼자 크게, 나머지(가로가 긴 사진들)는 한 화면에
    // 세로로 쌓아 한 번에 보여준다. 장면 하나가 스크럽 구간을 통째로 쓴다.
    const seqGroups = [
      [0],
      slots.map((_, i) => i).slice(1),
    ].filter((g) => g.length);
    // 컬럼별 사진 비율의 역수 합 — 폭 1px당 늘어나는 컬럼 높이.
    const invSum = (col: "L" | "R") =>
      slots.reduce(
        (acc, t, i) => (t.col === col ? acc + 1 / tiles[i].aspect : acc),
        0,
      );
    const cellsPerCol = (col: "L" | "R") =>
      slots.filter((t) => t.col === col).length;

    const measure = () => {
      posterOnly = !window.matchMedia(VIDEO_MQ).matches;
      single = window.matchMedia(SINGLE_MQ).matches;
      const cs = getComputedStyle(root);
      const containerMax = parseFloat(cs.getPropertyValue("--container-max"));
      const pad = parseFloat(cs.getPropertyValue("--container-padding"));
      const gap = parseFloat(cs.getPropertyValue("--spacing-lg"));
      const nav = parseFloat(cs.getPropertyValue("--spacing-nav"));

      const vw = sticky.clientWidth,
        vh = sticky.clientHeight;

      cx = vw / 2;
      cy = vh / 2;
      startScale = (Math.min(vw, vh) * (START_PCT / 100)) / 100;
      targetScale = Math.max(vw / CROSS.vbw, vh / 100) * 1.1;

      // 순차 모드 — 장면(그룹)마다 헤더 아래 중앙에 세로 컬럼 하나. 폭은 컨테이너 규칙을 따르되
      // 그룹 전체 높이가 남는 높이를 넘으면 폭에서 역산해 줄인다(크롭 0 유지).
      if (single) {
        const availH = vh - nav - 2 * pad;
        const maxW = Math.min(containerMax - 2 * pad, vw - 2 * pad);
        seqGroups.forEach((group) => {
          const invs = group.reduce((a, i) => a + 1 / tiles[i].aspect, 0);
          const vGap = (group.length - 1) * gap;
          const w = Math.min(maxW, (availH - vGap) / invs);
          let top = nav + (vh - nav - (w * invs + vGap)) / 2;
          group.forEach((i) => {
            const el = tileEls[i];
            if (!el) return;
            const h = w / tiles[i].aspect;
            el.style.left = `${(vw - w) / 2}px`;
            el.style.top = `${top}px`;
            el.style.width = `${w}px`;
            el.style.height = `${h}px`;
            top += h + gap;
          });
        });
        return;
      }

      // 한쪽 컬럼이 비면 컬럼 높이를 맞추는 대수가 성립하지 않는다(좌2·우2 계약 위반).
      // 십자가·카피·포스터는 살리고 콜라주 기하만 건너뛴다.
      const sL = invSum("L"),
        sR = invSum("R");
      if (!sL || !sR) return;

      const vGap = (Math.max(cellsPerCol("L"), cellsPerCol("R")) - 1) * gap;
      // 폭 → 컬럼 높이 계수. H = (W - g)·k + vGap (파일 상단 TILES 주석 참조).
      const k = (sL * sR) / (sL + sR);

      // 폭은 컨테이너에 캡되고(DESIGN.md — 콘텐츠 1200px 캡), 헤더 아래 남는 높이에도 캡된다.
      // 둘 중 좁은 쪽을 택해야 상단 타일이 헤더에 잘리지 않는다.
      const availH = vh - nav - 2 * pad;
      const W = Math.min(
        containerMax - 2 * pad,
        vw - 2 * pad,
        (availH - vGap) / k + gap,
      );
      const H = (W - gap) * k + vGap;
      const colL = ((W - gap) * sR) / (sL + sR);
      const colR = ((W - gap) * sL) / (sL + sR);

      // 콜라주는 **헤더 아래 영역**에 세로 중앙정렬한다 — 이 시점의 헤더는 이미 solid라
      // 뷰포트 기준으로 잡으면 상단 타일이 헤더에 잘린다.
      const boxX = (vw - W) / 2;
      const boxY = nav + (vh - nav - H) / 2;

      // 타일을 컬럼 좌표에 인라인 배치. 컬럼 폭이 사진 비율에서 나오므로 CSS로는 표현할 수 없다.
      const colX = { L: boxX, R: boxX + colL + gap };
      const colW = { L: colL, R: colR };
      const nextTop = { L: boxY, R: boxY };
      slots.forEach((t, i) => {
        const el = tileEls[i];
        if (!el) return;
        const w = colW[t.col];
        const h = w / tiles[i].aspect;
        el.style.left = `${colX[t.col]}px`;
        el.style.top = `${nextTop[t.col]}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        nextTop[t.col] += h + gap;
      });
    };

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

      // 4) 영상 → 포스터 크로스페이드(풀스크린 유지) → 포스터 페이드 아웃 → 흰 캔버스
      if (posterEl) {
        posterEl.style.opacity = posterOnly
          ? "1"
          : String(segment(p, P.posterIn[0], P.posterIn[1]));
      }
      // 페이드는 선형 — easeOut을 걸면 앞구간에서 확 사라지고 끝에서 늘어져 끊겨 보인다.
      centerEl.style.opacity = String(
        1 - segment(p, P.heroOut[0], P.heroOut[1]),
      );

      // 5b) 타일 진입 — 격자: 좌 컬럼은 아래에서 ↑, 우 컬럼은 위에서 ↓ 흘러 들어와 멈춘다.
      if (single) {
        // 순차(좁은 폭): 장면이 등분 구간마다 아래에서 올라오고 앞 장면은 빠진다(곱셈 퇴장).
        // 사진 비율이 제각각이라 겹쳐 덮는 것으로는 앞 장면이 삐져나온다 — 반드시 크로스페이드.
        const span = (P.seq[1] - P.seq[0]) / seqGroups.length;
        const groupIn = (g: number) =>
          segment(p, P.seq[0] + g * span, P.seq[0] + (g + SEQ_HOLD) * span);
        seqGroups.forEach((group, g) => {
          const tt = groupIn(g);
          const out = g < seqGroups.length - 1 ? groupIn(g + 1) : 0;
          const opacity = String(tt * (1 - out));
          const transform = `translateY(${lerp(SEQ_FROM_Y, 0, tt)}vh)`;
          group.forEach((i) => {
            const el = tileEls[i];
            if (!el) return;
            el.style.opacity = opacity;
            el.style.transform = transform;
          });
        });
      } else {
        slots.forEach((conf, i) => {
          const el = tileEls[i];
          if (!el) return;
          const tt = segment(p, conf.seg[0], conf.seg[1]);
          el.style.opacity = String(tt);
          el.style.transform = `translateY(${lerp(conf.fromY, 0, tt)}vh)`;
        });
      }

      // 헤더 — 포스터가 걷히기 직전 임계 교차 시 solid 통지(양방향).
      const solid = p >= P.solid;
      if (solid !== lastSolid) {
        lastSolid = solid;
        onSolid?.(solid);
      }

      ticking = false;
    };

    // 브레이크포인트 전환 시 스테일 인라인이 모바일 CSS 스택 레이아웃을 덮지 않게 전부 지운다.
    const clearInline = () => {
      centerEl.style.opacity = "";
      if (posterEl) {
        posterEl.style.opacity = "";
      }
      tileEls.forEach((el) => {
        if (!el) return;
        el.style.cssText = "";
      });
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    const onResize = () => {
      measure();
      update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearInline();
      captionEl.style.opacity = "";
      captionEl.style.transform = "";
      hole.removeAttribute("transform");
    };
  }, [reduced, onSolid, tiles, posterAspect]);

  return (
    <section ref={rootRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        {/* 포스터 비율은 변수로만 넘긴다 — aspect-ratio를 직접 걸면 스크럽 모드(absolute inset:0)에서도
            폭에서 높이를 역산해 세로 화면이 납작하게 잘린다. CSS가 정적 스택(reduced)에서만 소비한다. */}
        <div
          ref={centerRef}
          className={styles.center}
          style={{ "--poster-aspect": posterAspect } as CSSProperties}
        >
          <RevealMedia media={media} />
          {media.type === "video" && media.poster ? (
            // 풀스크린을 유지한 채 페이드 인해 영상을 사진으로 굳힌다. <video poster>와 같은
            // URL이라 추가 다운로드가 없다(이미 캐시). 모바일·reduced는 CSS가 숨긴다.
            // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어
            <img
              ref={posterRef}
              className={styles.posterOverlay}
              src={media.poster}
              alt=""
              aria-hidden="true"
            />
          ) : null}
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

        {/* 슬롯 좌표·크기는 measure()가 인라인으로 넣는다 — 컬럼 폭이 사진 비율에서 나오기 때문. */}
        {tiles.slice(0, TILES.length).map((t, i) => (
          <div
            key={`${t.src}-${i}`}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className={`${styles.tile} ${TILES[i].col === "L" ? styles.tileL : styles.tileR}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어 */}
            <img src={t.src} alt={t.alt ?? ""} />
          </div>
        ))}

        <p ref={captionRef} className={styles.caption}>
          {caption}
        </p>
      </div>
    </section>
  );
}
