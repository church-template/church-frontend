# [T9] 부서 소개 페이지 (14B DeptHero)

**라벨:** `page`
**선행:** T7(앱 셸), T6(공통 유틸)
**참조:** 가이드 14B 전체·10장(부서), DESIGN.md

---

## 목적
부서 소개 페이지를 카드 확장 히어로(14B DeptHero)와 부서 상세 연동으로 구현한다. 메인(14A)과 다른 연출.

---

## 1. 데이터 연동 (부서)
- 라우트 **`/departments/{id}`**(승인). 상세 `GET /api/departments/{id}`(공개).
- 상세 응답 필드: `id`·`name`·`leader`·`parentId`·`sortOrder`·`description`·`createdAt`·`updatedAt`·`version` (**대표이미지/slug 없음** — 백엔드 답변 H 확정).
- `description`은 raw 마크다운 → MarkdownContent(T6).
- 목록 `GET /api/departments`는 **비페이징 평배열**(정렬 `sortOrder,id`) → 프론트가 `parentId`로 트리 조립(10장). **author·tags·viewCount 없음.**
- 공개 = 서버 컴포넌트 fetch(15.1).
> 부서 생성/수정/삭제(루트화 `PUT parentId=null`, 하위 있으면 `409 DEPARTMENT_HAS_CHILDREN`)는 어드민 영역 → 이번 배치 제외(조회·트리 표시까지).

## 2. 히어로 이미지 (백엔드 H — 프론트 상수)
부서 API에 대표이미지 필드가 없으므로 **프론트 상수 매핑**:
```ts
// 부서 id → 정적 에셋 (정적 에셋 a안)
const DEPT_HERO: Record<number, HeroMedia> = {
  /* 1: { type: 'image', src: '/dept/1.jpg', alt: '청년부' }, ... */
};
```
- `HeroMedia` 타입은 **T8 CrossHero와 공유** → `hero/types.ts`(단일 정의). DeptHero는 주입 방식만 다르고 컴포넌트 계약 동일.

## 3. 14B DeptHero — 카드 확장 히어로

미디어 카드가 스크롤에 따라 풀스크린으로 펼쳐진다. clip-path 방식(width/height 애니메이션 금지), placeholder 측정으로 시작 inset 산출.

### 3.1 구간 (14B.2)
| 구간 | 대상 | 동작 |
|---|---|---|
| 0.00~0.35 | 헤드라인 | translateY(0→-80px) + opacity(1→0) |
| 0.00~0.55 | 미디어 clip-path | inset(측정값→0), 위 radius 24→0 |
| 0.60~0.90 | 카피 | opacity(0→1) + translateY(+30→0) |
- 확장 종료(0.55)와 카피 시작(0.60) 사이 **0.05 숨 고르기 유지**(겹침 금지).

### 3.2 참조 구현 (14B.4 — 검증 코드, 로직 변경 금지)
파일명은 `DeptHero.tsx` + `DeptHero.module.css`로 분리(데모의 `CrossHero.module.css` import는 정리). `HeroMedia`는 `./hero/types`에서 import.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './DeptHero.module.css';
import type { HeroMedia } from './hero/types';

interface DeptHeroProps {
  title: string;
  caption: React.ReactNode;
  media: HeroMedia;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const segment = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));

export default function DeptHero({ title, caption, media }: DeptHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const hero = heroRef.current!;
    const sticky = stickyRef.current!;
    const frame = frameRef.current!;
    const mediaEl = mediaRef.current!;
    const titleEl = titleRef.current!;
    const captionEl = captionRef.current!;

    let startInset = { top: 0, right: 0, bottom: 0, left: 0 };
    let ticking = false;

    const measure = () => {
      const s = sticky.getBoundingClientRect();
      const r = frame.getBoundingClientRect();
      startInset = {
        top: r.top - s.top,
        left: r.left - s.left,
        right: s.right - r.right,
        bottom: s.bottom - r.bottom, // 레이아웃상 0 (하단 패딩 없음)
      };
      update();
    };

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - hero.offsetTop) / total);

      const pe = segment(p, 0, 0.55);
      const radius = lerp(24, 0, pe);
      mediaEl.style.clipPath =
        `inset(${lerp(startInset.top, 0, pe)}px ` +
        `${lerp(startInset.right, 0, pe)}px ` +
        `${lerp(startInset.bottom, 0, pe)}px ` +
        `${lerp(startInset.left, 0, pe)}px ` +
        `round ${radius}px ${radius}px 0 0)`;

      const pt = segment(p, 0, 0.35);
      titleEl.style.transform = `translateY(${lerp(0, -80, pt)}px)`;
      titleEl.style.opacity = String(1 - pt);

      const pc = segment(p, 0.6, 0.9);
      captionEl.style.opacity = String(pc);
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, pc)}px))`;

      ticking = false;
    };

    const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        <div className={styles.layout}>
          <h1 ref={titleRef} className={styles.title}>{title}</h1>
          <div ref={frameRef} className={styles.frame} aria-hidden="true" />
        </div>

        <div ref={mediaRef} className={styles.media}>
          {media.type === 'video' && !videoFailed ? (
            <video autoPlay muted loop playsInline preload="metadata"
              src={media.src} poster={media.poster}
              onError={() => setVideoFailed(true)} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.type === 'video' ? (media.poster ?? '') : media.src}
              alt={media.type === 'image' ? (media.alt ?? '') : ''} />
          )}
        </div>

        <p ref={captionRef} className={styles.caption}>{caption}</p>
      </div>
    </section>
  );
}
```

```css
/* DeptHero.module.css */
.hero { position: relative; height: 300vh; }
.sticky { position: sticky; top: 0; height: 100vh; height: 100dvh; overflow: hidden; }

.layout {
  position: relative; z-index: 2; height: 100%;
  width: 100%; max-width: 1200px; margin: 0 auto;  /* DESIGN.md layout 토큰과 일치 */
  padding: 14vh 24px 0;                            /* 하단 0: 카드가 바닥까지 */
  display: flex; flex-direction: column; pointer-events: none;
}
.title {
  font-size: clamp(36px, 6vw, 72px);
  font-weight: 500; letter-spacing: -0.02em;       /* DESIGN.md display-mega */
  margin: 0 0 5vh; will-change: transform, opacity;
}
.frame { flex: 1; visibility: hidden; }
.media {
  position: absolute; inset: 0; z-index: 1; will-change: clip-path;
  clip-path: inset(35% 24px 0 24px round 24px 24px 0 0); /* 첫 페인트 깜빡임 방지 근사값 */
}
.media video, .media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.caption {
  position: absolute; top: 50%; z-index: 3;
  left: max(24px, calc((100vw - 1200px) / 2 + 24px));
  transform: translateY(calc(-50% + 30px));
  color: #fff; font-size: clamp(28px, 4.5vw, 56px);
  font-weight: 500; line-height: 1.4; letter-spacing: -0.02em;
  margin: 0; opacity: 0; will-change: transform, opacity;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.25);
}
@media (prefers-reduced-motion: reduce) {
  .hero { height: auto; }
  .sticky { position: static; height: auto; }
  .layout { padding-bottom: 0; }
  .media { position: static; clip-path: none !important; height: 70vh; }
  .frame, .caption { display: none; }
}
```

### 3.3 금지 (14B.7)
- width/height/margin 직접 애니메이션 금지(reflow). 시작 inset %/상수 하드코딩 금지(placeholder 측정).
- scroll에서 rAF 스로틀 없이 DOM 갱신 금지. GSAP 등 외부 애니메 라이브러리 금지.
- 확장 구간과 카피 구간 겹침 금지(0.05 유지). 히어로 텍스트·미디어 하드코딩 금지(주입).

## 4. 완료 조건
- [ ] `/departments/{id}` 상세 연동 + description 마크다운
- [ ] 부서 목록 트리 조립(parentId)
- [ ] DeptHero 참조 구현(14B.4), `HeroMedia` 공유(`hero/types.ts`), 파일 분리
- [ ] 히어로 이미지 = 프론트 상수(부서 id 매핑), 정적 에셋
- [ ] reduced-motion 정적 폴백

## 5. 검수 기준 (14B.9)
- [ ] 시작: 카드 좌우 여백이 헤드라인 시작점과 정확히 정렬된다.
- [ ] 시작: 카드 하단이 여백 없이 뷰포트 바닥에 붙고, 위쪽 모서리만 둥글다.
- [ ] 스크롤 시 헤드라인이 먼저 사라지기 시작하고, 카드가 100vw×100vh까지 펼쳐진다.
- [ ] 풀스크린 완료 후에야 카피가 페이드인된다(겹침 없음).
- [ ] 섹션 통과 후 sticky가 풀리며 다음 섹션으로 자연스럽게 이어진다.
- [ ] 창 크기를 바꿔도 카드 시작 위치가 레이아웃과 어긋나지 않는다.
- [ ] 스크롤 중 reflow 없이 60fps에 준하는 부드러움.
- [ ] prefers-reduced-motion에서 정적 레이아웃으로 폴백.
- [ ] `media.type`을 video ↔ image로 바꿔도 동일 연출 동작(prop 교체만).
- [ ] 영상 URL을 깨뜨리면 poster로 폴백되고 효과 정상 동작.
- [ ] `/api/media/{id}` 소스로도 정적 에셋과 동일하게 동작.
- [ ] 모바일 Safari/Chrome에서 영상 자동재생 + 효과 동작.
