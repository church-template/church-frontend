# [T7] 앱 셸 (레이아웃 · 네비 · 푸터 · 정적 페이지)

**라벨:** `layout`
**선행:** T3, T4
**참조:** 가이드 12장·13.4·0.3, DESIGN.md(네비 §400~406·밴드·푸터·레이아웃 §370~377)

---

## 목적
전역 레이아웃, 네비게이션(라이트/투명 + 모바일 Sheet), 푸터/CTA 밴드, API에 없는 정적 콘텐츠 페이지를 구성한다. 모든 페이지가 얹히는 셸.

---

## 1. 컨테이너 (DESIGN.md layout)
- 최대 `container-max` **1200px** 가운데 정렬, 좌우 `container-padding` **24px**.
- **사이트 모든 섹션·히어로(14A/14B)가 이 컨테이너 하나를 공유**(14.3) — 별도 폭 만들지 않음.
- 섹션 상하 패딩 `section` 96px(모바일 64px). nav-height 64px.

## 2. 네비게이션
- **`top-nav-light`** (서브페이지 기본): canvas 배경, ink 텍스트, 64px. 로고 좌 / 메뉴(교회소개·예배·설교·소식·교육부서 등).
- **`top-nav-transparent`** (히어로 위 = 메인 T8·부서 T9): `position: fixed; z-index: 10`, 투명 배경.
  - 메인(14A): 어두운 덮개 위 → 흰색 텍스트 또는 `mix-blend-mode: difference`로 가독성.
  - 부서(14B): 풀스크린 전환 후 진행도에 따라 텍스트 on-dark 전환 또는 반투명 블러 배경.
- **모바일(768px 미만)**: `Sheet`(T4) 햄버거 시트로 전환. 핵심 CTA는 유지.

## 3. 푸터 / 밴드
- **`cta-band-dark`** (프리푸터): surface-dark 배경, "처음 오셨나요?" 헤드라인(display-lg) + CTA 2개(primary + outline-on-dark). 상하 96px.
- **푸터**: `footer-light`(canvas, body-sm, 64px 48px) + `legal-band`(muted, caption).

## 4. 정적 콘텐츠 페이지 (12장 — API 없음, 프론트 하드코딩)
거의 안 바뀌는 상수 콘텐츠는 백엔드에 없다 → 프론트 페이지로 구현:
- [ ] 교회 소개 / 연혁 / 비전
- [ ] 오시는 길 (지도·주소)
- [ ] 예배 시간 안내(메인 섹션과 공유 가능한 상수)
> 텍스트·이미지는 교회별이므로 이 태스크에선 플레이스홀더/샘플로 두되, 실제 문구는 배포 시 교체 가능한 구조(상수 파일).

## 5. 라우트 에러 페이지 (404 · 런타임 에러)
존재하지 않는 URL·`notFound()`·런타임 예외가 렌더할 **셸 위 페이지**. 가이드 4.2의 **API 404(`RESOURCE_NOT_FOUND`)는 토스트/목록 복귀**(T06 `handleApiError`)이고, 이건 **라우트 레벨 페이지**다 — 둘을 구분한다.
- [ ] `app/not-found.tsx` — 404. 잘못된 URL + 공개 서버 페이지의 `notFound()`(설교·공지 등 비존재 리소스 상세, T06 스펙 §6) 렌더 대상. "페이지를 찾을 수 없습니다" 헤드라인(`display-md`) + 홈으로(`button-primary`)·이전/목록 복귀. 네비·푸터(셸) 위에 얹힌다.
- [ ] `app/error.tsx` — 런타임 에러 바운더리(`'use client'`, `unstable_retry` prop — Next 16.2.0, 스펙 D3). "문제가 발생했습니다" + 다시 시도(`unstable_retry()`)·홈으로. 민감 정보(스택) 비노출.
- [ ] (선택) `app/global-error.tsx` — 루트 레이아웃까지 깨질 때 최후 바운더리(자체 `<html><body>` 포함).
> AGENTS.md: Next 16의 not-found/error 파일 규약을 `node_modules/next/dist/docs/01-app/`에서 확인 후 작성. DESIGN 토큰·`EmptyState`(T06) 재사용.

## 6. 교회 고유값 상수 (0.3/12장)
- [ ] 이름·도메인·로고·주소·연락처를 **상수 파일(`src/constants/church.ts`)로 주입**. 디자인/코드에 하드코딩(매직스트링) 금지. (env가 아니라 상수 — "교회마다 다른 값"이라서. API base 등 "환경" 값만 env. 스펙 D2)

## 7. 완료 조건
- [ ] `app/layout.tsx` + 공유 컨테이너(1200/24)
- [ ] top-nav-light / top-nav-transparent 2모드
- [ ] 모바일 Sheet 햄버거(768px↓), 핵심 CTA 유지
- [ ] cta-band-dark 프리푸터 + footer-light/legal-band
- [ ] 정적 페이지(소개·연혁·비전·오시는 길) 라우트
- [ ] 라우트 에러 페이지: `app/not-found.tsx`(404, 셸 위 + 복귀 CTA) · `app/error.tsx`(런타임 바운더리, 재시도)
- [ ] 교회 고유값 상수 주입

## 8. 검수
- [ ] 모든 섹션·히어로가 1200/24 컨테이너 하나를 공유한다.
- [ ] 히어로 위 투명 네비가 어두운 배경에서 가독성 유지.
- [ ] 768px 미만에서 햄버거 Sheet 전환 + 핵심 CTA 유지.
- [ ] 교회 이름/로고가 상수(`church.ts`) 주입이며 하드코딩 0.
- [ ] 존재하지 않는 URL 접근 시 기본 Next 404가 아니라 셸(네비·푸터) 위 커스텀 404가 뜨고 홈 복귀가 동작한다.
- [ ] 공개 상세에서 `notFound()` 호출 시 동일한 404 페이지가 렌더된다.
