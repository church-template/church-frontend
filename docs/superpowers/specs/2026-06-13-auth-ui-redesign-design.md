# T14 인증 UI 리디자인 (스플릿 레이아웃 · 가입 위저드) 설계

> 2026-06-13 · 선행: T14 기본 구현 완료(브랜치 `20260610_#15_인증_UI_로그인_가입_재동의`, 머지 가능 판정)
> 참조: `docs/superpowers/specs/2026-06-12-auth-ui-design.md`(기본 구현 스펙 — 플로우·검증·에러 규칙은 그대로 유효), `.claude/rules/DESIGN.md`

## 1. 목적·범위

기능 변경 없이 인증 3화면의 **표현 계층만 리디자인**한다.

1. **로그인·재동의**: 풀스크린 스플릿 — 좌측 교회 사진 패널 + 우측 폼 카드 (레퍼런스 스크린샷 기준)
2. **회원가입**: 토스식 풀 위저드 — 한 화면 = 한 질문, 5단계

**불변 조건** (기본 구현 스펙의 규칙이 전부 유지된다):
- zod 검증 규칙·단일 오류 메시지·errors[] 매핑·phone 409·자동 로그인·`?next=`·requiresAgreement 체이닝·me 캐시 무효화
- 기존 컴포넌트 재사용: `Input`·`Button`·`Checkbox`·`Card`·`TermsDialog`·`notify`·`schemas`·`nextParam`·`authApi`·`agreementsApi`
- 중첩 라디우스 법칙: 폼 카드 24(`rounded-xl`) / 입력 12(`rounded-md`) / CTA 16(`rounded-lg`) / 체크박스 4(`rounded-xs`)

**범위 외**: 비밀번호 찾기(백엔드 재설정 API 없음 — 레퍼런스 스크린샷과 의도적으로 다른 점), 마이페이지(T15), 갤러리(T16).

## 2. 확정 결정 (브레인스토밍 합의)

| 결정 | 선택 | 비고 |
|---|---|---|
| 로그인 레이아웃 | **풀스크린 스플릿** (헤더·푸터 없음) | 비주얼 컴패니언 A안. 좌측 로고가 홈 링크 역할 |
| 가입 진행 방식 | **풀 위저드** (한 화면 = 한 질문, 5단계) | 비주얼 컴패니언 A안. 고령 사용자 — 화면당 인지 부하 최소화 |
| 모바일(<768px) | 사진 패널 **숨김**, 로고는 우측 패널 상단으로 | 입력 중심 화면 |
| 재동의 | 같은 스플릿으로 **통일** | 로그인→재동의 체이닝 시 레이아웃 연속성 |
| 위저드 상태 관리 | **단일 RHF 폼 + 스텝별 `trigger()`** | 값 보존·최종 제출·서버 에러 매핑이 기존 패턴 그대로 |

## 3. 라우트·레이아웃 구조

### 3.1 라우트 그룹 이동

```
src/app/(site)/login/page.tsx       →  src/app/(auth)/login/page.tsx
src/app/(site)/signup/page.tsx      →  src/app/(auth)/signup/page.tsx
src/app/(site)/agreements/page.tsx  →  src/app/(auth)/agreements/page.tsx
신규: src/app/(auth)/layout.tsx     →  <AuthSplitLayout>{children}</AuthSplitLayout>
```

route group이라 URL은 불변. `(auth)` 레이아웃은 SiteShell(헤더·푸터)을 렌더하지 않는다.

### 3.2 AuthSplitLayout (`src/components/auth/AuthSplitLayout.tsx`, 신규)

- **좌측 패널** (데스크톱 `md:flex` 50% 폭(`w-1/2`), `min-h-dvh`): `HERO.poster`(hero-poster.jpg) 배경 cover + `cover-dark` 계열 반투명 덮개. 좌상단 `CHURCH_NAME` 로고(홈 `/` Link, on-dark), 좌하단 `HERO_CAPTION` 슬로건(`typo.titleLg`, on-dark) — **전부 기존 상수 주입, 하드코딩 0**
- **우측 패널**: `bg-surface-soft`, children을 수직·수평 중앙 배치(`overflow-y-auto` — 위저드 긴 스텝 대비). 모바일에서는 단독 풀폭, 상단에 로고(ink 톤) 노출
- 텍스트는 on-dark 토큰만(canvas 재사용 금지 — DESIGN 구현 노트 3)
- 좌측 패널은 풀블리드 미디어(히어로와 같은 예외) — 라운드 없음

### 3.3 AuthCard 개편 (`src/components/auth/AuthCard.tsx`, 수정)

- `Container`·`py-section` 제거(스플릿 우측 패널이 배치 책임) → `Card bordered` + `w-full max-w-[var(--container-modal)]` + `p-xl` 유지
- props: `title`(h1, `typo.displaySm`) + **`subtitle?` 신규**(`typo.bodySm`·muted — 예: "{CHURCH_NAME} 홈페이지에 로그인하세요", CHURCH_NAME 보간)
- 배경: 우측 패널이 surface-soft이므로 카드 흰 배경(`surface-card`)이 자연스럽게 분리됨

### 3.4 DESIGN.md 선행 추가 (구현 노트 4)

components에 2개 항목 추가 후 구현:
- **`auth-split`**: 인증 전용 풀스크린 스플릿. 좌 50% 사진 패널(cover-dark 덮개 + on-dark 로고·슬로건) / 우 surface-soft 폼 패널. 모바일은 우측 단독. 좌측은 풀블리드 예외.
- **`wizard-progress`**: 단계 도트. 현재까지 `{colors.primary}` 채움, 미진행 `{colors.hairline}`. `{rounded.full}`. 단계 수 5 내외, 도트 크기·간격은 작게(보조 정보).

## 4. 로그인·재동의 — 셸만 교체

- **LoginForm**: 폼 로직(검증·단일 오류·분기·링크) 무변경. 새 AuthCard(title "로그인", subtitle) 안에 동일 마크업. 페이지는 `(auth)`로 이동만.
- **AgreementsForm**: 동일 — 로직 무변경, 새 셸 적용.
- 기존 테스트는 동작 단언이므로 대부분 그대로 통과해야 한다(통과 못 하면 동작이 변한 것 — 회귀 신호).

## 5. 가입 위저드 (SignupForm → SignupWizard 구조)

### 5.1 스텝 정의

단일 `useForm<SignupFormValues>(zodResolver(signupSchema))` + `const [step, setStep] = useState(0)`.

| step | 질문(h2, `typo.titleLg` — h1 "회원가입"(`typo.displaySm`) 아래 위계) | 필드 | "다음" 검증 |
|---|---|---|---|
| 0 | 전화번호를 알려주세요 | phone | `trigger(["phone"])` |
| 1 | 이름을 알려주세요 | name | `trigger(["name"])` |
| 2 | 비밀번호를 만들어주세요 | password·passwordConfirm | `trigger(["password","passwordConfirm"])` |
| 3 | 이메일이 있으신가요? (선택) | email + **건너뛰기** 보조 버튼(email "" 유지 후 진행) | `trigger(["email"])` |
| 4 | 약관에 동의해주세요 | termsAgreed·privacyAgreed + TermsDialog ×2 | 전체 `handleSubmit` → 가입 |

- 비활성 스텝의 입력은 **렌더하지 않는다**. 값은 RHF 폼 상태가 보존한다 — `shouldUnregister` 기본값(false)에서 입력이 언마운트돼도 값이 유지되므로 별도 저장 불필요
- 진행 표시: 상단 도트 5개(wizard-progress). 2단계부터 "이전" 텍스트 버튼(`tertiary`) — 클릭 시 `setStep(s-1)`, 값 보존
- **Enter 진행**: 스텝 콘텐츠를 `<form onSubmit={next}>`로 감싸 마지막 스텝 전엔 다음 이동, 마지막 스텝은 제출
- CTA 라벨: 중간 스텝 "다음", 마지막 "가입하기"(`loading={isSubmitting}`)

### 5.2 제출·서버 에러 (기존 로직 재사용)

- 제출 핸들러는 기본 구현과 동일: `signup()` → 성공 시 `login()` 자동 호출 → `afterLoginDestination` / 실패 폴백 `/login?next=`
- **서버 에러 → 스텝 복귀**: `FIELD_STEP: Record<SignupField, number>` 매핑 상수(phone→0, name→1, password→2, email→3, termsAgreed·privacyAgreed→4). 409 또는 errors[] 매핑 시 `setError` 후 **가장 이른 에러 필드의 스텝으로 `setStep`** — 사용자가 에러를 바로 본다
- 새로고침 시 위저드 초기화(스텝·값) — 허용 트레이드오프(자격증명 영속화가 더 위험)

### 5.3 접근성

- 각 스텝 질문은 `<h2>`(AuthCard h1 "회원가입" 아래 위계), 입력 라벨은 시각 유지(고령 사용자 — placeholder만으로 대체 금지)
- 스텝 전환 시 새 스텝 첫 입력에 `focus()` (`setFocus` 사용)
- 진행 도트는 `aria-hidden`, 별도로 "5단계 중 N단계" `sr-only` 텍스트 제공

## 6. 테스트

| 대상 | 케이스 |
|---|---|
| `SignupForm.test` 재작성 | 스텝 진행(유효 입력 → 다음 스텝 질문 노출) / 검증 실패 시 진행 차단 + 인라인 에러 / 이전 클릭 시 값 보존 / 이메일 건너뛰기 / 검수2: 약관 미동의 제출 차단 / 검수3: 최종 제출 페이로드 동일(email "" → undefined)·자동 로그인 / 409 → step 0 복귀 + phone 에러 / errors[] 매핑 → 해당 스텝 복귀 / 자동 로그인 실패 폴백 / next 복귀 |
| `AuthSplitLayout.test` 신규 | CHURCH_NAME 로고(홈 링크)·HERO_CAPTION 렌더 / 사진 패널 모바일 숨김 클래스(`max-md:hidden` 류) 존재 |
| `AuthCard.test` 갱신 | title + subtitle 렌더 |
| LoginForm·AgreementsForm 기존 테스트 | 동작 단언이라 무수정 통과가 목표(깨지면 회귀) |

게이트: `pnpm test` + `pnpm lint` + `npx tsc --noEmit` + `pnpm build`(/login·/signup·/agreements 라우트 생성 확인).

## 7. 파일 변경 요약

```
신규:   src/app/(auth)/layout.tsx
        src/components/auth/AuthSplitLayout.tsx (+test)
이동:   src/app/(site)/{login,signup,agreements}/page.tsx → src/app/(auth)/…
수정:   src/components/auth/AuthCard.tsx (+test) — Container 제거·subtitle 추가
재작성: src/components/auth/SignupForm.tsx (+test) — 위저드화 (파일명 유지)
수정:   .claude/rules/DESIGN.md — auth-split·wizard-progress 항목
무변경: LoginForm·AgreementsForm 내부 로직, schemas·nextParam·authApi·agreementsApi·Checkbox·TermsDialog
```
