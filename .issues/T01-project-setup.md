# [T1] 프로젝트 셋업

**라벨:** `setup`
**선행:** —
**참조:** 가이드 15.1(확정 스택)·0.2~0.3(baseURL·env), `AGENTS.md`

---

## 목적

Next.js App Router + TypeScript 기반 프로젝트 골격을 만들고, 전 작업이 공유할 개발 규약(경로 alias·패칭 경계·env·스타일 파이프라인)을 확립한다. 모든 후속 태스크의 선행.

---

## ⚠️ 시작 전 필수 (AGENTS.md)

이 Next.js는 **breaking change 버전**이다 — API·관례·파일 구조가 학습 데이터와 다를 수 있다.
**코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 읽고** deprecation 공지를 준수한다. create-next-app/설정 형태는 이 문서를 확인한 뒤 결정한다(낡은 기억으로 작성 금지).

---

## 1. 확정 스택 (15.1 — 임의 추가 금지)

| 영역           | 선택                                              |
| -------------- | ------------------------------------------------- |
| 프레임워크     | Next.js (App Router) + TypeScript                 |
| 패키지 매니저  | **pnpm**                                          |
| 스타일         | Tailwind CSS (토큰 연결은 T2)                     |
| 빌드           | Turbopack                                         |
| 서버상태(클라) | TanStack Query (회원·어드민 전용, T5/T6에서 도입) |
| 클라 상태      | Zustand (T5)                                      |
| 폼             | react-hook-form + zod (T14)                       |
| 마크다운       | marked + DOMPurify (T6)                           |
| 날짜           | date-fns (T6/T12)                                 |

> 이 태스크에서는 **프로젝트 골격 + Tailwind 연결까지만**. 라이브러리 실제 사용은 각 태스크에서.

## 2. 완료 조건

- [ ] pnpm + TypeScript + App Router 프로젝트 생성 (`node_modules/next/dist/docs/` 확인 후)
- [ ] ESLint 설정 (Next 권장 + 프로젝트 규칙)
- [ ] `src/` 디렉터리 구조 + `@/*` 경로 alias (`tsconfig.json` paths)
- [ ] Turbopack 개발 서버(`pnpm dev`) 동작
- [ ] Tailwind CSS 설치·연결 (토큰 매핑은 T2)
- [ ] `.env.example`(API_BASE만) + 교회 상수 모듈 `src/constants/church.ts` (아래 §3)
- [ ] 데이터 패칭 경계 규약을 README/주석에 명시 (아래 §4)
- [ ] `pnpm build` 통과

## 3. 환경변수(`.env.example`) + 교회 상수

### 3.1 env — 환경마다 바뀌는 값만 (사실상 API_BASE 하나)

```env
# 백엔드 API (백엔드 답변 G: 로컬 8080, context-path 없음 = 루트 /)
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

- 토큰 만료값은 env에 두지 않음 — 401 감지로 대응(T5, 0.3).
- CORS: 로컬 `http://localhost:3000`은 서버 기본 허용(백엔드 G). 배포 도메인은 서버 운영 `.env` 담당.

### 3.2 교회 상수 — 매직스트링 방지용 (env 아님)

교회명·도메인·히어로는 "환경"이 아니라 "교회"마다 다를 뿐 → **env 불필요. 그냥 상수 모듈**로 모아 컴포넌트가 import한다(문자열 인라인 금지 = 12장 "하드코딩 금지" 충족).

```ts
// src/constants/church.ts
import type { HeroMedia } from "@/hero/types";

export const CHURCH_NAME = "○○교회";
export const CHURCH_DOMAIN = "example.org";
export const HERO: HeroMedia = {
  type: "video",
  src: "/hero.mp4",
  poster: "/hero-poster.jpeg",
};
export const HERO_CAPTION = ["말씀과 삶이 만나는 곳", "우리 동네의 교회"]; // 배열 → \n 이스케이프 불필요
```

- 히어로 미디어는 정적 에셋(a안, 백엔드 E). 나중에 예배시간·오시는길 등 정적 콘텐츠(T7)도 같은 방식의 상수로.

## 4. 데이터 패칭 경계 규약 (15.1 — README에 명시)

- **공개 페이지**(메인·설교·공지·일정·부서·주보): **서버 컴포넌트 `fetch` + ISR**. TanStack Query 미사용.
- **회원·어드민 영역**(갤러리·내 정보): **클라이언트 + TanStack Query + `authFetch`**(T5).
- 클라 상태(토큰·member)는 Zustand, 폼은 RHF. 서버 데이터를 Zustand에 복제하지 않는다.

## 5. 권장 디렉터리 (참고, 강제 아님)

```
src/
  app/                # App Router 라우트
  components/         # ui(시각 T3)·동작(T4)·공통(T6)
  lib/                # authFetch, parseServerDate, api 클라이언트
  stores/             # zustand
  constants/          # church.ts 등 교회 상수 (매직스트링 방지)
  hero/               # CrossHero/DeptHero + types.ts (T8/T9 공유)
```

## 6. 검수

- [ ] `pnpm dev`/`pnpm build` 통과, `@/*` import 동작.
- [ ] `node_modules/next/dist/docs/` 확인 흔적(커밋 메시지 또는 PR 설명에 근거).
- [ ] README에 패칭 경계 규약이 적혀 있다.
