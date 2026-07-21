# PWA 홈 화면 설치 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교회 홈페이지를 홈 화면에 설치 가능한 PWA로 만든다 — manifest 1파일 + 아이콘 에셋 4개, 신규 의존성 0개.

**Architecture:** Next 16.2.9 내장 파일 컨벤션 사용. `src/app/manifest.ts`가 `MetadataRoute.Manifest`를 반환하면 Next가 `<link rel="manifest">`를 자동 주입한다. `src/app/apple-icon.png` 파일 컨벤션이 iOS용 `apple-touch-icon` link를 자동 주입한다. 서비스워커·오프라인·푸시·설치 UI는 범위 밖(스펙 참조).

**Tech Stack:** Next.js 16.2.9 (App Router), TypeScript, vitest. 아이콘 생성은 macOS `sips`(1회성, 저장소에 스크립트 안 남김).

**Spec:** `docs/superpowers/specs/2026-07-19-pwa-installable-design.md`

## Global Constraints

- 신규 의존성 추가 금지 (허용 스택 밖 라이브러리 금지)
- 콘텐츠 하드코딩 금지 — `name`·`description`은 `src/constants/church.ts`의 `CHURCH_NAME`·`CHURCH_DESCRIPTION` 주입
- `background_color`·`theme_color`는 `"#ffffff"` — DESIGN.md canvas 값. manifest는 CSS 변수를 못 읽어 하드코딩하되 주석으로 출처 명시
- 커밋 메시지 형식: `<type> : <설명> #112` (이슈 [#112](https://github.com/church-template/church-frontend/issues/112), Co-Authored-By 금지)
- 주석은 한국어, WHY 중심
- 게이트: `pnpm test`·`pnpm lint`·`npx tsc --noEmit` 전부 통과 (lint는 타입체크를 안 하므로 tsc 별도 실행)
- 워킹트리에 이 작업과 무관한 수정 파일들이 있다 — `git add`는 항상 명시 경로로만 (`git add -A` 금지)

---

### Task 1: GitHub 이슈 생성 + 작업 브랜치 — ✅ 완료 (2026-07-21, /issue-branch로 수행)

**결과 (실행자는 이 태스크를 건너뛴다):**
- 이슈: [#112](https://github.com/church-template/church-frontend/issues/112) — 이슈 파일 `.issues/20260721_기능추가_PWA_홈화면_설치.md`
- 브랜치: `20260721_#112_PWA_홈_화면_설치_지원` (생성·전환 완료)
- 이후 모든 커밋 태그는 `#112`

- [x] **Step 1: 이슈 생성하고 번호 확보** — #112
- [x] **Step 2: 브랜치 생성** — `20260721_#112_PWA_홈_화면_설치_지원`

---

### Task 2: 아이콘 에셋 4개 생성

**Files:**
- Create: `public/icon-192.png` (192², 투명 배경 유지)
- Create: `public/icon-512.png` (512², 원본 복사)
- Create: `public/icon-maskable-512.png` (512², 흰 배경 평탄화 + 로고 340px 중앙 패딩)
- Create: `src/app/apple-icon.png` (180², 흰 배경 평탄화)

**Interfaces:**
- Consumes: `public/onlyLogo.png` (기존 512² 투명 PNG — 수정·삭제 금지)
- Produces: Task 3의 manifest icons 배열이 참조하는 경로 `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`

**배경 지식:**
- maskable 아이콘: Android가 원형/스쿼클로 마스킹하므로 로고를 중앙 ~66%(512 중 340px)에 두고 나머지를 배경색으로 채워야 잘리지 않는다. 투명 픽셀이 남으면 안 된다.
- apple-icon: iOS는 투명 배경을 검정으로 채우므로 흰 배경 평탄화 필수. Next가 `src/app/apple-icon.png`를 자동으로 `apple-touch-icon` link로 배선한다.
- `sips`는 알파 평탄화 옵션이 없어 JPEG 왕복(`png → jpeg → png`)으로 평탄화한다. sips는 JPEG 변환 시 알파를 흰색 위에 합성한다. 아이콘 용도라 왕복 아티팩트는 무시 가능(`-s formatOptions best`).

- [ ] **Step 1: 단순 리사이즈 2개 생성**

```bash
sips -z 192 192 public/onlyLogo.png --out public/icon-192.png
cp public/onlyLogo.png public/icon-512.png
```

- [ ] **Step 2: maskable 아이콘 생성 (축소 → 흰 패딩 → 평탄화)**

```bash
TMP=$(mktemp -d)
sips -z 340 340 public/onlyLogo.png --out "$TMP/mask-340.png"
sips --padToHeightWidth 512 512 --padColor FFFFFF "$TMP/mask-340.png" --out "$TMP/mask-512.png"
sips -s format jpeg -s formatOptions best "$TMP/mask-512.png" --out "$TMP/mask-512.jpg"
sips -s format png "$TMP/mask-512.jpg" --out public/icon-maskable-512.png
```

- [ ] **Step 3: apple-icon 생성 (리사이즈 → 평탄화)**

```bash
sips -z 180 180 public/onlyLogo.png --out "$TMP/apple-180.png"
sips -s format jpeg -s formatOptions best "$TMP/apple-180.png" --out "$TMP/apple-180.jpg"
sips -s format png "$TMP/apple-180.jpg" --out src/app/apple-icon.png
rm -rf "$TMP"
```

- [ ] **Step 4: 크기·알파 검증**

```bash
sips -g pixelWidth -g pixelHeight -g hasAlpha \
  public/icon-192.png public/icon-512.png public/icon-maskable-512.png src/app/apple-icon.png
```

Expected:
- `icon-192.png`: 192×192
- `icon-512.png`: 512×512, hasAlpha: yes
- `icon-maskable-512.png`: 512×512, **hasAlpha: no** (평탄화 확인)
- `apple-icon.png`: 180×180, **hasAlpha: no**

만약 maskable/apple의 hasAlpha가 yes로 남거나 배경이 검정이면: JPEG 왕복 단계가 잘못된 것 — Step 2·3을 다시 확인하고, 그래도 안 되면 `magick`(ImageMagick, `brew list imagemagick`으로 존재 확인) `-background white -alpha remove -alpha off`로 대체한다.

- [ ] **Step 5: 시각 검증**

Read 도구로 `public/icon-maskable-512.png`와 `src/app/apple-icon.png`를 열어 눈으로 확인:
흰 배경 위 로고가 중앙에 있고(maskable은 가장자리 여백 뚜렷), 잘리거나 검정 배경이 아니어야 한다.

- [ ] **Step 6: 커밋**

```bash
git add public/icon-192.png public/icon-512.png public/icon-maskable-512.png src/app/apple-icon.png
git commit -m "feat : PWA 아이콘 에셋 4종 생성 (192/512/maskable/apple) #112"
```

---

### Task 3: manifest.ts — TDD

**Files:**
- Test: `src/app/manifest.test.ts`
- Create: `src/app/manifest.ts`

**Interfaces:**
- Consumes: `CHURCH_NAME`, `CHURCH_DESCRIPTION` (`@/constants/church`의 기존 string export), Task 2의 아이콘 경로
- Produces: `manifest(): MetadataRoute.Manifest` default export — Next가 `/manifest.webmanifest` 라우트로 서빙

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/manifest.test.ts` (프로젝트 관례: vitest globals 없음 — 명시 import):

```ts
import { describe, it, expect } from "vitest";
import manifest from "./manifest";
import { CHURCH_NAME, CHURCH_DESCRIPTION } from "@/constants/church";

describe("manifest", () => {
  const m = manifest();

  it("이름·설명은 church.ts 상수 주입", () => {
    expect(m.name).toBe(CHURCH_NAME);
    expect(m.short_name).toBe(CHURCH_NAME);
    expect(m.description).toBe(CHURCH_DESCRIPTION);
  });

  it("standalone 설치 설정", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.lang).toBe("ko");
    expect(m.background_color).toBe("#ffffff");
    expect(m.theme_color).toBe("#ffffff");
  });

  it("아이콘 3개 — any 2개 + maskable 1개", () => {
    expect(m.icons).toEqual([
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/app/manifest.test.ts`
Expected: FAIL — `Cannot find module './manifest'` (또는 동등한 resolve 에러)

- [ ] **Step 3: 구현**

`src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";
import { CHURCH_NAME, CHURCH_DESCRIPTION } from "@/constants/church";

// PWA 홈 화면 설치용 manifest (Next 파일 컨벤션 — <link rel="manifest"> 자동 주입).
// 색상은 DESIGN.md canvas(흰색) 값 — manifest는 CSS 변수를 읽지 못해 여기서만 하드코딩한다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CHURCH_NAME,
    short_name: CHURCH_NAME,
    description: CHURCH_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    lang: "ko",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/app/manifest.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 전체 게이트**

```bash
pnpm test && pnpm lint && npx tsc --noEmit
```

Expected: 전부 통과 (기존 테스트 포함, 에러 0)

- [ ] **Step 6: 커밋**

```bash
git add src/app/manifest.ts src/app/manifest.test.ts
git commit -m "feat : PWA manifest 추가 (홈 화면 설치 지원) #112"
```

---

### Task 4: 통합 검증 (빌드 + 서빙 확인)

**Files:** 없음 (검증만 — 커밋 없음)

**Interfaces:**
- Consumes: Task 2 아이콘 + Task 3 manifest

- [ ] **Step 1: 프로덕션 빌드**

Run: `pnpm build`
Expected: 빌드 성공. 라우트 목록에 `/manifest.webmanifest` 포함.

- [ ] **Step 2: 프로덕션 서버로 실제 응답 확인**

```bash
pnpm start -p 3100 &
sleep 3
curl -s http://localhost:3100/manifest.webmanifest
curl -s http://localhost:3100/ | grep -oE '<link[^>]*(manifest|apple-touch-icon)[^>]*>'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/icon-maskable-512.png
kill %1
```

Expected:
- manifest 응답 JSON에 `"display":"standalone"`, `"name":"은샘교회"`(CHURCH_NAME 값), 아이콘 3개 경로 포함
- 홈 HTML에 `<link rel="manifest" ...>` 와 `<link rel="apple-touch-icon" ...>` 존재
- 아이콘 요청 `200`

- [ ] **Step 3: (수동, 사용자 안내) Chrome DevTools 확인**

실행자는 여기서 사용자에게 안내만 남긴다: 배포(또는 로컬 3100) 페이지에서
DevTools → Application → Manifest에 오류 0, "Add to Home Screen" 설치 가능 판정 확인.
