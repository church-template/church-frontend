# 교회 홈페이지 프론트엔드 — 작업 이슈 인덱스

신뢰 소스 3종: `docs/church-frontend-guide.md`(0~15장) · `docs/api-docs.json`(OpenAPI) · `.claude/rules/DESIGN.md`.
(설계 청사진 `church-backend-spec.md`는 부재 — 위 3종만으로 진행)

**이번 배치 범위:** 공개 + 회원 프론트만. **어드민(/api/admin/\*\*) 제외** — 다음 트랙. 1차 콘텐츠는 백엔드 API/DB 시드로 투입 전제.

## 의존 순서 그래프

```
T1 ─┬─ T2 ─┬─ T3 ─┐
    │       └─ T4 ─┼─ T6 ─┬─ T8  (메인/14A)
    │              │      ├─ T9  (부서/14B)
    │       T3·T4 ─┴─ T7 ─┼─ T10 (설교)
    │                     ├─ T11 (공지)
    │                     ├─ T12 (일정 캘린더)
    │                     └─ T13 (주보)
    └─ T5 ─────────────┬─ T14 (인증 UI)
                       ├─ T15 (마이페이지)
                       └─ T16 (갤러리)  ← T5·T6·T7
```

## 태스크 목록

| # | 태스크 | 라벨 | 선행 | 검수 |
|---|---|---|---|---|
| T1 | 프로젝트 셋업 | setup | — | |
| T2 | 디자인 토큰 + 폰트 (+cover-dark) | design | T1 | |
| T3 | 시각 컴포넌트(Button·Card·Badge·Input) | component | T2 | 15.4 |
| T4 | 동작 컴포넌트(shadcn 7종 재스킨) | component | T2 | 15.4 |
| T5 | 인증 인프라(authFetch·401 refresh·Zustand) | auth | T1 | |
| T6 | 공통 응답/에러/유틸 | core | T3·T4 | |
| T7 | 앱 셸(layout·nav·footer·정적페이지·404/error) | layout | T3·T4 | |
| T8 | 메인 페이지(13장 + 14A CrossHero) | page | T7·T6 | **14A.7** |
| T9 | 부서 소개(14B DeptHero) | page | T7·T6 | **14B.9** |
| T10 | 설교(목록·검색·상세) | page | T6·T7 | |
| T11 | 공지(목록·상세) | page | T6·T7 | |
| T12 | 일정 캘린더(15.3 직접구현) | page | T6·T7 | **15.3** |
| T13 | 주보(목록·PDF) | page | T6·T7 | |
| T14 | 인증 UI(로그인·가입·재동의) | auth | T5·T7 | |
| T15 | 마이페이지(내정보·약관) | page | T5·T7 | |
| T16 | 갤러리(회원전용 게이트) | page·auth-gated | T5·T6·T7 | |

## 전 작업 공통 규칙

- 데이터 패칭 경계(15.1): **공개=서버 컴포넌트 fetch+ISR / 회원·어드민=TanStack Query + `authFetch`**
- 클라 상태=Zustand(토큰·member 스냅샷), 폼=react-hook-form+zod
- hex·px 인라인 금지 → 항상 DESIGN.md 토큰 참조 (예외: CrossHero/DeptHero 검증 로직 내부 SVG 좌표·rgba)
- 콘텐츠·텍스트·미디어 하드코딩 금지 → API/env 주입(12장)
- 허용 라이브러리(15.1) 외 추가 금지

## 백엔드 확정값(이슈 본문 반영됨)

- **A** datetime: offset 없는 LocalDateTime → 파싱 시 `+09:00` 명시(공통 `parseServerDate`)
- **B** 일정 월 조회: `?year&month&size=200`, OVERLAP(걸침 포함), year/month 우선, 반쪽=400
- **C** viewCount: 상세 GET마다 +1(중복방지 없음) → 설교·공지 상세 `no-store`
- **D** 검색 q: 공지=제목만 / 설교=제목·설교자·시리즈·성경구절(본문 아님)
- **E** 미디어 서빙: Range/캐시헤더 없음 → 히어로 영상은 정적 에셋(a안)
- **F** /api/main: Redis TTL 60s + CUD 무효화 → ISR `revalidate:60`
- **G** CORS: localhost:3000 기본 허용, 단일 origin, API base는 env
- **H** 부서: 대표이미지 필드 없음 → 14B 히어로 이미지는 프론트 상수(부서 id 매핑)
