# T14 인증 UI (로그인 · 가입 · 재동의) 설계

> 2026-06-12 · 이슈: `.issues/T14-auth-ui.md` · 선행: T5(인증 인프라)·T7(앱 셸) 완료
> 참조: 가이드 1.1·1.2·2장·4.2·4.3·9장·11장·12장·15.1 / `docs/api-docs.json` / `.claude/rules/DESIGN.md`

## 1. 목적·범위

로그인(`/login`)·회원가입(`/signup`)·약관 재동의(`/agreements`) 3개 화면을
react-hook-form + zod로 구현한다. 서버 검증 오류(`errors[]`)를 필드에 매핑한다.

**범위 외**: 마이페이지·로그아웃 UI(T15), 갤러리 게이트(T16), 비밀번호 재설정(백엔드 API 없음).

## 2. 확정 결정 (브레인스토밍 합의)

| 결정 | 내용 | 근거 |
|---|---|---|
| 가입 후 플로우 | **자동 로그인** — signup 201 → 같은 자격으로 `login()` 자동 호출 | 고령 사용자 재입력 부담 제거 (12장) |
| 비밀번호 확인 필드 | 가입 폼에 `passwordConfirm` 추가 (zod refine 일치 검증, 전송 제외) | 비밀번호 재설정 API가 없어 오타 가입 = 계정 복구 불가 + 전화번호 409 점유 |
| 로그인 복귀 | **`?next=` 쿼리 지원** — 내부 경로만 허용, 없으면 홈 | T16 갤러리 게이트 재사용, 오픈 리다이렉트 방지 |
| 약관 본문 | **"전문 보기" Dialog**(T4 dialog.tsx 재사용) + `src/constants/terms.ts` 상수 | 페이지 이탈 없음, 가입·재동의 양쪽 재사용, 콘텐츠 하드코딩 금지 충족 |
| 데이터 패칭 | **경량 직결** — login/signup은 `authApi` 직접 호출 + RHF `isSubmitting`, 재동의(회원 영역)만 TanStack Query | 가이드 15.1 "TanStack Query는 회원 영역 전용" |

## 3. 라우트 · 레이아웃

```
src/app/login/page.tsx        → <LoginForm />      (서버 셸 + metadata)
src/app/signup/page.tsx       → <SignupForm />
src/app/agreements/page.tsx   → <AgreementsForm />
src/components/auth/          → LoginForm.tsx · SignupForm.tsx · AgreementsForm.tsx
                                 · TermsDialog.tsx · schemas.ts
src/lib/auth/nextParam.ts     → sanitizeNext()
src/components/ui/Checkbox.tsx → 신규 시각 컴포넌트
src/constants/terms.ts        → 약관 본문 상수
```

- 페이지 셸은 서버 컴포넌트(metadata export), 폼은 `"use client"` 컴포넌트.
- 레이아웃: 기존 셸(SiteHeader light) 그대로. `Container` 안 좁은 중앙 폼 카드
  (Card — `{rounded.xl}` + hairline, 내부 패딩 32px), 상하 `py-section`. 히어로 없음.
- `next` 읽기는 `useSearchParams` — Suspense 경계 필요 여부는 구현 시
  `node_modules/next/dist/docs/` 확인 후 적용 (AGENTS.md).

## 4. 플로우

### 4.1 로그인 — `/login`
1. `phone` + `password` 제출 → `authApi.login()` (세션 저장은 T5 `setSession`이 처리).
2. 응답 `requiresAgreement === true` → `router.replace("/agreements?next=<원래 next>")`.
3. 아니면 → `router.replace(sanitizeNext(next))` (기본 `/`).
4. 401 `AUTHENTICATION_FAILED` → 폼 루트 에러로 **단일 메시지**
   "전화번호 또는 비밀번호가 올바르지 않습니다." (전화번호 미존재·비번 불일치 동일 처리 — 가입 여부 비노출, 1.2/4.3).

### 4.2 회원가입 — `/signup`
1. 제출 → `authApi.signup()` (201, 토큰 없음).
2. 성공 → 같은 자격으로 `authApi.login()` 자동 호출 → 성공 토스트 → 로그인과 동일 분기
   (`requiresAgreement` 포함 — 코드 경로 재사용).
3. 자동 login 실패(이론상 드묾) → `/login?next=…`으로 폴백 + 안내 토스트.
4. 가입은 `USER` 역할만 부여(권한 0) — 갤러리 등은 관리자가 MEMBER 부여 후(1.1). UI 영향 없음.

### 4.3 재동의 — `/agreements`
1. 진입 가드: 토큰 없으면 `/login?next=/agreements`로 replace (클라이언트 가드, 하이드레이션 후 판정).
2. `GET /api/members/me/agreements` (`useQuery` + authFetch) → 현재 동의 상태를 체크박스 초기값에 반영.
3. 두 체크박스 모두 true일 때만 제출 활성 (zod `literal(true)` ×2).
4. `PATCH /api/members/me/agreements` (`useMutation` + authFetch) 성공 → **`useMe` 쿼리 무효화**
   (캐시된 `MeResponse.termsAgreed/privacyAgreed` stale 방지) → 토스트 → `sanitizeNext(next)`로 이동.
   성공 시 `agreedAt` 갱신 → 다음 로그인부터 `requiresAgreement=false` (9장).

### 4.4 공통 가드·유틸
- `sanitizeNext(raw: string | null): string` — `"/"`로 시작하고 `"//"`로 시작하지 않는
  내부 경로만 허용, 그 외 `"/"` 폴백 (오픈 리다이렉트 방지).
- 역가드: 이미 로그인 상태(`member` 존재)로 `/login`·`/signup` 접근 시 홈으로 replace.
  **최초 진입 시 1회만 판정** — 가입 자동 로그인 직후 제출 핸들러의 리다이렉트(`next` 유지)와
  경합해 `next`를 잃지 않도록 member 변화를 계속 감시하지 않는다.

## 5. 폼 검증 (zod, `src/components/auth/schemas.ts`)

의존성 추가: `pnpm add react-hook-form zod @hookform/resolvers` (15.1 확정 스택 내).

| 스키마 | 규칙 |
|---|---|
| `loginSchema` | `phone` 필수(숫자·하이픈만, 숫자 10~11자리) · `password` 필수(존재만) |
| `signupSchema` | `name` 필수 · `phone` 동일 규칙 · `password` ≥ 8자(특수문자·대소문자 강제 없음 — 12장) · `passwordConfirm` 일치(refine) · `email` 선택(빈 문자열→undefined 후 형식 검증) · `termsAgreed`·`privacyAgreed` 둘 다 `literal(true)` |
| `agreementsSchema` | `termsAgreed`·`privacyAgreed` 둘 다 `literal(true)` |

- 전화번호는 하이픈 포함 그대로 전송(서버가 숫자만 정규화 — 11장).
- `passwordConfirm`은 클라 검증 전용, 요청 본문에서 제외.
- 검증 메시지: 입력 아래 caption + semantic 토큰 텍스트(기존 `Input`의 `error` prop 재사용, T3).

## 6. 서버 에러 매핑 (분기는 `errorCode`로만 — 4장)

T5 `handleApiError` 콜백 활용:

| 페이지 | errorCode | 처리 |
|---|---|---|
| 로그인 | `AUTHENTICATION_FAILED` (401) | 폼 루트 에러 단일 메시지 (제출 버튼 위 caption·semantic-error) |
| 가입 | `INVALID_INPUT_VALUE` (400) + `errors[]` | `setError(field, { message: reason })` 필드별 인라인 |
| 가입 | `DUPLICATE_RESOURCE` (409) | `setError("phone", …)` — "이미 가입된 전화번호입니다." |
| 재동의 | `INVALID_INPUT_VALUE` (400) | 토스트(클라가 이미 차단하므로 방어적) |
| 공통 | 그 외 | `notify.error` 토스트 (detail 또는 title) |

- 401 `INVALID_TOKEN`(재동의 GET/PATCH 중 access 만료)은 T5 `authFetch`가 refresh 큐잉으로 처리 — T14 추가 작업 없음.

## 7. 신규 컴포넌트 · 상수

### 7.1 `Checkbox` (`src/components/ui/Checkbox.tsx` — 시각 컴포넌트, 직접 구현)
- 네이티브 `input[type=checkbox]` + 커스텀 스타일 (접근성 동작 보존).
- 라벨 포함 행 전체가 클릭·터치 타깃 (최소 48px 행 높이 — 고령 사용자).
- `error` 메시지 prop 지원 (Input과 동일 패턴: 아래 caption·semantic-error).
- **선행 작업**: DESIGN.md components 블록에 `checkbox` 항목 추가 (구현 노트 4).
  체크 시 `{colors.primary}` 채움 + lucide `Check` 아이콘(on-dark 계열). 박스 크기·라운드의
  구체 수치는 DESIGN.md 항목 추가 시 확정한다 (제안: 박스 24px급, 라운드는 `{rounded.sm}`보다
  작은 시각 보정 — 중첩 라디우스 원칙 준수 사유를 항목에 명기).

### 7.2 `TermsDialog` (`src/components/auth/TermsDialog.tsx`)
- 기존 `src/components/ui/dialog.tsx`(T4 shadcn 재스킨) 재사용.
- 약관 제목 + 본문 스크롤 영역. 체크박스 라벨 옆 "전문 보기" 링크로 호출.
- 가입·재동의 양쪽 공용.

### 7.3 `src/constants/terms.ts`
- `TERMS_OF_SERVICE`·`PRIVACY_POLICY` 상수 — `{ title, body }`.
- 본문은 플레인 텍스트(`whitespace-pre-line` 렌더) — 정적 상수라 마크다운 파이프라인 불필요.
- 문구는 템플릿용 일반 약관 텍스트 (교회별 교체 전제 — 콘텐츠 하드코딩 금지 규칙의 상수 주입 방식).

### 7.4 네비 연결
- `NAV_LOGIN`이 `/login`을 가리키는지 확인만 (T7 상수) — T14 신규 작업 없음.

## 8. 테스트 (TDD — RED→GREEN→REFACTOR, 검수 기준 = T14 §6)

기존 vitest + Testing Library, 코로케이션 `.test.tsx` 패턴 유지.
API는 `authApi`/`authFetch` 모듈 mock(`vi.mock`), 라우터는 `next/navigation` mock.

| 대상 | 케이스 |
|---|---|
| `schemas.test.ts` | pw 7자 거부·8자 통과 / 약관 한쪽만 동의 거부 / email 빈값 허용·형식 오류 거부 / passwordConfirm 불일치 거부 / phone 하이픈 허용·자릿수 검증 |
| `nextParam.test.ts` | `/gallery` 허용 / `https://evil.com` 거부 / `//evil.com` 거부 / 미지정 시 `/` |
| `LoginForm.test.tsx` | 없는 번호/틀린 비번 **동일 단일 메시지**(401 mock) / `requiresAgreement=true` → `/agreements` 이동 / `next` 복귀 / 제출 중 loading |
| `SignupForm.test.tsx` | 약관 미동의 클라 제출 차단 / 201 → `login()` 자동 호출 / 409 → phone 필드 에러 / `errors[]` → 필드 매핑 |
| `AgreementsForm.test.tsx` | GET 초기값 반영 / 둘 다 체크 전 제출 비활성 / PATCH 성공 → 이동·토스트 |

검증 게이트: `pnpm test` + `pnpm lint` + `pnpm build`.

## 9. 검수 기준 (T14 §6 ↔ 테스트 매핑)

- [ ] 없는 번호/틀린 비번이 동일 메시지로 표시(가입 여부 비노출) → `LoginForm.test`
- [ ] 약관 2종 미동의 시 클라이언트 제출 차단 → `SignupForm.test`·`AgreementsForm.test`
- [ ] 가입 성공 후 자동 로그인(가입 응답 토큰 없음 전제) → `SignupForm.test`
- [ ] 로그인 시 `requiresAgreement=true`면 재동의로 이동 → `LoginForm.test`
