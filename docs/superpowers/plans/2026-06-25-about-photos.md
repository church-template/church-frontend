# 교회사진 페이지(`/about/photos`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **사용자 지시:** 단위 테스트 코드는 작성하지 않는다(간단한 작업). 검증은 `npx tsc --noEmit` + `pnpm lint` + `pnpm build`.

**Goal:** `/about/photos`를 교회 내부/외부 사진을 토글로 전환·확대해 보는 공개 페이지로 구현한다.

**Architecture:** `/about` 도메인 관례대로 **프론트 상수 구동 정적 생성**. 서버 컴포넌트 페이지가 `CHURCH_PHOTOS` 상수를 자체 client 컴포넌트 `ChurchPhotos`에 주입. `ChurchPhotos`는 `Tabs`(카테고리 토글) + 썸네일 그리드 + `Dialog` 확대 모달을 조합하고, 이미지는 `public/photos/**` 정적 에셋을 `<img>`로 직접 렌더한다(갤러리 컴포넌트 미재사용). 네트워크 API 호출 0.

**Tech Stack:** Next.js(App Router)·TypeScript·Tailwind v4(토큰)·Radix(shadcn 재스킨 `Tabs`·`Dialog`)·lucide-react.

## Global Constraints

- 패키지 매니저 **pnpm**. 빌드: `pnpm build`. 린트: `pnpm lint`. 타입체크: `npx tsc --noEmit`(린트와 별개).
- **테스트 코드 미작성**(사용자 지시): 단위 테스트 파일을 만들지 않는다. 검증은 `npx tsc --noEmit` + `pnpm lint` + `pnpm build`.
- **콘텐츠 하드코딩 금지** — 사용자 노출 텍스트·이미지 경로·alt·분류명은 전부 `src/constants/content.ts`에서 주입. 컴포넌트에 인라인 금지.
- **hex·px 인라인 금지** — 색·간격·라운드·z는 DESIGN.md 토큰(Tailwind 유틸). 허용 예외(레이아웃 값): `max-h-[70vh]`, `max-w-[var(--container-lightbox)]`, 썸네일 호버 `hover:scale-[1.03]`(PhotoGrid 선례와 동일).
- **텍스트 스타일은 `typo.*` 의미 상수**(`@/constants/typography`). 폰트 크기/굵기 직접 금지.
- **lucide 아이콘은 `size` prop + `currentColor`**(className으로 크기 지정 금지). UI 이모지 금지.
- **JSX 조건부는 삼항** `{cond ? <X/> : null}` (`{cond && <X/>}` 금지). `cn()` 내부 `&&`는 허용.
- **허용 스택 외 라이브러리 추가 금지.** 갤러리 `PhotoGrid`/`PhotoLightbox`는 재사용하지 않는다(자체 컴포넌트). 단 `Tabs`·`Dialog`·`Button`·`EmptyState`는 재사용.
- **커밋은 명시 요청 시에만**(프로젝트 규칙). 실제 커밋은 사용자 승인 하에 수행하고, 메시지 끝에 이슈 태그 `#<이슈번호>`. `<이슈번호>` = 이 교회사진 기능에 배정될 GitHub 이슈 번호(현재 미배정 — 사용자 확정). Co-Authored-By 금지.

---

### Task 1: 데이터 모델 — `CHURCH_PHOTOS` 확장 + 타입

**Files:**
- Modify: `src/constants/content.ts` (기존 `CHURCH_PHOTOS` 블록, 현재 234–237행 근처)

**Interfaces:**
- Produces: `type ChurchPhoto = { src: string; alt: string }`, `type PhotoGroup = { key: string; title: string; photos: ChurchPhoto[] }`, 그리고 `CHURCH_PHOTOS: { title: string; empty: string; groups: PhotoGroup[] }`. Task 2·3이 `PhotoGroup` 타입과 `CHURCH_PHOTOS.groups`/`.empty`/`.title`을 소비한다.

- [ ] **Step 1: `CHURCH_PHOTOS`를 타입과 함께 교체**

`src/constants/content.ts`에서 기존 블록
```ts
// 교회 사진(정적 시설 사진) 페이지 — 자산이 준비되면 그리드로 교체. 지금은 빈 상태 문구만.
export const CHURCH_PHOTOS = {
  title: "교회 사진",
  empty: "교회 사진을 준비 중입니다.",
};
```
을 아래로 교체(실제 업로드 파일명 기준 — interior 6장, exterior 5장, 확장자 혼재):
```ts
// 교회 사진(정적 시설 사진) — public/photos/{interior,exterior} 정적 에셋을 그룹별로 주입.
// 분류·경로·alt는 상수에서만(하드코딩 금지). alt는 편집 쉬운 인덱스 기본값.
export type ChurchPhoto = { src: string; alt: string };
export type PhotoGroup = { key: string; title: string; photos: ChurchPhoto[] };

export const CHURCH_PHOTOS: { title: string; empty: string; groups: PhotoGroup[] } = {
  title: "교회 사진",
  empty: "교회 사진을 준비 중입니다.",
  groups: [
    {
      key: "interior",
      title: "교회 내부",
      photos: [
        { src: "/photos/interior/in_1.jpg", alt: "교회 내부 1" },
        { src: "/photos/interior/in_2.jpg", alt: "교회 내부 2" },
        { src: "/photos/interior/in_3.jpg", alt: "교회 내부 3" },
        { src: "/photos/interior/in_4.jpg", alt: "교회 내부 4" },
        { src: "/photos/interior/in_5.jpg", alt: "교회 내부 5" },
        { src: "/photos/interior/in_6.jpeg", alt: "교회 내부 6" },
      ],
    },
    {
      key: "exterior",
      title: "교회 외부",
      photos: [
        { src: "/photos/exterior/out_1.jpg", alt: "교회 외부 1" },
        { src: "/photos/exterior/out_2.jpg", alt: "교회 외부 2" },
        { src: "/photos/exterior/out_3.jpeg", alt: "교회 외부 3" },
        { src: "/photos/exterior/out_4.jpg", alt: "교회 외부 4" },
        { src: "/photos/exterior/out_5.jpeg", alt: "교회 외부 5" },
      ],
    },
  ],
};
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS. 기존 `about/photos/page.tsx`가 아직 `.empty`/`.title`만 쓰므로 깨지지 않는다.

- [ ] **Step 3: Commit** (사용자 승인 시)

```bash
git add src/constants/content.ts
git commit -m "feat : 교회사진 상수 CHURCH_PHOTOS 내부/외부 그룹 확장 #<이슈번호>"
```

---

### Task 2: `ChurchPhotos` 컴포넌트 (토글 + 그리드 + 확대 모달)

**Files:**
- Create: `src/components/about/ChurchPhotos.tsx`
- Modify: `.claude/rules/DESIGN.md` (`church-photos` 컴포넌트 등록)

**Interfaces:**
- Consumes: `PhotoGroup`(Task 1, `@/constants/content`). 프리미티브 — `Tabs/TabsList/TabsTrigger/TabsContent`(`@/components/ui/tabs`), `Dialog/DialogContent/DialogTitle`(`@/components/ui/dialog`), `Button`(`@/components/ui/Button`, props `variant`·`iconOnly`), `EmptyState`(`@/components/common/EmptyState`, props `message`·`className`), `typo`(`@/constants/typography`), `cn`(`@/lib/utils`).
- Produces: `export function ChurchPhotos({ empty, groups }: { empty: string; groups: PhotoGroup[] })`. Task 3이 소비.

- [ ] **Step 1: DESIGN.md에 컴포넌트 등록**

`.claude/rules/DESIGN.md`의 `### 연출` 섹션에서 `department-card` 항목 바로 아래에 추가:
```markdown
- **`church-photos`**: 교회사진(`/about/photos`) 공개 페이지. 카테고리 토글(`Tabs` 재사용, 교회 내부/외부)로 사진 그리드를 통째 교체, 썸네일 클릭 시 `Dialog` 확대 모달(좌우 이동·키보드, 이동은 활성 그룹 내부). 콘텐츠는 `CHURCH_PHOTOS` 상수(`public/photos/**` 정적 에셋) 주입, 갤러리 미재사용(자체 컴포넌트)·`<img>` 프레젠테이션 셸. 정적 생성(API 호출 0).
```

- [ ] **Step 2: 컴포넌트 구현**

Create `src/components/about/ChurchPhotos.tsx`:
```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { PhotoGroup } from "@/constants/content";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-md";

// 교회사진 공개 페이지 본체 — 카테고리 토글(Tabs) + 그리드 + 확대 모달(Dialog).
// 갤러리 미재사용(자체 컴포넌트), 이미지는 public/ 정적 에셋을 <img>로 직접 렌더.
export function ChurchPhotos({ empty, groups }: { empty: string; groups: PhotoGroup[] }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? "");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const activeGroup = groups.find((g) => g.key === activeKey) ?? groups[0];
  const photos = activeGroup?.photos ?? [];
  const open = lightboxIndex !== null;
  const current = open ? photos[lightboxIndex] : null;
  const hasPrev = open && lightboxIndex > 0;
  const hasNext = open && lightboxIndex < photos.length - 1;

  const go = (delta: number) => {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + delta;
    if (next >= 0 && next < photos.length) setLightboxIndex(next);
  };

  return (
    <>
      <Tabs
        value={activeKey}
        onValueChange={(v) => {
          setActiveKey(v);
          setLightboxIndex(null); // 묶음 전환 시 모달 닫기
        }}
        className="mt-xl"
      >
        <TabsList>
          {groups.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>
              {g.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((g) => (
          <TabsContent key={g.key} value={g.key}>
            {g.photos.length === 0 ? (
              <EmptyState message={empty} className="mt-lg" />
            ) : (
              <div className="mt-lg grid grid-cols-2 gap-xs sm:grid-cols-3 lg:grid-cols-4">
                {g.photos.map((p, i) => (
                  <button
                    key={p.src}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`${i + 1}번째 사진 크게 보기`}
                    className={cn("block w-full", focusRing)}
                  >
                    <span className="block aspect-square overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
                      <img
                        src={p.src}
                        alt={p.alt}
                        className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.03]"
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setLightboxIndex(null);
        }}
      >
        <DialogContent
          className="max-w-[var(--container-lightbox)]"
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
          }}
        >
          {/* a11y: 제목은 시각적으로 숨기되 aria 연결 유지 */}
          <DialogTitle className="sr-only">
            {activeGroup?.title} 사진 {open ? lightboxIndex + 1 : 0} / {photos.length}
          </DialogTitle>

          {current ? (
            <div className="flex flex-col gap-sm">
              <div className="relative flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
                <img
                  src={current.src}
                  alt={current.alt}
                  className="max-h-[70vh] w-auto rounded-md object-contain"
                />
                <Button
                  type="button"
                  variant="tertiary"
                  iconOnly
                  onClick={() => go(-1)}
                  disabled={!hasPrev}
                  aria-label="이전 사진"
                  className="absolute left-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
                >
                  <ChevronLeft size={24} aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  iconOnly
                  onClick={() => go(1)}
                  disabled={!hasNext}
                  aria-label="다음 사진"
                  className="absolute right-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30"
                >
                  <ChevronRight size={24} aria-hidden />
                </Button>
              </div>
              <div className={cn(typo.datetime, "text-center text-muted")}>
                {lightboxIndex! + 1} / {photos.length}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

> 참고: `hasPrev`/`go`/`lightboxIndex!`의 `number | null` 패턴은 기존 `PhotoLightbox.tsx`와 동일(검증된 컴파일 패턴). 모달 캡션 텍스트는 생략(`n / total`만 표시, alt는 `<img>` a11y용).

- [ ] **Step 3: 린트 + 타입체크**

Run: `pnpm lint && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit** (사용자 승인 시)

```bash
git add src/components/about/ChurchPhotos.tsx .claude/rules/DESIGN.md
git commit -m "feat : 교회사진 토글·그리드·확대 모달 컴포넌트 #<이슈번호>"
```

---

### Task 3: 페이지 연결 (`about/photos/page.tsx` 스텁 교체)

**Files:**
- Modify: `src/app/(site)/about/photos/page.tsx`

**Interfaces:**
- Consumes: `ChurchPhotos`(Task 2), `CHURCH_PHOTOS`(Task 1). `Container`(`@/components/shell/Container`, props `as`·`className`), `typo`, `cn`.

- [ ] **Step 1: 페이지 교체**

`src/app/(site)/about/photos/page.tsx` 전체를 교체:
```tsx
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CHURCH_PHOTOS } from "@/constants/content";
import { ChurchPhotos } from "@/components/about/ChurchPhotos";

export const metadata: Metadata = { title: CHURCH_PHOTOS.title };

// 교회 사진 — 상수 구동 정적 생성(백엔드 무관, about 도메인 격리). 토글·그리드·모달은 client 컴포넌트.
export default function ChurchPhotosPage() {
  return (
    <Container as="section" className="break-keep py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{CHURCH_PHOTOS.title}</h1>
      <ChurchPhotos empty={CHURCH_PHOTOS.empty} groups={CHURCH_PHOTOS.groups} />
    </Container>
  );
}
```

- [ ] **Step 2: 전체 검증 (린트·타입·빌드)**

Run: `pnpm lint && npx tsc --noEmit`
Expected: 통과.

Run: `pnpm build`
Expected: 빌드 성공. `/about/photos` 정상 생성.

> 빌드 시 백엔드 fetch가 있는 다른 라우트가 로컬 백엔드 부재로 실패해도 본 작업과 무관(`/about/photos`는 fetch 없음, 메모리 `next16-connection-vs-force-dynamic`). 타입·린트가 1차 게이트.

- [ ] **Step 3: Commit** (사용자 승인 시)

```bash
git add "src/app/(site)/about/photos/page.tsx"
git commit -m "feat : 교회사진 페이지 토글 그리드 연결 #<이슈번호>"
```

---

## Self-Review

**1. Spec coverage** (spec `2026-06-25-about-photos-design.md` 대비):
- §2 데이터 모델 → Task 1 ✅ / §3 컴포넌트(토글·그리드·모달·빈처리) → Task 2 ✅ / §3 페이지+metadata → Task 3 ✅
- §4 토큰·DESIGN.md 등록 → Task 2 Step 1 + Global Constraints ✅
- §6 테스트 → **사용자 지시로 생략**(tsc/lint/build 검증으로 대체) ✅
- §1 갤러리 미재사용·`<img>`·자체 컴포넌트 → Global Constraints + Task 2 코드 ✅ / §8 비범위 → 미포함 ✅

**2. Placeholder scan:** 코드 단계는 전부 실제 코드. `#<이슈번호>`만 외부 미배정 식별자(Global Constraints에 정의).

**3. Type consistency:** `ChurchPhoto`/`PhotoGroup`(Task 1) → Task 2 import·props → Task 3 주입까지 동일. `ChurchPhotos({ empty, groups })` 시그니처 Task 2 정의 ↔ Task 3 호출 일치. 프리미티브 시그니처(`EmptyState message`·`Button variant/iconOnly`·`Dialog open/onOpenChange`·`Tabs value/onValueChange`)는 실제 컴포넌트와 일치(확인 완료).
