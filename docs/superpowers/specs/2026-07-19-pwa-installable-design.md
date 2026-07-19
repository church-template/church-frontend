# PWA 홈 화면 설치 (Installable PWA) 설계

- 날짜: 2026-07-19
- 상태: 설계 확정 (브레인스토밍 완료)
- 범위: **홈 화면 설치만** — manifest + 아이콘. 서비스워커·오프라인·푸시·설치 안내 UI 제외.

## 목표

교회 홈페이지를 브라우저에서 홈 화면에 설치할 수 있는 앱으로 만든다.
Android·데스크톱 Chrome은 브라우저 자동 설치 프롬프트, iOS는 공유 → "홈 화면에 추가"로
standalone 앱처럼 실행된다. 코드 추가는 최소(manifest 1파일 + 아이콘 에셋), 신규 의존성 0개.

## 검토한 접근

| 접근 | 판정 | 이유 |
|---|---|---|
| **A. Next 내장 파일 컨벤션** (`src/app/manifest.ts`) | **채택** | 라이브러리 0개, Next 16.2.9 공식 지원(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`). link 태그 자동 주입 |
| B. Serwist / next-pwa | 탈락 | 허용 스택 밖 신규 의존성 + webpack 설정 요구(Turbopack 마찰). 오프라인이 범위 밖이라 필요 없음 |
| C. `public/manifest.json` 수동 + link 태그 배선 | 탈락 | 내장 컨벤션이 있는데 수동 배선할 이유 없음 |

## 설계

### 1. `src/app/manifest.ts` (신규)

Next 파일 컨벤션. `MetadataRoute.Manifest`를 반환하는 default export 함수.
정적 함수라 기본 캐시된다(Request-time API 미사용).

| 필드 | 값 | 출처 |
|---|---|---|
| `name` | `CHURCH_NAME` | `src/constants/church.ts` (콘텐츠 하드코딩 금지 + 템플릿 재사용성) |
| `short_name` | `CHURCH_NAME` | 교회명이 짧아(4자) 동일 값 사용 |
| `description` | `CHURCH_DESCRIPTION` | `src/constants/church.ts` |
| `start_url` | `"/"` | |
| `display` | `"standalone"` | 앱처럼 실행 (브라우저 크롬 제거) |
| `lang` | `"ko"` | |
| `background_color` | `"#ffffff"` | canvas 토큰 값. manifest는 CSS 변수를 못 읽으므로 하드코딩하되 주석으로 출처(DESIGN.md canvas) 명시 |
| `theme_color` | `"#ffffff"` | 위와 동일 — 사이트가 흰 캔버스 기조라 상태바도 흰색 |
| `icons` | 아래 3개 | |

icons 배열:

```
{ src: "/icon-192.png",          sizes: "192x192", type: "image/png" }
{ src: "/icon-512.png",          sizes: "512x512", type: "image/png" }
{ src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
```

`layout.tsx` 수정 없음 — Next가 `<link rel="manifest">`를 자동 주입한다.

### 2. 아이콘 에셋 (신규 4개)

소스: 기존 `public/onlyLogo.png` (512×512, 투명 배경, 알파 있음).

| 파일 | 크기 | 처리 |
|---|---|---|
| `public/icon-192.png` | 192² | 리사이즈만 (투명 배경 유지 — `purpose: any`) |
| `public/icon-512.png` | 512² | 원본 복사 수준 |
| `public/icon-maskable-512.png` | 512² | **흰 배경 평탄화 + 로고를 안전영역(~66%, 약 340px)으로 축소 후 중앙 패딩.** Android 원형/스쿼클 마스크에서 로고가 잘리지 않게 |
| `src/app/apple-icon.png` | 180² | **흰 배경 평탄화** 후 리사이즈. iOS는 투명 배경을 검정으로 채우므로 평탄화 필수. 파일 컨벤션이라 `apple-touch-icon` link 자동 |

생성 도구: macOS `sips`(리사이즈·패딩) 우선, 평탄화가 sips로 안 되면 ImageMagick 또는 수동 1회 생성.
생성 스크립트는 저장소에 남기지 않는다(1회성 에셋 생성 — 아이콘 교체는 교회별 커스터마이징 시 수동).

### 3. 테스트·검증

- `src/app/manifest.test.ts` 1개 — 기존 상수 테스트 관례(vitest, globals 명시 import)대로:
  - `name`·`description`이 church.ts 상수와 일치
  - `display === "standalone"`, `start_url === "/"`
  - icons 3개 경로·maskable purpose 존재
- 검증 게이트:
  1. `pnpm test`·`pnpm lint`·`npx tsc --noEmit` 통과
  2. `pnpm build` 통과 후 `/manifest.webmanifest` 라우트가 기대 JSON 응답
  3. Chrome DevTools → Application → Manifest에서 설치 가능 판정(오류 0)
  4. 아이콘 파일이 public에 실재하고 크기가 스펙과 일치 (`sips -g pixelWidth`)

## 범위 제외 (나중에 독립적으로 얹는다)

- **오프라인 지원** — Serwist 등 서비스워커 도입 시점에 별도 설계
- **푸시 알림** — VAPID + 백엔드 구독 저장/발송 API 필요 (백엔드 협의 선행)
- **설치 안내 UI** — iOS 사용자 대상 안내 배너. 필요해지면 클라이언트 컴포넌트 1개로 추가 가능

## 전제·제약

- HTTPS는 Vercel 배포로 이미 충족
- 기존 `src/app/favicon.ico`·`metadata.applicationName`은 그대로 둔다 (충돌 없음)
- 교회 템플릿 재사용: 다른 교회 적용 시 교체 지점은 `onlyLogo.png`에서 파생된 아이콘 4개 + church.ts 상수뿐
