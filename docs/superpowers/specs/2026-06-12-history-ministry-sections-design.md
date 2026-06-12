# HistoryBand + MinistryCards 설계 스펙 — 메인 연혁·사역 섹션

> 2026-06-12 브레인스토밍 확정본. 참조: spot.wooribank.com/pot/Dream — Playwright로 직접 관찰
> (연혁 카드 시퀀스 + 3색 카드 3-up을 사용자가 지목). MediaCollage에 이은 메인 연출 확장.

## 1. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| H1 | 배치 = **콜라주 직후** | 히어로 → 콜라주 → **연혁 → 사역** → 예배시간 → … 우리은행과 동일한 서사(비주얼→뿌리→지금 하는 일). 가이드 13.4 권장 순서의 확장으로 기록 |
| H2 | **색 토큰 재해석** | 참조의 브랜드 3색(파랑/네이비/청록) 직역은 DESIGN.md 위반("Primary는 CTA·로고·링크에만"·"두 번째 브랜드 컬러 금지") → 기존 토큰 교차로 재해석: `surface-dark`(on-dark 텍스트)·`primary-soft`·`surface-soft`. hex 추가 없음 |
| H3 | 등장 = **IO 1회 reveal** (스크럽 아님) | 참조 사이트도 entrance 방식. 공용 `Reveal`(client) 컴포넌트로 fade+slide-up, 카드별 스태거(delay). reduced-motion이면 IO 미등록 + CSS로 즉시 표시 |
| H4 | 콘텐츠 = 기존 상수 확장 | 연혁: `HISTORY.items`에 `desc?` 필드 추가. 사역: `VISION.points` 3개를 `MINISTRIES`(title·desc·lucide 아이콘명)로 승격. 하드코딩 금지(12장) 준수 |
| H5 | 아이콘 = lucide-react | 사역 카드당 1개(BookOpen·GraduationCap·HeartHandshake), `currentColor`·size 32 — 가이드 15.1 유일 허용 아이콘 세트 |

## 2. 파일 구조

```
신규
├─ src/components/main/Reveal.tsx          # (client) IO 1회 fade+slide-up 공용 래퍼
├─ src/components/main/Reveal.module.css   # 초기 상태·transition·reduced-motion 폴백
├─ src/components/main/HistoryBand.tsx     # (server) 연혁 카드 시퀀스
├─ src/components/main/MinistryCards.tsx   # (server) 사역 카드 3-up
└─ (각 테스트 파일)

변경
├─ src/constants/content.ts    # HISTORY.items desc 추가, MINISTRY{title}·MINISTRIES[] 추가
├─ src/app/page.tsx            # 콜라주 직후 <HistoryBand /> <MinistryCards /> 삽입
├─ src/app/page.test.tsx       # 두 섹션 존재 단언
└─ .claude/rules/DESIGN.md     # components 연출 절에 history-band·ministry-cards 추가
```

## 3. 컴포넌트 명세

### Reveal (공용)
- props: `children`, `delay?: number`(ms, 스태거), `className?`
- IO(threshold 0.2) 1회 — 교차 시 표시 클래스 + unobserve. 언마운트 시 disconnect
- 초기: `opacity 0 / translate 0 24px`, 표시: 원위치, `transition 0.6s ease` + `transition-delay: var(--reveal-delay)`(inline CSS 변수로 주입)
- reduced-motion: effect 미등록(matchMedia 1회 체크) + CSS에서 초기 상태 무효화(즉시 표시)
- 메모리 주의: Tailwind v4에서 `translate`는 속성 — CSS Module에서 `translate` 속성 직접 사용(키프레임·transform 충돌 없음)

### HistoryBand
- `<section aria-label={HISTORY.title}>`(헤딩 없음 — 연출 섹션, 카드가 곧 콘텐츠) + Container + `py-section`
- `HISTORY.items` → 풀폭 라운드 밴드 카드(rounded-xl, p-xl 이상) 세로 나열(gap), 배경 교차:
  `[surface-dark, primary-soft, surface-soft]` 순환. 텍스트 토큰은 배경별(on-dark/ink·body)
- 카드 구성: `<Badge>{year}</Badge>` + 헤드라인(text, `typo.displaySm`) + 설명(desc, `typo.bodyMd`)
- 카드마다 `Reveal delay={i*120}`

### MinistryCards
- `<section>` + Container + `py-section`, 헤딩 `MINISTRY.title`(typo.displayLg — 데이터 섹션과 동일 패턴)
- `MINISTRIES` 3개 → 그리드 `sm:grid-cols-3`(모바일 1-up), 카드: rounded-xl·p-xl·배경 교차
  `[primary-soft, surface-soft, surface-dark]`(연혁과 시작점을 달리해 인접 중복 회피)
- 카드 구성: lucide 아이콘(32, currentColor) + 제목(`typo.titleLg`) + 설명(`typo.bodyMd`)
- 아이콘 매핑은 컴포넌트 내 `{ [key]: LucideIcon }` 객체 — 상수에는 문자열 키만(직렬화 가능)
- 카드마다 `Reveal delay={i*120}`

## 4. 테스트

| 대상 | 검증 |
|---|---|
| Reveal | IO 등록·교차 시 표시 클래스·unobserve / reduced-motion 미등록 / 언마운트 disconnect / delay CSS 변수 주입 |
| HistoryBand | HISTORY.items 매핑(연도·헤드라인·설명) · 카드 수 |
| MinistryCards | MINISTRIES 매핑(제목·설명) · 아이콘 렌더 · 카드 수 |
| page.test | 두 섹션 콘텐츠 존재 + 순서(콜라주 뒤) |

## 5. 범위 밖
실사진/일러스트(에셋 없음 — 타이포+아이콘 카드로 충분), 연혁 상세 페이지(/about/history) 개편,
우리은행의 "지금 우리는" 포토 밴드(사용자 미선택).
