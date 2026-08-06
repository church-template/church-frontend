# 네이버·구글 SEO 구현 계획 (#117)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네이버·구글 검색 노출(브랜드·지역·콘텐츠)을 위한 기술 SEO 완성 — 소유확인·metadata/canonical·sitemap 확장·JSON-LD·RSS + 운영 가이드.

**Architecture:** 기존 SEO 기반(robots/sitemap/루트 metadata/ChurchJsonLd) 위에 증분 확장. 순수 함수(`src/lib/seo.ts`·`src/lib/rss.ts`)는 라우트와 분리해 단위 테스트하고, 백엔드 fetch가 필요한 곳(sitemap·RSS)은 실패 시 폴백(CI는 백엔드 없이 빌드됨). 상세 페이지 metadata는 페이지 RSC의 fetch를 `react` `cache()`로 공유해 추가 요청 0.

**Tech Stack:** Next.js App Router(Metadata API·metadata routes·route handler), vitest, schema.org JSON-LD, RSS 2.0.

**스펙:** `docs/superpowers/specs/2026-08-07-naver-google-seo-design.md`

## Global Constraints

- 답변·주석은 한국어, 주석은 WHY 중심 (CLAUDE.md)
- 커밋 메시지: `<type> : <설명> #117` — Co-Authored-By 금지, push 금지
- 패키지 매니저 **pnpm**. 새 라이브러리 추가 금지 (모두 stdlib/기존 의존성으로 구현)
- **코드 작성 전 `node_modules/next/dist/docs/` 해당 문서 정독** (AGENTS.md — 이 Next는 breaking changes 전제). 핵심: `01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`(sitemap = 캐시되는 Route Handler), `04-functions/generate-metadata.md`
- 콘텐츠 하드코딩 금지 — 교회명·주소 등은 `src/constants/church.ts` 상수 보간
- JSX 조건부 렌더링은 삼항 (`{cond ? <X/> : null}`)
- 테스트 관례: vitest `import { describe, expect, it, vi } from "vitest"` 명시 import, jest-dom 없음
- 검증 명령: `pnpm lint`는 타입체크 안 함 → `npx tsc --noEmit` 별도 실행
- 파일 삭제 금지(사용자 허락 필요), 기존 코드 스타일 유지·최소 diff

---

### Task 1: 마크다운 스트립·요약 헬퍼 (`src/lib/seo.ts`)

**Files:**
- Create: `src/lib/seo.ts`
- Test: `src/lib/seo.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces: `stripMarkdown(md: string | null | undefined): string`, `excerpt(md: string | null | undefined, max?: number): string`, `EXCERPT_MAX = 160` — Task 6·7·10이 사용

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/seo.test.ts
import { describe, expect, it } from "vitest";
import { excerpt, stripMarkdown } from "./seo";

describe("stripMarkdown", () => {
  it("마크다운 문법을 제거하고 평문만 남긴다", () => {
    const md =
      "# 제목\n\n**굵게** [링크](https://a.b)와 ![img](media:42)\n\n- 목록 항목\n\nmedia:7\n\n일반 문장.";
    expect(stripMarkdown(md)).toBe("제목 굵게 링크와 목록 항목 일반 문장.");
  });

  it("코드블록·인용·표·구분선을 제거한다", () => {
    const md = "> 인용\n\n```js\ncode();\n```\n\n| a | b |\n\n---\n\n끝";
    expect(stripMarkdown(md)).toBe("인용 a b 끝");
  });

  it("null·빈 값은 빈 문자열", () => {
    expect(stripMarkdown(null)).toBe("");
    expect(stripMarkdown(undefined)).toBe("");
    expect(stripMarkdown("")).toBe("");
  });
});

describe("excerpt", () => {
  it("최대 길이를 넘으면 말줄임한다", () => {
    const out = excerpt("가".repeat(200));
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
  });

  it("짧은 본문은 그대로 반환한다", () => {
    expect(excerpt("짧은 소개")).toBe("짧은 소개");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/lib/seo.test.ts`
Expected: FAIL — `Cannot find module './seo'`

- [ ] **Step 3: 최소 구현**

```ts
// src/lib/seo.ts
// 검색 메타(description)용 텍스트 헬퍼 — raw 마크다운 본문에서 평문 요약을 뽑는다.
// marked 렌더 후 태그 제거보다 정규식 스트립이 싼 이유: 서버 metadata 경로라 DOM이 없고,
// 요약 품질은 "대충 평문"이면 충분하다(검색 스니펫은 어차피 엔진이 재조립).

export const EXCERPT_MAX = 160;

export function stripMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return (
    md
      .replace(/```[\s\S]*?```/g, " ") // 코드블록
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 이미지(media:{id} 포함, 가이드 5장)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크 → 라벨만
      .replace(/media:\d+/g, " ") // 단독 문단 미디어 토큰
      .replace(/^#{1,6}\s+/gm, "") // 제목
      .replace(/^>\s?/gm, "") // 인용
      .replace(/^(-|\*|\d+\.)\s+/gm, "") // 목록 불릿
      .replace(/^-{3,}\s*$/gm, " ") // 구분선
      .replace(/(\*\*|__|~~|`|\*|_)/g, "") // 강조
      .replace(/\|/g, " ") // 표 구분자
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function excerpt(md: string | null | undefined, max = EXCERPT_MAX): string {
  const text = stripMarkdown(md);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/lib/seo.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "feat : 검색 메타용 마크다운 스트립·요약 헬퍼 추가 #117"
```

---

### Task 2: 검색 수집 경계 정리 — robots·sitemap에서 회원 영역 제외

**Files:**
- Modify: `src/app/robots.ts`
- Modify: `src/app/sitemap.ts` (PUBLIC_PATHS만 — 상세 확장은 Task 9)
- Test: `src/app/robots.test.ts` (신규), `src/app/sitemap.test.ts` (신규, 기본형)

**Interfaces:**
- Consumes: 없음
- Produces: robots disallow 목록·sitemap PUBLIC_PATHS 확정 — Task 9가 sitemap.ts를 이어서 수정

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/app/robots.test.ts
import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("회원 전용 영역을 차단하고 sitemap을 가리킨다", () => {
    const res = robots();
    const rules = Array.isArray(res.rules) ? res.rules[0] : res.rules;
    const disallow = rules?.disallow ?? [];
    for (const path of [
      "/mypage/",
      "/sermons",
      "/gallery",
      "/challenges",
      "/vehicle-runs",
    ]) {
      expect(disallow).toContain(path);
    }
    expect(res.sitemap).toBe("https://eunsaem.com/sitemap.xml");
  });
});
```

```ts
// src/app/sitemap.test.ts — Task 9에서 fetch 목킹 케이스가 추가된다. 지금은 경계만.
import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("회원 전용 경로를 포함하지 않는다", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://eunsaem.com/notices");
    expect(urls).toContain("https://eunsaem.com/bulletins");
    expect(urls.some((u) => u.includes("/sermons"))).toBe(false);
    expect(urls.some((u) => u.includes("/gallery"))).toBe(false);
    expect(urls.some((u) => u.includes("/challenges"))).toBe(false);
  });
});
```

주의: 현재 sitemap()은 동기 함수라 `await`가 no-op이지만, Task 9에서 async가 되므로 미리 await로 쓴다.

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/app/robots.test.ts src/app/sitemap.test.ts`
Expected: FAIL — disallow에 /sermons 등 없음, sitemap urls에 /sermons 존재

- [ ] **Step 3: robots.ts 수정**

disallow 배열을 다음으로 교체한다 (`/sermons`가 `/sermons/new`를 포섭하므로 대체, `/notices/new`류 어드민 진입은 유지·보강):

```ts
      disallow: [
        "/mypage/",
        "/login",
        "/signup",
        "/agreements",
        "/showcase",
        "/notices/new",
        "/events/new",
        "/bulletins/new",
        // 회원 전용 도메인 — 비로그인엔 로그인 안내만 보여 검색 가치가 없다(스펙 1장).
        "/sermons",
        "/gallery",
        "/challenges",
        "/vehicle-runs",
      ],
```

파일 상단 주석(4~5행)도 현행화: "비공개(회원·인증·신규작성·쇼케이스)와 회원 전용 도메인(설교·갤러리·챌린지·차량운행)을 크롤 차단".

- [ ] **Step 4: sitemap.ts PUBLIC_PATHS 수정**

`PUBLIC_PATHS`에서 `"/sermons"`, `"/gallery"`, `"/challenges"` 세 줄 제거. 주석 보강: "설교·갤러리·챌린지는 회원 전용 전환으로 수집 제외(스펙 1장)".

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run src/app/robots.test.ts src/app/sitemap.test.ts`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/app/robots.ts src/app/sitemap.ts src/app/robots.test.ts src/app/sitemap.test.ts
git commit -m "fix : 회원 전용 영역 검색 수집 제외 (robots·sitemap) #117"
```

---

### Task 3: 소유확인 메타태그 (구글·네이버)

**Files:**
- Modify: `src/app/layout.tsx` (metadata에 `verification` 추가)
- Modify: `.env.example` (키 2개 문서화)

**Interfaces:**
- Consumes: env `GOOGLE_SITE_VERIFICATION` · `NAVER_SITE_VERIFICATION` (서버 전용 — NEXT_PUBLIC 불필요, metadata는 서버에서 생성)
- Produces: 없음 (운영 가이드 Task 11이 절차 안내)

- [ ] **Step 1: layout.tsx metadata에 verification 추가**

`export const metadata: Metadata = {` 객체의 `robots: { index: true, follow: true },` 아래에 추가:

```ts
  // 검색엔진 소유확인 — 값은 서치콘솔·서치어드바이저 등록 시 발급(docs/seo-operations.md).
  // env 미설정이면 태그 미출력이라 CI·로컬 빌드에 영향 없다.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NAVER_SITE_VERIFICATION
      ? {
          other: {
            "naver-site-verification": process.env.NAVER_SITE_VERIFICATION,
          },
        }
      : {}),
  },
```

- [ ] **Step 2: .env.example에 키 추가**

기존 항목 형식에 맞춰 끝에 추가:

```bash
# 검색엔진 소유확인 (선택 — docs/seo-operations.md 절차로 발급 후 Vercel env에 설정)
GOOGLE_SITE_VERIFICATION=
NAVER_SITE_VERIFICATION=
```

- [ ] **Step 3: 수동 검증**

Run: `GOOGLE_SITE_VERIFICATION=g123 NAVER_SITE_VERIFICATION=n456 pnpm build 2>&1 | tail -5` — 빌드 성공 확인.
이후 `pnpm dev` 없이 확인하려면 `.next/server/app/index.html`에서 `naver-site-verification` 검색(또는 dev 서버에서 `curl -s localhost:3000 | grep verification`)으로 두 메타태그 출력 확인. env 제거 후 빌드도 성공해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add src/app/layout.tsx .env.example
git commit -m "feat : 구글·네이버 사이트 소유확인 메타태그 자리 추가 #117"
```

---

### Task 4: 공개 페이지 metadata·canonical 일괄 적용

**Files:**
- Modify: `src/app/page.tsx` (홈 — canonical만)
- Modify: `src/app/(site)/about/page.tsx`, `src/app/(site)/about/history/page.tsx`, `src/app/(site)/about/pastor/page.tsx`, `src/app/(site)/about/photos/page.tsx` (기존 metadata에 canonical 추가)
- Modify: `src/app/(site)/about/location/page.tsx`, `src/app/(site)/worship/page.tsx`, `src/app/(site)/notices/page.tsx`, `src/app/(site)/bulletins/page.tsx`, `src/app/(site)/events/page.tsx` (metadata 신규)
- Modify: `src/app/departments/page.tsx` (metadata 신규), `src/app/departments/[slug]/page.tsx` (generateMetadata 신규)

**Interfaces:**
- Consumes: `CHURCH_NAME`·`CHURCH_ADDRESS` (`@/constants/church`), `findDepartment` (`@/constants/departments` — 이미 페이지가 import)
- Produces: 없음

- [ ] **Step 1: 대상 파일이 전부 RSC인지 확인**

Run: `grep -l "use client" src/app/page.tsx "src/app/(site)/about/location/page.tsx" "src/app/(site)/worship/page.tsx" "src/app/(site)/notices/page.tsx" "src/app/(site)/bulletins/page.tsx" "src/app/(site)/events/page.tsx" src/app/departments/page.tsx`
Expected: 출력 없음 (전부 RSC — metadata export 가능). 출력이 있으면 그 파일은 중단하고 보고.

- [ ] **Step 2: 홈 canonical**

`src/app/page.tsx` 상단(기존 import 아래)에 추가. title·description은 루트 default를 쓰므로 canonical만:

```tsx
import type { Metadata } from "next";

// 홈 정본 URL — 루트 layout에 canonical을 두면 전 페이지가 홈을 정본으로 가리키는 버그라 페이지별 선언(layout.tsx 주석 참조).
export const metadata: Metadata = { alternates: { canonical: "/" } };
```

(이미 `Metadata` import가 있으면 재사용.)

- [ ] **Step 3: 기존 metadata 페이지 4곳에 canonical 추가**

about·history·pastor·photos 각 파일의 `export const metadata: Metadata = { ... }` 객체에 키 한 줄 추가 (기존 title·description 유지):

```ts
  alternates: { canonical: "/about" }, // 파일별로 "/about/history"·"/about/pastor"·"/about/photos"
```

- [ ] **Step 4: metadata 없는 페이지 6곳 신규 작성**

각 파일 상단에 추가 (`import type { Metadata } from "next";`와 `CHURCH_NAME` 등 필요한 상수 import 포함). title은 각 페이지 h1 표기와 일치시킨다 — 아래 값과 h1이 다르면 h1을 따른다:

```tsx
// src/app/(site)/about/location/page.tsx
export const metadata: Metadata = {
  title: "오시는 길",
  description: `${CHURCH_NAME} 오시는 길 안내 — ${CHURCH_ADDRESS}. 주소·연락처와 문의 방법을 안내합니다.`,
  alternates: { canonical: "/about/location" },
};

// src/app/(site)/worship/page.tsx
export const metadata: Metadata = {
  title: "예배 안내",
  description: `${CHURCH_NAME} 예배 시간과 장소를 안내합니다.`,
  alternates: { canonical: "/worship" },
};

// src/app/(site)/notices/page.tsx
export const metadata: Metadata = {
  title: "공지",
  description: `${CHURCH_NAME} 공지사항 — 교회 소식과 안내를 확인하세요.`,
  alternates: { canonical: "/notices" },
};

// src/app/(site)/bulletins/page.tsx
export const metadata: Metadata = {
  title: "주보",
  description: `${CHURCH_NAME} 주보를 확인하고 내려받을 수 있습니다.`,
  alternates: { canonical: "/bulletins" },
};

// src/app/(site)/events/page.tsx
export const metadata: Metadata = {
  title: "일정",
  description: `${CHURCH_NAME} 행사와 일정을 안내합니다.`,
  alternates: { canonical: "/events" },
};

// src/app/departments/page.tsx
export const metadata: Metadata = {
  title: "사역",
  description: `${CHURCH_NAME}의 사역과 부서를 소개합니다.`,
  alternates: { canonical: "/departments" },
};
```

- [ ] **Step 5: 부서 상세 generateMetadata**

`src/app/departments/[slug]/page.tsx` — `generateStaticParams` 아래에 추가 (`findDepartment`는 이미 import됨):

```tsx
// 부서별 검색 메타 — 상수(DEPARTMENTS) 구동이라 fetch 없음. 없는 slug는 페이지가 notFound 처리.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dept = findDepartment(slug);
  if (!dept) return {};
  return {
    title: dept.name,
    description: dept.caption.join(" "),
    alternates: { canonical: `/departments/${slug}` },
  };
}
```

`import type { Metadata } from "next";` 추가 필요.

- [ ] **Step 6: 검증**

Run: `npx tsc --noEmit && pnpm lint`
Expected: 에러 없음. 이어서 `pnpm vitest run src/app` — 기존 페이지 테스트 회귀 없음 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/app/page.tsx "src/app/(site)/about" "src/app/(site)/worship/page.tsx" "src/app/(site)/notices/page.tsx" "src/app/(site)/bulletins/page.tsx" "src/app/(site)/events/page.tsx" src/app/departments
git commit -m "feat : 공개 페이지 metadata·canonical 일괄 적용 #117"
```

---

### Task 5: 회원 전용 페이지 noindex

**Files:**
- Modify: `src/app/(site)/sermons/page.tsx`, `src/app/(site)/sermons/[id]/page.tsx`, `src/app/(site)/gallery/page.tsx`, `src/app/(site)/gallery/albums/[id]/page.tsx`, `src/app/(site)/challenges/page.tsx`, `src/app/(site)/challenges/[id]/page.tsx`, `src/app/(site)/vehicle-runs/page.tsx`, `src/app/(site)/mypage/page.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 각 파일 metadata에 robots 키 추가**

기존 `export const metadata: Metadata = { title: "..." }`가 있는 파일은 객체에 키 추가, 없는 파일(`challenges/[id]`)은 신규 작성:

```ts
  // 회원 전용 — robots.txt 차단과 별개로 외부 링크 유입 색인도 막는다(이중 방어, 스펙 1장).
  robots: { index: false, follow: false },
```

```tsx
// src/app/(site)/challenges/[id]/page.tsx (metadata 없음 — 신규)
export const metadata: Metadata = {
  title: "성경통독",
  robots: { index: false, follow: false },
};
```

`challenges/[id]/page.tsx`가 RSC인지 먼저 확인(`grep "use client"`). 클라 컴포넌트면 해당 파일만 건너뛰고 보고.

- [ ] **Step 2: 검증**

Run: `npx tsc --noEmit && pnpm vitest run src/app`
Expected: PASS (기존 페이지 테스트 회귀 없음)

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(site)/sermons" "src/app/(site)/gallery" "src/app/(site)/challenges" "src/app/(site)/vehicle-runs/page.tsx" "src/app/(site)/mypage/page.tsx"
git commit -m "feat : 회원 전용 페이지 noindex 적용 #117"
```

---

### Task 6: 공지 상세 — generateMetadata + Article JSON-LD

**Files:**
- Create: `src/components/seo/ArticleJsonLd.tsx`
- Modify: `src/app/(site)/notices/[id]/page.tsx`

**Interfaces:**
- Consumes: `excerpt` (Task 1), `getNotice` (`@/lib/api/notices`), `NoticeDetailResponse` (`@/lib/api/types`), `parseServerDate` (`@/lib/date`)
- Produces: `ArticleJsonLd({ notice }: { notice: NoticeDetailResponse })`

- [ ] **Step 1: ArticleJsonLd 작성**

```tsx
// src/components/seo/ArticleJsonLd.tsx
import { CHURCH_NAME_FULL, CHURCH_URL } from "@/constants/church";
import { parseServerDate } from "@/lib/date";
import { excerpt } from "@/lib/seo";
import type { NoticeDetailResponse } from "@/lib/api/types";

// 공지 상세 구조화데이터(schema.org Article) — ChurchJsonLd 패턴. 데이터는 페이지 RSC가
// 이미 가진 응답을 주입해 추가 fetch가 없다. 제목·본문은 어드민 입력이라 </script> 이탈을
// 막기 위해 "<"를 유니코드 이스케이프한다(상수만 넣는 ChurchJsonLd와 다른 점).
export function ArticleJsonLd({ notice }: { notice: NoticeDetailResponse }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: notice.title,
    description: excerpt(notice.content),
    datePublished: parseServerDate(notice.createdAt).toISOString(),
    dateModified: parseServerDate(notice.updatedAt).toISOString(),
    mainEntityOfPage: `${CHURCH_URL}/notices/${notice.id}`,
    author: { "@type": "Organization", name: CHURCH_NAME_FULL },
    publisher: { "@type": "Organization", name: CHURCH_NAME_FULL },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
```

- [ ] **Step 2: notices/[id]/page.tsx에 generateMetadata·JSON-LD 연결**

getNotice는 no-store(조회수 +1 부수효과)라 generateMetadata와 페이지가 각각 부르면 조회수가 2씩 오른다 — `react`의 `cache()`로 요청당 1회를 보장한다:

```tsx
// import 추가
import { cache } from "react";
import type { Metadata } from "next";
import { CHURCH_DESCRIPTION } from "@/constants/church";
import { excerpt } from "@/lib/seo";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";

// getNotice는 no-store(조회수 부수효과) — generateMetadata·페이지가 같은 요청에서 두 번
// 부르지 않도록 요청 단위로 캐시한다(조회수 이중 증가 방지).
const getNoticeCached = cache(getNotice);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return {};
  const notice = await getNoticeCached(numId);
  if (!notice) return {};
  const description = excerpt(notice.content) || CHURCH_DESCRIPTION;
  return {
    title: notice.title,
    description,
    alternates: { canonical: `/notices/${notice.id}` },
    openGraph: {
      type: "article",
      title: notice.title,
      description,
      url: `/notices/${notice.id}`,
    },
  };
}
```

본문 함수의 `const notice = await getNotice(numId);`를 `await getNoticeCached(numId)`로 교체하고, `<Container ...>` 첫 자식으로 `<ArticleJsonLd notice={notice} />` 추가.

- [ ] **Step 3: generateMetadata 테스트 작성 (스펙 9장)**

`src/app/(site)/notices/[id]/page.test.tsx`가 이미 있으면 케이스만 추가, 없으면 신규. 무거운 자식 컴포넌트는 관례대로 mock(엘리먼트 반환):

```tsx
// src/app/(site)/notices/[id]/page.test.tsx
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/notices", () => ({ getNotice: vi.fn() }));
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: () => null,
}));
vi.mock("@/components/notices/NoticeAdminActions", () => ({
  NoticeDetailActions: () => null,
}));
vi.mock("@/components/seo/ArticleJsonLd", () => ({
  ArticleJsonLd: () => null,
}));

import { generateMetadata } from "./page";
import { getNotice } from "@/lib/api/notices";

describe("공지 상세 generateMetadata", () => {
  it("제목·요약·canonical을 산출한다", async () => {
    vi.mocked(getNotice).mockResolvedValue({
      id: 7,
      title: "가을 행사 안내",
      content: "# 인사\n\n본문 **강조** 문장.",
      isPinned: false,
      viewCount: 3,
      createdAt: "2026-08-01T10:00:00",
      updatedAt: "2026-08-02T10:00:00",
      version: 1,
      tags: [],
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ id: "7" }),
    });
    expect(meta.title).toBe("가을 행사 안내");
    expect(meta.description).toBe("인사 본문 강조 문장.");
    expect(meta.alternates?.canonical).toBe("/notices/7");
  });

  it("잘못된 id·없는 글은 빈 metadata를 반환한다", async () => {
    vi.mocked(getNotice).mockResolvedValue(null);
    expect(
      await generateMetadata({ params: Promise.resolve({ id: "abc" }) }),
    ).toEqual({});
    expect(
      await generateMetadata({ params: Promise.resolve({ id: "99" }) }),
    ).toEqual({});
  });
});
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit && pnpm lint && pnpm vitest run "src/app/(site)/notices"`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/seo/ArticleJsonLd.tsx "src/app/(site)/notices/[id]"
git commit -m "feat : 공지 상세 검색 메타·Article 구조화데이터 적용 #117"
```

---

### Task 7: 행사 상세 — generateMetadata + Event JSON-LD

**Files:**
- Create: `src/components/seo/EventJsonLd.tsx`
- Modify: `src/app/(site)/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `excerpt` (Task 1), `getEvent` (`@/lib/api/events`), `EventDetailResponse` (`@/lib/api/types`), `parseServerDate` (`@/lib/date`)
- Produces: `EventJsonLd({ event }: { event: EventDetailResponse })`

- [ ] **Step 1: EventJsonLd 작성**

```tsx
// src/components/seo/EventJsonLd.tsx
import {
  CHURCH_ADDRESS,
  CHURCH_NAME_FULL,
  CHURCH_URL,
} from "@/constants/church";
import { parseServerDate } from "@/lib/date";
import { excerpt } from "@/lib/seo";
import type { EventDetailResponse } from "@/lib/api/types";

// 행사 상세 구조화데이터(schema.org Event) — ArticleJsonLd와 같은 패턴·이스케이프.
// location은 자유 텍스트 필드가 있으면 그 이름을, 없으면 교회를 장소로 둔다(주소는 교회 주소 —
// 외부 장소의 정확한 주소는 데이터에 없어 대표 주소로 갈음).
export function EventJsonLd({ event }: { event: EventDetailResponse }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: parseServerDate(event.startAt).toISOString(),
    ...(event.endAt
      ? { endDate: parseServerDate(event.endAt).toISOString() }
      : {}),
    ...(event.description ? { description: excerpt(event.description) } : {}),
    location: {
      "@type": "Place",
      name: event.location || CHURCH_NAME_FULL,
      address: CHURCH_ADDRESS,
    },
    organizer: {
      "@type": "Organization",
      name: CHURCH_NAME_FULL,
      url: CHURCH_URL,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
```

- [ ] **Step 2: events/[id]/page.tsx에 generateMetadata·JSON-LD 연결**

getEvent는 revalidate 60 캐시라 이중 fetch 부작용은 없지만, 같은 요청 내 중복을 없애기 위해 동일하게 `cache()`를 쓴다:

```tsx
// import 추가
import { cache } from "react";
import type { Metadata } from "next";
import { CHURCH_DESCRIPTION } from "@/constants/church";
import { excerpt } from "@/lib/seo";
import { EventJsonLd } from "@/components/seo/EventJsonLd";

const getEventCached = cache(getEvent);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return {};
  const event = await getEventCached(numId);
  if (!event) return {};
  const description = excerpt(event.description) || CHURCH_DESCRIPTION;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.id}` },
    openGraph: {
      title: event.title,
      description,
      url: `/events/${event.id}`,
    },
  };
}
```

본문의 `getEvent(numId)`를 `getEventCached(numId)`로 교체, `<Container>` 첫 자식으로 `<EventJsonLd event={event} />` 추가.

- [ ] **Step 3: generateMetadata 테스트 작성 (스펙 9장)**

`src/app/(site)/events/[id]/page.test.tsx`가 이미 있으면 케이스만 추가, 없으면 신규:

```tsx
// src/app/(site)/events/[id]/page.test.tsx
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/events", () => ({ getEvent: vi.fn() }));
vi.mock("@/components/events/EventDetailView", () => ({
  EventDetailView: () => null,
}));
vi.mock("@/components/events/EventAdminActions", () => ({
  EventDetailActions: () => null,
}));
vi.mock("@/components/seo/EventJsonLd", () => ({
  EventJsonLd: () => null,
}));

import { generateMetadata } from "./page";
import { getEvent } from "@/lib/api/events";

describe("행사 상세 generateMetadata", () => {
  it("제목·요약·canonical을 산출한다", async () => {
    vi.mocked(getEvent).mockResolvedValue({
      id: 3,
      title: "여름 수련회",
      description: "**은혜로운** 시간.",
      location: "본당",
      startAt: "2026-08-15T11:00:00",
      endAt: null,
      allDay: false,
      createdAt: "2026-08-01T10:00:00",
      updatedAt: "2026-08-01T10:00:00",
      version: 1,
      tags: [],
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ id: "3" }),
    });
    expect(meta.title).toBe("여름 수련회");
    expect(meta.description).toBe("은혜로운 시간.");
    expect(meta.alternates?.canonical).toBe("/events/3");
  });

  it("없는 행사는 빈 metadata를 반환한다", async () => {
    vi.mocked(getEvent).mockResolvedValue(null);
    expect(
      await generateMetadata({ params: Promise.resolve({ id: "99" }) }),
    ).toEqual({});
  });
});
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit && pnpm lint && pnpm vitest run "src/app/(site)/events"`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/seo/EventJsonLd.tsx "src/app/(site)/events/[id]"
git commit -m "feat : 행사 상세 검색 메타·Event 구조화데이터 적용 #117"
```

---

### Task 8: Church JSON-LD 로컬 SEO 보강 (주소 세분화 + 좌표 자리)

**Files:**
- Modify: `src/constants/church.ts`
- Modify: `src/components/seo/ChurchJsonLd.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `CHURCH_ADDRESS_REGION`·`CHURCH_ADDRESS_LOCALITY`·`CHURCH_ADDRESS_STREET`·`CHURCH_GEO` (`@/constants/church`)

- [ ] **Step 1: church.ts 주소 세분화**

기존 `CHURCH_ADDRESS` 선언(57행 부근)을 다음으로 교체 — 문자열 값은 동일하게 유지(소비처 영향 0):

```ts
// 주소 세분화 — JSON-LD PostalAddress(addressRegion·addressLocality) 매핑용(지역 검색 신호).
// CHURCH_ADDRESS는 세 조각의 조합이라 값의 단일 출처가 유지된다.
export const CHURCH_ADDRESS_REGION = "충청남도";
export const CHURCH_ADDRESS_LOCALITY = "예산군";
export const CHURCH_ADDRESS_STREET = "삽교읍 수암산로 260";
export const CHURCH_ADDRESS = `${CHURCH_ADDRESS_REGION} ${CHURCH_ADDRESS_LOCALITY} ${CHURCH_ADDRESS_STREET}`;

// 교회 좌표 — 스마트플레이스·구글 비즈니스 등록 시 확인해 채운다(docs/seo-operations.md 4장).
// null이면 JSON-LD geo를 출력하지 않는다.
export const CHURCH_GEO: { latitude: number; longitude: number } | null = null;
```

- [ ] **Step 2: ChurchJsonLd.tsx 보강**

import에 `CHURCH_ADDRESS_LOCALITY`·`CHURCH_ADDRESS_REGION`·`CHURCH_ADDRESS_STREET`·`CHURCH_GEO` 추가(기존 `CHURCH_ADDRESS` import 제거), `address`를 교체하고 `geo` 조건부 추가:

```ts
    address: {
      "@type": "PostalAddress",
      streetAddress: CHURCH_ADDRESS_STREET,
      addressLocality: CHURCH_ADDRESS_LOCALITY,
      addressRegion: CHURCH_ADDRESS_REGION,
      addressCountry: "KR",
    },
    // 좌표는 확보 시에만 출력(상수 null 가드) — 지역 검색 리치 결과 신호.
    ...(CHURCH_GEO
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: CHURCH_GEO.latitude,
            longitude: CHURCH_GEO.longitude,
          },
        }
      : {}),
```

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit && pnpm lint && pnpm vitest run src`
Expected: 에러 없음 (CHURCH_ADDRESS 값 불변이라 기존 소비처·테스트 영향 없음)

- [ ] **Step 4: 커밋**

```bash
git add src/constants/church.ts src/components/seo/ChurchJsonLd.tsx
git commit -m "feat : Church 구조화데이터 주소 세분화·좌표 자리 추가 #117"
```

---

### Task 9: sitemap 상세 URL 확장 (공지·행사)

**Files:**
- Modify: `src/app/sitemap.ts`
- Test: `src/app/sitemap.test.ts` (Task 2에서 생성 — 케이스 추가)

**Interfaces:**
- Consumes: `getNotices` (`@/lib/api/notices` — `Page<NoticeCardResponse>`, `page.totalPages`), `getEvents` (`@/lib/api/events` — 월 단위 필수 `{year, month}`), `parseServerDate` (`@/lib/date`)
- Produces: async `sitemap()` — Task 2 테스트의 `await` 전제가 여기서 실현됨

- [ ] **Step 0: Next 문서 확인**

Read: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
확인 포인트: sitemap은 캐시되는 Route Handler라는 점, `export const revalidate` 세그먼트 설정 지원 여부. 문서가 다르게 말하면 문서를 따르고 계획과의 차이를 보고.

- [ ] **Step 1: 실패하는 테스트 추가**

`src/app/sitemap.test.ts`를 다음으로 교체 (기존 경계 케이스 유지 + 목킹 케이스 추가):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { getNotices } from "@/lib/api/notices";
import { getEvents } from "@/lib/api/events";

vi.mock("@/lib/api/notices", () => ({ getNotices: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvents: vi.fn() }));

const emptyPage = {
  content: [],
  page: { size: 100, number: 0, totalElements: 0, totalPages: 0 },
};

describe("sitemap", () => {
  beforeEach(() => {
    vi.mocked(getNotices).mockReset();
    vi.mocked(getEvents).mockReset();
  });

  it("백엔드 실패 시 정적 엔트리만 반환한다 (CI 빌드 폴백)", async () => {
    vi.mocked(getNotices).mockRejectedValue(new Error("backend down"));
    vi.mocked(getEvents).mockRejectedValue(new Error("backend down"));
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://eunsaem.com/notices");
    expect(urls).toContain("https://eunsaem.com/bulletins");
    expect(urls.some((u) => u.includes("/sermons"))).toBe(false);
    expect(urls.some((u) => u.includes("/gallery"))).toBe(false);
    expect(urls.some((u) => u.includes("/challenges"))).toBe(false);
  });

  it("공지·행사 상세 URL을 포함하고 월 중복 행사는 1건만 넣는다", async () => {
    vi.mocked(getNotices).mockResolvedValue({
      content: [
        {
          id: 7,
          title: "공지",
          isPinned: false,
          viewCount: 0,
          createdAt: "2026-08-01T10:00:00",
          tags: [],
        },
      ],
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    });
    // 모든 월 조회가 같은 행사를 반환해도(걸친 행사) URL은 1개여야 한다.
    vi.mocked(getEvents).mockResolvedValue({
      content: [
        {
          id: 3,
          title: "행사",
          startAt: "2026-08-15T11:00:00",
          endAt: null,
          allDay: false,
          tags: [],
        },
      ],
      page: { size: 200, number: 0, totalElements: 1, totalPages: 1 },
    });
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://eunsaem.com/notices/7");
    expect(urls.filter((u) => u === "https://eunsaem.com/events/3")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/app/sitemap.test.ts`
Expected: FAIL — 상세 URL 미포함

- [ ] **Step 3: sitemap.ts 구현**

파일 전체를 다음으로 교체:

```ts
import type { MetadataRoute } from "next";
import { CHURCH_URL } from "@/constants/church";
import { DEPARTMENTS, allDepartmentSlugs } from "@/constants/departments";
import { getNotices } from "@/lib/api/notices";
import { getEvents } from "@/lib/api/events";
import { parseServerDate } from "@/lib/date";

// 하루 1회 재생성 — 새 공지·행사가 다음날 sitemap에 반영된다(sitemap = 캐시되는 Route Handler).
export const revalidate = 86400;

// 공개 정적 라우트. 설교·갤러리·챌린지는 회원 전용 전환으로 수집 제외(스펙 1장).
const PUBLIC_PATHS = [
  "",
  "/about",
  "/about/history",
  "/about/location",
  "/about/pastor",
  "/about/photos",
  "/worship",
  "/notices",
  "/bulletins",
  "/events",
  "/departments",
];

// 상세 URL 수집 상한 — 소형 사이트라 실질 도달 불가한 안전 상한(폭주 방지).
const MAX_DETAIL_ENTRIES = 500;
const NOTICE_PAGE_SIZE = 100;
// 행사 API는 월 단위 필수(year·month 쌍) — 과거 12개월 + 향후 3개월 창을 월별 순회한다.
const EVENT_MONTHS_BACK = 12;
const EVENT_MONTHS_AHEAD = 3;

// 공지 상세 — 페이지 순회 수집. 실패하면 빈 배열(CI 등 백엔드 없는 빌드는 정적 엔트리만).
async function noticeEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries: MetadataRoute.Sitemap = [];
    let page = 0;
    let totalPages = 1;
    while (page < totalPages && entries.length < MAX_DETAIL_ENTRIES) {
      const res = await getNotices({ page, size: NOTICE_PAGE_SIZE });
      totalPages = res.page.totalPages;
      for (const n of res.content) {
        if (entries.length >= MAX_DETAIL_ENTRIES) break;
        entries.push({
          url: `${CHURCH_URL}/notices/${n.id}`,
          lastModified: parseServerDate(n.createdAt),
        });
      }
      page += 1;
    }
    return entries;
  } catch {
    return [];
  }
}

// 행사 상세 — 월별 조회라 실패한 달만 건너뛴다(allSettled). 걸친 행사는 id로 중복 제거.
async function eventEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = -EVENT_MONTHS_BACK; i <= EVENT_MONTHS_AHEAD; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  const results = await Promise.allSettled(months.map((m) => getEvents(m)));
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<number>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const e of r.value.content) {
      if (seen.has(e.id) || entries.length >= MAX_DETAIL_ENTRIES) continue;
      seen.add(e.id);
      entries.push({
        url: `${CHURCH_URL}/events/${e.id}`,
        lastModified: parseServerDate(e.startAt),
      });
    }
  }
  return entries;
}

// /sitemap.xml 자동 생성. 부서 상세는 프론트 상수(DEPARTMENTS) 구동이라 백엔드 없이 정적으로 포함한다
// (allDepartmentSlugs는 generateStaticParams와 같은 헬퍼라 sitemap URL이 실제 라우트와 정확히 일치).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = PUBLIC_PATHS.map((path) => ({
    url: `${CHURCH_URL}${path}`,
    lastModified,
  }));
  const deptEntries = allDepartmentSlugs(DEPARTMENTS).map((slug) => ({
    url: `${CHURCH_URL}/departments/${slug}`,
    lastModified,
  }));
  const [notices, events] = await Promise.all([noticeEntries(), eventEntries()]);
  return [...staticEntries, ...deptEntries, ...notices, ...events];
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/app/sitemap.test.ts src/app/robots.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/app/sitemap.ts src/app/sitemap.test.ts
git commit -m "feat : sitemap에 공지·행사 상세 URL 포함 (실패 시 정적 폴백) #117"
```

---

### Task 10: RSS 피드 (`/rss.xml`)

**Files:**
- Create: `src/lib/rss.ts`
- Create: `src/app/rss.xml/route.ts`
- Test: `src/lib/rss.test.ts`

**Interfaces:**
- Consumes: `getNotices`·`getEvents`, `parseServerDate`·`formatDate` (`@/lib/date`), `CHURCH_NAME`·`CHURCH_URL`·`CHURCH_DESCRIPTION`
- Produces: `escapeXml(s: string): string`, `buildRssXml(channel: { title; link; description }, items: RssItem[]): string`, `interface RssItem { title: string; link: string; pubDate: Date; description: string }`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/rss.test.ts
import { describe, expect, it } from "vitest";
import { buildRssXml, escapeXml } from "./rss";

describe("escapeXml", () => {
  it("XML 특수문자 5종을 이스케이프한다", () => {
    expect(escapeXml(`<a & "b" 'c'>`)).toBe(
      "&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;",
    );
  });
});

describe("buildRssXml", () => {
  it("채널·아이템 구조를 만들고 내용을 이스케이프한다", () => {
    const xml = buildRssXml(
      { title: "은샘교회", link: "https://eunsaem.com", description: "설명" },
      [
        {
          title: "공지 <1>",
          link: "https://eunsaem.com/notices/1",
          pubDate: new Date(Date.UTC(2026, 7, 1)),
          description: "본문",
        },
      ],
    );
    expect(xml).toContain(`<rss version="2.0">`);
    expect(xml).toContain("<title>공지 &lt;1&gt;</title>");
    expect(xml).toContain("01 Aug 2026");
    expect(xml).toContain("<guid>https://eunsaem.com/notices/1</guid>");
  });

  it("아이템이 없어도 유효한 채널을 만든다", () => {
    const xml = buildRssXml({ title: "t", link: "l", description: "d" }, []);
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/lib/rss.test.ts`
Expected: FAIL — `Cannot find module './rss'`

- [ ] **Step 3: rss.ts 구현**

```ts
// src/lib/rss.ts
// RSS 2.0 XML 생성 — 네이버 서치어드바이저 제출용(웹문서 수집 보조, 스펙 6장).
// 순수 함수로 두고 route handler와 분리해 테스트한다.

export interface RssItem {
  title: string;
  link: string; // 절대 URL
  pubDate: Date;
  description: string;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRssXml(
  channel: { title: string; link: string; description: string },
  items: RssItem[],
): string {
  const itemXml = items
    .map(
      (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <guid>${escapeXml(i.link)}</guid>
      <pubDate>${i.pubDate.toUTCString()}</pubDate>
      <description>${escapeXml(i.description)}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
${itemXml}
  </channel>
</rss>`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/lib/rss.test.ts`
Expected: PASS

- [ ] **Step 5: route handler 작성**

주의: 공지 요약을 위해 상세(getNotice)를 부르지 않는다 — no-store에 조회수 +1 부수효과가 있어 피드 생성마다 전 글 조회수가 오른다. 카드 필드만 쓴다.

```ts
// src/app/rss.xml/route.ts
// RSS 2.0 피드 — 공지·행사 통합 최신 50건. 네이버 서치어드바이저 제출용(스펙 6장).
// 백엔드 실패 시 해당 도메인만 건너뛰고 빈 채널이라도 반환한다(CI 빌드·장애 폴백).
import {
  CHURCH_DESCRIPTION,
  CHURCH_NAME,
  CHURCH_URL,
} from "@/constants/church";
import { getEvents } from "@/lib/api/events";
import { getNotices } from "@/lib/api/notices";
import { formatDate, parseServerDate } from "@/lib/date";
import { buildRssXml, type RssItem } from "@/lib/rss";

// sitemap과 같은 주기(하루 1회) 재생성.
export const revalidate = 86400;

const RSS_MAX_ITEMS = 50;

export async function GET(): Promise<Response> {
  const items: RssItem[] = [];

  try {
    const notices = await getNotices({ page: 0, size: RSS_MAX_ITEMS });
    for (const n of notices.content) {
      items.push({
        title: n.title,
        link: `${CHURCH_URL}/notices/${n.id}`,
        pubDate: parseServerDate(n.createdAt),
        // 목록 응답에 본문이 없어 제목으로 갈음(상세 조회는 조회수 부수효과라 금지).
        description: n.title,
      });
    }
  } catch {
    // 공지 없이 계속 — 부분 실패 허용(스펙 8장)
  }

  // 행사 API는 월 단위 — 전월·당월·익월 3개 달만 훑는다(피드는 "최근 소식"이면 충분).
  const now = new Date();
  const months = [-1, 0, 1].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const results = await Promise.allSettled(months.map((m) => getEvents(m)));
  const seen = new Set<number>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const e of r.value.content) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      items.push({
        title: e.title,
        link: `${CHURCH_URL}/events/${e.id}`,
        pubDate: parseServerDate(e.startAt),
        description: `일정 ${formatDate(e.startAt)}${e.location ? ` · ${e.location}` : ""}`,
      });
    }
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  const xml = buildRssXml(
    { title: CHURCH_NAME, link: CHURCH_URL, description: CHURCH_DESCRIPTION },
    items.slice(0, RSS_MAX_ITEMS),
  );
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
```

`formatDate(iso: string): string`은 `src/lib/date.ts`의 기존 함수를 그대로 쓴다. route handler 캐싱은 `node_modules/next/dist/docs`의 route handler 문서로 `export const revalidate` 동작을 확인하고, 다르면 문서를 따른다.

- [ ] **Step 6: 검증**

Run: `npx tsc --noEmit && pnpm lint && pnpm vitest run src/lib/rss.test.ts`
Expected: PASS. 백엔드가 로컬에 있으면 `pnpm dev` 후 `curl -s localhost:3000/rss.xml | head -20`으로 XML 확인(없으면 빈 채널 확인).

- [ ] **Step 7: 커밋**

```bash
git add src/lib/rss.ts src/lib/rss.test.ts src/app/rss.xml
git commit -m "feat : RSS 피드 추가 (공지·행사, 네이버 수집 보조) #117"
```

---

### Task 11: SEO 운영 가이드 문서

**Files:**
- Create: `docs/seo-operations.md`

**Interfaces:**
- Consumes: Task 3 env 키 이름, Task 8 `CHURCH_GEO`
- Produces: 없음 (사용자 대상 문서)

- [ ] **Step 1: 문서 작성**

아래 뼈대로 작성한다. 각 절차는 실제 콘솔 화면 기준 단계(번호 목록)로, 코드 없이. 링크는 공식 URL만:

```markdown
# SEO 운영 가이드 (#117)

코드 밖에서 관리자가 직접 해야 하는 검색 등록·운영 절차. 기술 작업(메타·sitemap·RSS)은
코드에 반영되어 있고(스펙: docs/superpowers/specs/2026-08-07-naver-google-seo-design.md),
이 문서는 그 결과물을 검색엔진에 제출·등록하는 순서다.

## 0. 사전 확인
- 배포 도메인이 https://eunsaem.com 인지, /sitemap.xml·/rss.xml·/robots.txt가 응답하는지 확인

## 1. 소유확인 코드 발급·설정 (공통 선행)
- 구글 서치콘솔(https://search.google.com/search-console) → 속성 추가(URL 접두어) → HTML 태그 방식 선택 → content 값 복사
- 네이버 서치어드바이저(https://searchadvisor.naver.com) → 웹마스터 도구 → 사이트 등록 → HTML 태그 방식 → content 값 복사
- Vercel 대시보드 → 프로젝트 → Settings → Environment Variables:
  - GOOGLE_SITE_VERIFICATION = (구글 content 값)
  - NAVER_SITE_VERIFICATION = (네이버 content 값)
- 재배포 후 각 콘솔에서 "소유확인" 버튼 클릭

## 2. 구글 서치콘솔
- Sitemaps 메뉴 → https://eunsaem.com/sitemap.xml 제출
- 색인 생성 보고서에서 수집 현황 확인(반영까지 수일~수주)

## 3. 네이버 서치어드바이저
- 요청 → 사이트맵 제출: https://eunsaem.com/sitemap.xml
- 요청 → RSS 제출: https://eunsaem.com/rss.xml
- 요청 → 웹 페이지 수집: 홈·주요 페이지 URL 수동 수집 요청(초기 1회)
- 검증 → robots.txt 검증으로 차단 오류 없는지 확인

## 4. 지역 검색 (실질 승부처)
- 네이버 스마트플레이스(https://smartplace.naver.com) 신규 등록: 업체명(은샘교회)·주소·전화·홈페이지 URL — "예산 교회"류 지역 검색은 플레이스가 상단을 차지한다
- 구글 비즈니스 프로필(https://business.google.com) 등록: 동일 정보 + 예배 시간을 영업시간으로
- 등록 과정에서 확인한 좌표(위도·경도)를 개발자에게 전달 → src/constants/church.ts의 CHURCH_GEO에 반영(구조화 데이터 geo 출력)

## 5. 확인 체크리스트
- 구글: site:eunsaem.com 검색 → 수집 페이지 확인, 서치콘솔 색인 보고서
- 네이버: site:eunsaem.com + 서치어드바이저 수집 현황
- "은샘교회" 검색 시 공식 사이트 노출 확인 (반영은 수일~수주 소요, 신규 도메인은 더 걸릴 수 있음)
- 새 공지·행사가 다음날 sitemap.xml·rss.xml에 나타나는지 확인 (재생성 주기 1일)
```

- [ ] **Step 2: 커밋**

```bash
git add docs/seo-operations.md
git commit -m "docs : SEO 운영 가이드 작성 (서치콘솔·서치어드바이저·플레이스) #117"
```

---

### Task 12: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트·린트·타입체크**

Run: `pnpm lint && npx tsc --noEmit && pnpm test`
Expected: 전부 PASS. 실패 시 해당 태스크로 돌아가 수정(테스트를 고치지 말고 구현을 고친다 — 테스트가 잘못된 경우만 예외).

- [ ] **Step 2: 프로덕션 빌드 (백엔드 없는 환경 폴백 포함)**

Run: `pnpm build`
Expected: 성공. 빌드 로그에서 sitemap·rss.xml 라우트 생성 확인. 백엔드 미기동 상태에서도 성공해야 한다(폴백 검증 — 실패하면 Task 9·10의 try/catch 누락).

- [ ] **Step 3: 스펙 대조**

`docs/superpowers/specs/2026-08-07-naver-google-seo-design.md`의 1~9장을 훑으며 구현 누락 확인. 누락 발견 시 해당 태스크에 스텝 추가 후 수행.

- [ ] **Step 4: 이슈 문서 커밋 (남아 있으면)**

```bash
git add .issues/20260807_기능개선_네이버_구글_SEO.md docs/superpowers/specs/2026-08-07-naver-google-seo-design.md docs/superpowers/plans/2026-08-07-naver-google-seo.md
git commit -m "docs : SEO 이슈·스펙·계획 문서 등록 #117"
```
