# 연락처·오시는 길 페이지 재디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/about/location`을 연락처(주소·전화·이메일)+약도 2단 → 교통 안내 카드 밴드 구조로 재디자인해 최근 재디자인 페이지와 톤을 통일한다.

**Architecture:** 흰 캔버스 `LocationContact`(연락 정보 비대칭 그리드 + 약도/iframe 폴백)와 회색 밴드 `LocationDirections`(lucide 아이콘 카드) 두 서버 컴포넌트로 분리하고, `page.tsx`는 조립만 한다. 콘텐츠는 `content.ts`의 `LOCATION` 상수로 주입한다.

**Tech Stack:** Next.js(App Router, 본 프로젝트 전용 버전) · TypeScript · Tailwind v4(`@theme` 토큰) · vitest + React Testing Library · lucide-react

## Global Constraints

- 색·크기·간격은 **DESIGN.md 토큰만** — hex·px 인라인 금지, arbitrary value(`bg-[#...]`·`text-[20px]`) 금지
- 텍스트 스타일은 **`typo.*` 의미 상수**(`@/constants/typography`)만 사용 — 폰트 크기/굵기/행간 직접 지정 금지
- 아이콘은 **lucide-react만**, 색 `currentColor`(`text-primary` 등 토큰 클래스), 크기 `size` prop
- JSX 조건부는 **삼항** `{cond ? <X/> : null}` — `{cond && <X/>}` 금지 (`cn()` 내부 `&&`만 허용)
- 사용자 노출 **콘텐츠는 상수 주입**(주소·전화·이메일·약도·교통 lines). 구조적 UI 라벨(주소/전화/이메일/카카오맵 길찾기)은 인라인 허용(기존 "지도에서 보기" 관례)
- `<img>` 직접 사용 시 바로 위에 `{/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}` 부착(기존 `ChurchPhotos` 관례)
- 패키지 매니저 **pnpm**
- 커밋은 **사용자가 명시 요청할 때만**. 커밋 메시지는 `<type> : <설명> #74` 형식(Co-Authored-By 태그 금지)

---

### Task 1: `LOCATION` 상수 재구성 + 약도 placeholder 에셋

**Files:**
- Modify: `src/constants/content.ts` (`LOCATION`, 현재 268–275행)
- Create: `public/location/map-placeholder.svg`

**Interfaces:**
- Consumes: 없음
- Produces (Task 2가 소비):
  - `LOCATION.title: string`
  - `LOCATION.lead: string`
  - `LOCATION.map: { src: string; alt: string }`
  - `LOCATION.directionsHeading: string`
  - `LOCATION.directions: { key: string; title: string; lines: string[] }[]`
  - `LOCATION.transit: string[]` — **이 태스크에선 유지**(page.tsx 컴파일 보존), Task 2에서 제거

- [ ] **Step 1: `LOCATION` 상수에 필드 추가(transit 유지)**

`src/constants/content.ts`의 기존 `LOCATION`(268–275행)을 아래로 교체:

```ts
export const LOCATION = {
  title: "오시는 길",
  lead: "은샘교회를 찾아오시는 길을 안내합니다.",
  // 약도(그림 지도). 실제 약도 이미지를 public/location/ 에 넣고 src만 교체하면 된다(단일 교체점).
  map: { src: "/location/map-placeholder.svg", alt: "은샘교회 약도" },
  directionsHeading: "찾아오는 방법",
  directions: [
    {
      key: "car",
      title: "자가용",
      lines: [
        "교회 주차 공간이 마련되어 있습니다.",
        "내비게이션: '은샘교회' 또는 '수암산로 260' 검색",
      ],
    },
    // 대중교통 실제 노선 문구는 교회가 채운다(placeholder).
    { key: "transit", title: "대중교통", lines: ["버스 노선 정보 준비 중입니다."] },
  ],
  // TODO(Task 2): page.tsx 갱신 후 제거
  transit: [
    "자가용: 교회 주차 공간이 마련되어 있습니다.",
    "내비게이션: '은샘교회' 또는 '수암산로 260' 검색",
  ],
};
```

- [ ] **Step 2: 약도 placeholder SVG 생성**

`public/location/map-placeholder.svg` 신규 생성:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="약도 자리표시자">
  <rect width="800" height="450" fill="#f0f1f3"/>
  <rect x="20" y="20" width="760" height="410" rx="24" fill="none" stroke="#d6d9de" stroke-width="2" stroke-dasharray="12 10"/>
  <text x="400" y="210" font-family="sans-serif" font-size="34" fill="#9aa0a8" text-anchor="middle">약도 자리표시자</text>
  <text x="400" y="258" font-family="sans-serif" font-size="20" fill="#b4b9c0" text-anchor="middle">public/location/ 에 약도 이미지를 넣어 교체하세요</text>
</svg>
```

- [ ] **Step 3: 타입 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: PASS (필드 추가는 가산적이며 `transit` 유지로 기존 `page.tsx` 소비처가 그대로 컴파일됨)

- [ ] **Step 4: 커밋** (사용자 요청 시)

```bash
git add src/constants/content.ts public/location/map-placeholder.svg
git commit -m "feat : 오시는 길 콘텐츠 상수 재구성·약도 placeholder 추가 #<이슈번호>"
```

---

### Task 2: 페이지 재디자인 — 컴포넌트 2종 + page 조립 + 테스트(TDD)

**Files:**
- Modify(테스트 먼저): `src/app/(site)/about/location/page.test.tsx`
- Modify(테스트 먼저): `src/app/(site)/about/location/page.embed.test.tsx`
- Create: `src/components/about/LocationContact.tsx`
- Create: `src/components/about/LocationDirections.tsx`
- Modify: `src/app/(site)/about/location/page.tsx`
- Modify: `src/constants/content.ts` (`LOCATION.transit` 제거)

**Interfaces:**
- Consumes: Task 1의 `LOCATION.{title,lead,map,directionsHeading,directions}` / `church.ts`의 `CHURCH_ADDRESS, CHURCH_PHONE, CHURCH_EMAIL, MAP_EMBED_SRC, mapSearchUrl`(변경 없음)
- Produces:
  - `LocationContact()` — 흰 섹션 컴포넌트 (named export)
  - `LocationDirections()` — 회색 밴드 컴포넌트 (named export)

- [ ] **Step 1: `page.test.tsx`를 새 기대로 교체(RED)**

`src/app/(site)/about/location/page.test.tsx` 전체 교체:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CHURCH_ADDRESS, CHURCH_PHONE, CHURCH_EMAIL } from "@/constants/church";
import { LOCATION } from "@/constants/content";
import LocationPage from "./page";

describe("LocationPage", () => {
  it("제목·연락처·약도(폴백)·교통 안내를 렌더한다", () => {
    render(<LocationPage />);
    expect(screen.getByText(LOCATION.title)).toBeDefined();
    expect(screen.getByText(CHURCH_ADDRESS)).toBeDefined();
    // 전화·이메일은 tel/mailto 링크로 노출(고령 사용자 탭 발신)
    expect(
      screen.getByRole("link", { name: CHURCH_PHONE }).getAttribute("href"),
    ).toBe(`tel:${CHURCH_PHONE}`);
    expect(
      screen.getByRole("link", { name: CHURCH_EMAIL }).getAttribute("href"),
    ).toBe(`mailto:${CHURCH_EMAIL}`);
    // MAP_EMBED_SRC가 비어 있으므로 약도 이미지 + 카카오맵 길찾기 링크(폴백)가 노출된다.
    expect(screen.getByAltText(LOCATION.map.alt)).toBeDefined();
    expect(screen.getByRole("link", { name: "카카오맵 길찾기" })).toBeDefined();
    // 교통 안내 섹션
    expect(screen.getByText(LOCATION.directionsHeading)).toBeDefined();
    expect(screen.getByText(LOCATION.directions[0].title)).toBeDefined();
  });
});
```

- [ ] **Step 2: `page.embed.test.tsx`의 church 모킹·단언 갱신(RED 무관, 회귀 보존)**

`src/app/(site)/about/location/page.embed.test.tsx` 전체 교체 (새 컴포넌트가 `CHURCH_PHONE`·`CHURCH_EMAIL`도 import하므로 모킹에 추가):

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// MAP_EMBED_SRC가 설정된 배포 환경의 iframe 분기 검증 — 본 테스트 파일에서만 모듈 모킹.
vi.mock("@/constants/church", () => ({
  CHURCH_ADDRESS: "충청남도 예산군 삽교읍 수암산로 260",
  CHURCH_PHONE: "041-337-2298",
  CHURCH_EMAIL: "hsk71418@naver.com",
  MAP_EMBED_SRC: "https://map.example.com/embed/1",
  mapSearchUrl: (address: string) => `https://map.kakao.com/?q=${encodeURIComponent(address)}`,
}));

import LocationPage from "./page";

describe("LocationPage (embed)", () => {
  it("MAP_EMBED_SRC가 설정되면 iframe을 렌더하고 약도 폴백 링크는 숨긴다", () => {
    render(<LocationPage />);
    const iframe = screen.getByTitle("교회 위치 지도");
    expect(iframe.getAttribute("src")).toBe("https://map.example.com/embed/1");
    expect(screen.queryByRole("link", { name: "카카오맵 길찾기" })).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인(RED)**

Run: `pnpm test src/app/\(site\)/about/location`
Expected: `page.test.tsx` FAIL (기존 `page.tsx`는 전화/이메일 링크·약도 alt·"카카오맵 길찾기"·교통 헤딩을 렌더하지 않음). `page.embed.test.tsx`는 PASS(임베드 동작 불변).

- [ ] **Step 4: `LocationContact` 컴포넌트 생성**

`src/components/about/LocationContact.tsx` 신규:

```tsx
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import {
  CHURCH_ADDRESS,
  CHURCH_PHONE,
  CHURCH_EMAIL,
  MAP_EMBED_SRC,
  mapSearchUrl,
} from "@/constants/church";
import { LOCATION } from "@/constants/content";

// 흰 캔버스 — 연락 정보(좌)와 약도(우) 비대칭 5/7 스플릿. 약도는 임베드 폴백 분기 보존.
export function LocationContact() {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h1 className={cn(typo.displayMd, "text-ink")}>{LOCATION.title}</h1>
        <p className={cn(typo.bodyMd, "mt-base text-body")}>{LOCATION.lead}</p>

        <div className="mt-xxl grid gap-xl lg:grid-cols-[5fr_7fr] lg:items-start">
          {/* 좌 — 연락 정보 */}
          <dl className="border-t border-hairline">
            <div className="border-b border-hairline py-base">
              <dt className={cn(typo.captionStrong, "text-muted")}>주소</dt>
              <dd className={cn(typo.bodyMd, "mt-xs text-ink")}>{CHURCH_ADDRESS}</dd>
            </div>
            <div className="border-b border-hairline py-base">
              <dt className={cn(typo.captionStrong, "text-muted")}>전화</dt>
              <dd className={cn(typo.bodyMd, "mt-xs text-ink")}>
                <a href={`tel:${CHURCH_PHONE}`} className="hover:text-primary">
                  {CHURCH_PHONE}
                </a>
              </dd>
            </div>
            <div className="border-b border-hairline py-base">
              <dt className={cn(typo.captionStrong, "text-muted")}>이메일</dt>
              <dd className={cn(typo.bodyMd, "mt-xs break-all text-ink")}>
                <a href={`mailto:${CHURCH_EMAIL}`} className="hover:text-primary">
                  {CHURCH_EMAIL}
                </a>
              </dd>
            </div>
          </dl>

          {/* 우 — 약도(임베드 있으면 iframe, 없으면 약도 이미지 + 길찾기 링크) */}
          <div>
            {MAP_EMBED_SRC ? (
              <iframe
                src={MAP_EMBED_SRC}
                title="교회 위치 지도"
                loading="lazy"
                className="aspect-video w-full rounded-xl border border-hairline"
              />
            ) : (
              <div className="flex flex-col gap-base">
                {/* eslint-disable-next-line @next/next/no-img-element -- 프레젠테이션 셸 */}
                <img
                  src={LOCATION.map.src}
                  alt={LOCATION.map.alt}
                  loading="lazy"
                  className="aspect-video w-full rounded-xl border border-hairline object-cover"
                />
                <a
                  href={mapSearchUrl(CHURCH_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants("secondary")}
                >
                  카카오맵 길찾기
                </a>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </Container>
  );
}
```

- [ ] **Step 5: `LocationDirections` 컴포넌트 생성**

`src/components/about/LocationDirections.tsx` 신규:

```tsx
import { Bus, Car, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { LOCATION } from "@/constants/content";

// directions.key → 아이콘(표현용 매핑). 미정의 key는 Car로 폴백.
const DIRECTION_ICONS: Record<string, LucideIcon> = { car: Car, transit: Bus };

// 회색 밴드 — 찾아오는 방법을 lucide 아이콘 카드 그리드로(데스크톱 2-up·모바일 1-up).
export function LocationDirections() {
  return (
    <section className="break-keep bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.titleLg, "text-ink")}>{LOCATION.directionsHeading}</h2>
        </Reveal>
        <ul className="mt-xxl grid gap-base sm:grid-cols-2">
          {LOCATION.directions.map((item, i) => {
            const Icon = DIRECTION_ICONS[item.key] ?? Car;
            return (
              <li key={item.key}>
                <Reveal delay={i * 120}>
                  <div className="flex h-full flex-col gap-base rounded-xl border border-hairline bg-canvas p-xl">
                    <Icon size={32} className="text-primary" aria-hidden="true" />
                    <h3 className={cn(typo.titleMd, "text-ink")}>{item.title}</h3>
                    <div className={cn(typo.bodyMd, "text-body")}>
                      {item.lines.map((line) => (
                        <p key={line} className="mt-xs first:mt-0">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
```

- [ ] **Step 6: `page.tsx`를 조립으로 교체**

`src/app/(site)/about/location/page.tsx` 전체 교체:

```tsx
import { LocationContact } from "@/components/about/LocationContact";
import { LocationDirections } from "@/components/about/LocationDirections";

// 연락처·오시는 길 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
export default function LocationPage() {
  return (
    <>
      <LocationContact />
      <LocationDirections />
    </>
  );
}
```

- [ ] **Step 7: `LOCATION.transit` 제거(소비처 정리 완료)**

`src/constants/content.ts`의 `LOCATION`에서 Task 1 Step 1에 남겨둔 `transit` 블록과 `// TODO(Task 2)` 주석을 삭제. 최종 형태:

```ts
export const LOCATION = {
  title: "오시는 길",
  lead: "은샘교회를 찾아오시는 길을 안내합니다.",
  // 약도(그림 지도). 실제 약도 이미지를 public/location/ 에 넣고 src만 교체하면 된다(단일 교체점).
  map: { src: "/location/map-placeholder.svg", alt: "은샘교회 약도" },
  directionsHeading: "찾아오는 방법",
  directions: [
    {
      key: "car",
      title: "자가용",
      lines: [
        "교회 주차 공간이 마련되어 있습니다.",
        "내비게이션: '은샘교회' 또는 '수암산로 260' 검색",
      ],
    },
    // 대중교통 실제 노선 문구는 교회가 채운다(placeholder).
    { key: "transit", title: "대중교통", lines: ["버스 노선 정보 준비 중입니다."] },
  ],
};
```

- [ ] **Step 8: 테스트 실행 → 통과 확인(GREEN)**

Run: `pnpm test src/app/\(site\)/about/location`
Expected: `page.test.tsx`·`page.embed.test.tsx` 모두 PASS

- [ ] **Step 9: 타입·린트 확인**

Run: `npx tsc --noEmit && pnpm lint`
Expected: 둘 다 PASS (`transit` 제거 후 미참조 없음, `<img>`는 eslint-disable 주석으로 통과)

- [ ] **Step 10: 커밋** (사용자 요청 시)

```bash
git add "src/app/(site)/about/location" src/components/about/LocationContact.tsx src/components/about/LocationDirections.tsx src/constants/content.ts
git commit -m "feat : 연락처·오시는 길 페이지 UI/UX 재디자인 #<이슈번호>"
```

---

### Task 3: 최종 검증 게이트 (빌드 + 반응형 육안)

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 프로덕션 빌드(정적 생성 확인)**

Run: `pnpm build`
Expected: PASS, `/about/location`이 정적(○ Static)으로 표기

- [ ] **Step 2: 개발 서버 육안 확인**

Run: `pnpm dev` 후 `http://localhost:3000/about/location` 접속. 확인:
- 데스크톱: 좌 연락 정보(주소/전화/이메일) + 우 약도 placeholder + "카카오맵 길찾기" 버튼, 아래 회색 밴드에 자가용/대중교통 카드 2-up
- 모바일(≤640px): 2단이 세로 1단으로 접힘, 카드 1-up, 섹션 패딩 축소
- 전화·이메일 링크가 `tel:`/`mailto:`로 동작, 길찾기 링크가 카카오맵 새 탭으로 열림
- Reveal 진입 애니메이션 동작, 하단 기존 CtaBand 정상 노출

---

## Self-Review

**1. Spec coverage**
- 연락처(주소·전화·이메일) 노출 → Task 2 `LocationContact` ✓
- 약도 placeholder + 길찾기 링크 / iframe 폴백 보존 → Task 2 Step 4(삼항 분기), Task 1(에셋) ✓
- 교통 안내 카드(자가용/대중교통) → Task 2 `LocationDirections` ✓
- 흰↔회색 밴드 리듬·Reveal·비대칭 그리드 → Task 2 ✓
- 콘텐츠 상수화·`church.ts` 무변경 → Task 1 + Global Constraints ✓
- 반응형·고령 가독성·터치 타깃 → Task 3 육안 게이트 ✓
- 테스트(폴백/임베드 분기) → Task 2 Step 1·2·8 ✓

**2. Placeholder scan**
- 코드 placeholder(TBD/TODO) 없음. `transit`의 `// TODO(Task 2)`는 Task 2 Step 7에서 제거하도록 명시된 의도적 임시값. 콘텐츠 "버스 노선 정보 준비 중"은 교회가 채우는 상수값(스펙 비포함 항목).
- 커밋 메시지 `#<이슈번호>`는 Global Constraints에 치환 규칙 명시(실제 GH 번호 미상이라 의도적).

**3. Type consistency**
- `LocationContact`/`LocationDirections` named export ↔ page.tsx import 일치
- `LOCATION.map.{src,alt}`·`LOCATION.directions[].{key,title,lines}`·`LOCATION.directionsHeading`·`LOCATION.lead` 정의(Task 1) ↔ 소비(Task 2) 시그니처 일치
- `DIRECTION_ICONS: Record<string, LucideIcon>` 키 `"car"|"transit"` ↔ `directions[].key` 일치
- church 모킹(embed 테스트)이 `LocationContact`의 import 5종(`CHURCH_ADDRESS,CHURCH_PHONE,CHURCH_EMAIL,MAP_EMBED_SRC,mapSearchUrl`) 모두 제공
