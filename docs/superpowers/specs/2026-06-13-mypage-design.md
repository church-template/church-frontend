# 마이페이지 설계 스펙 — 내 정보·약관·비밀번호·회원 탈퇴 (T15)

> 2026-06-13 브레인스토밍 확정본. 이슈 `.issues/T15-my-page.md`.
> 선행: T5(인증 인프라)·T7(앱 셸)·T14(재동의 `/agreements`). 참조: 가이드 1.5·2장·9장(line 396~401), 15.1, OpenAPI `/api/members/me`(GET·PATCH·DELETE)·`/api/members/me/agreements`.
>
> **⚠️ 현재 작업 트리 상태(2026-06-13 확인)**: 탈퇴 플로우가 **이미 스캐폴딩됨**(미커밋) — `authApi.withdraw()`·`types.WithdrawRequest`·`WithdrawDialog.tsx`·`MypageContent.tsx`(placeholder). 이 스펙은 **그 위에서 재사용/변경**한다. 신규 생성은 아직 안 만든 부분(프로필 조회·수정·비번 변경·약관 표시)에 한정.

## 1. 목적·범위

로그인 회원이 **본인 정보 조회·수정**, **약관 동의 상태 확인**, **비밀번호 변경**, **회원 탈퇴**를 하는 페이지. 회원 영역이므로 **전부 클라이언트 + TanStack Query + `authFetch`**(가이드 15.1). 라이브 값은 토큰이 아니라 `GET /api/members/me`를 신뢰(1.5).

**약관은 게이트가 아니다**: 가이드 9장은 재동의를 **로그인 응답 `requiresAgreement`로 유도**(T14 `/agreements`)할 뿐, 마이페이지를 차단 게이트로 규정하지 않는다. 따라서 **약관 미동의 회원도 `/mypage` 진입을 허용**하고, `AgreementStatus`가 재동의를 *권유*만 한다.

**범위 밖**: 관리자 약관 일괄 리셋(`/api/admin/agreements/reset`), 갤러리 등 타 회원 기능. 마이페이지는 약관 리셋을 건드리지 않고 상태 표시 + 본인 재동의 링크만 제공.

## 2. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| D1 | **읽기 카드 + [수정] 토글** | 평소 읽기 전용 프로필 카드, [수정] 시 인라인 편집 폼으로 0.2~0.3s 크로스페이드. admin식 상시 폼·탭 기각("조용히 신뢰" 톤, 콘텐츠 적음). |
| D2 | 수정 필드 = **이름·전화·이메일** (직분 제외) | `MeUpdateRequest`의 프로필 3종. **직분(position)은 `MeUpdateRequest`에 없음 → 읽기 전용**(어드민 `POSITION_MANAGE` 영역). 전화는 로그인 ID지만 API가 변경 허용(자기제외 중복 409). |
| D3 | **비밀번호 변경 = 별도 섹션** | 프로필 폼과 분리한 조용한 토글 폼(새 비밀번호 + 확인). 같은 `PATCH /me`의 `password`만 전송. **세션 무효화 여부 미확정(§12 리스크)**. |
| D4 | 약관 = **표시 + 링크만** | `useMe()`의 `termsAgreed`/`privacyAgreed`/`agreedAt`로 표시. 둘 다 true면 완료 행, 아니면 **primary-soft 넛지** + `/agreements?next=/mypage`. `GET /me/agreements`(보조 경로) **미사용**. |
| D5 | permissions = **표시 전용 칩, 베이스라인이면 생략** | 승인 배지(`roles`에 `MEMBER`→`[교인]` / else `[승인 대기]`)가 메인. `permissions`는 `PERMISSION_LABELS`로 한글 칩, 빈 배열이면 섹션 생략. **마이페이지의 permissions는 '표시'이지 어드민 진입 게이팅이 아님**(이슈 §4의 show/hide는 별도 기능). |
| D6 | 회원 탈퇴 = **기존 구현 재사용 + 모달 빨강** | `authApi.withdraw` + 기존 `WithdrawDialog`(미커밋) **재사용**. 변경점은 (a) 모달 `[탈퇴하기]` 버튼 `secondary`→**`destructive`(빨강)**, (b) 경고문에 "모든 기기 로그아웃" 보강. 트리거(muted 텍스트 "회원 탈퇴")·useState 폼·`handleApiError({onAuthFailed})` 구조는 **유지**(불필요한 재작성 금지). |
| D7 | 탈퇴 세션 정리 = **기존 책임 분담 유지** | `authApi.withdraw`가 성공 시 **내부에서 `authStore.clear()`** 수행. 호출측(`WithdrawDialog`)은 `removeQueries(["me"]) + router.replace("/")`만. 서버가 전체 세션 무효화(access 블랙리스트)하므로 **`logout` 호출 안 함**(부르면 401). clear 이중 호출 금지. |
| D8 | `destructive` 버튼 = **토큰·전용 variant·문서 예외** | 인라인 hex 금지. `--color-error-active`·`--color-on-error` 토큰 추가 + Button `destructive` variant(genuinely 신규) + DESIGN.md "파괴적 확인 한정" 예외 기록. |
| D9 | 인터랙션 = **조용한 것만** | Reveal 등장·Skeleton 로딩·읽기↔편집 크로스페이드·버튼 loading·토스트. reduced-motion 대응. 카드 hover lift·패럴랙스 배제. |

## 3. API 계약 (OpenAPI 확정값)

| 메서드 | 경로 | 요청 | 응답 | 인증 | 비고 |
|---|---|---|---|---|---|
| GET | `/api/members/me` | — | `MeResponse` | 로그인(본인) | 라이브 값. 익명 → **401 `INVALID_TOKEN`**(authFetch가 refresh 선처리). |
| PATCH | `/api/members/me` | `MeUpdateRequest` | `MeResponse` | 로그인(본인) | 비-null 필드만 변경. phone 자기제외 중복 → 409 `DUPLICATE_RESOURCE`. |
| DELETE | `/api/members/me` | `WithdrawRequest` | 204 | 로그인(본인) | soft delete + 개인정보 스크럽 + **전체 세션 무효화**. 마지막 활성 SUPER_ADMIN → 403 `ACCESS_DENIED`. |

**스키마**
- `MeResponse`: `uuid·name·phone·email·position·roles[]·permissions[]·maxPriority·termsAgreed·privacyAgreed·agreedAt`. ⚠️ **`agreedAt`은 nullable**(OpenAPI `@JsonInclude(NON_NULL)` — 미동의 시 키 누락). `types.ts`의 `MeResponse.agreedAt: string`을 **`string | null`로 정정**(현재 비-null 선언은 버그, `AgreementResponse`는 이미 `string | null`).
- `MeUpdateRequest`(전부 선택, null=미변경): `name`(maxLength 50, **minLength 0**)·`phone`(maxLength 20, minLength 0)·`password`(8~72)·`email`(email, maxLength 255, minLength 0). 서버는 빈 문자열을 통과시키므로 프론트 zod가 `name` `min(1)`로 더 엄격히 막는 게 의도.
- `WithdrawRequest`(필수): `password`(string, **minLength 1**) — 비어있지 않음만(8+ 아님). **types.ts에 이미 존재**.

## 4. 파일 구조

```
신규
├─ src/components/mypage/ProfileCard.tsx          # 읽기 뷰 + [수정] 토글
├─ src/components/mypage/ProfileEditForm.tsx      # 이름·전화·이메일 편집 폼
├─ src/components/mypage/PasswordChangeSection.tsx # 비밀번호 변경 토글 폼
├─ src/components/mypage/AgreementStatus.tsx      # 약관 상태/재동의 넛지
├─ src/components/mypage/schemas.ts               # profileSchema·passwordChangeSchema
├─ src/constants/permissions.ts                   # PERMISSION_LABELS(권한→한글)
└─ 위 각각의 *.test.tsx · permissions.test.ts

변경 (기존 미커밋/구현 위에서)
├─ src/components/mypage/MypageContent.tsx   # placeholder → 본 구현(가드 보정 + 섹션 조립). 로그아웃·WithdrawDialog 동선은 유지
├─ src/components/mypage/WithdrawDialog.tsx  # [탈퇴하기] secondary→destructive + 경고문 "모든 기기 로그아웃" 보강 (구조 유지)
├─ src/lib/auth/authApi.ts                   # updateMe(PATCH) 추가 (withdraw는 기존 유지·재사용)
├─ src/lib/auth/types.ts                     # MeUpdateRequest 추가 + MeResponse.agreedAt → string|null 정정 (WithdrawRequest 기존)
├─ src/components/ui/Button.tsx              # destructive variant 추가
├─ src/app/globals.css                       # --color-error-active·--color-on-error 토큰 추가
└─ .claude/rules/DESIGN.md                   # 시맨틱 색 예외 + button-destructive + Do/Don't 보정
```

> `meApi.ts`·`ensureOk`는 **만들지 않는다** — 기존 `authApi.withdraw`가 `!res.ok`일 때만 `parseJson`을 호출(204 본문 미파싱)하므로 `ensureOk` 불필요. `updateMe`도 `authApi.ts`에 추가(withdraw와 동일 위치, 응답 본문 있으므로 `parseJson<MeResponse>` 사용).
> 기존 `useMe.ts`·`mypage/page.tsx`는 그대로.

## 5. 컴포넌트 명세

### `MypageContent` (오케스트레이터, client) — 변경
- **진입 가드 보정**: 마운트 1회 `if (!useAuthStore.getState().member || !useAuthStore.getState().accessToken) router.replace("/login?next=/mypage")`. (member만 있고 token 없는 경우 `useMe`가 `enabled:false`로 무한 `isPending` 되는 문제 차단.)
- `useMe()` → `isPending`: `Skeleton` 행 / `isError`: 안내 + **[다시 시도]**(`refetch`) / 성공: 섹션 렌더(`me`를 prop 전달).
- 레이아웃: `Container as="section" className="py-section"`, 페이지 헤드 `typo.displayMd` "마이페이지", `Reveal` 스태거 등장.
- 하단: 기존 **로그아웃**(`secondary`, `signOut`→`removeQueries(["me"])`+토스트+`replace("/")`) + 헤어라인 분리 **`WithdrawDialog`**(기존 유지).

### `ProfileCard` — 신규
- 읽기 뷰: 아바타 플레이트(`rounded-full bg-primary-soft text-primary`, 이름 첫 글자) + 이름 `typo.titleLg` + 승인 배지 + `[수정]`(`tertiary`).
- 본문(헤어라인 행): 이메일 / 전화(`typo.datetime`) / **직분(읽기 전용)**. position이 빈 문자열이면 행 생략. + 권한 칩(D5). + 하단 회원 ID `typo.caption text-muted`(이슈 표시 요건).
- `[수정]` → `editing` 토글 → `ProfileEditForm`(크로스페이드). 카드 flat 유지.

### `ProfileEditForm` — 신규
- RHF + zod(`profileSchema`): `name`(1~50)·`phone`(형식, `formatPhone` 재사용)·`email`(선택, email).
- `defaultValues`는 `me`에서. **변경분(dirtyFields)만 전송** — `email`을 빈 값으로 두면 전송 제외(빈 문자열 전송 시 서버 email 형식 400 위험 회피). `[취소]`(원복)·`[저장]`(loading).

### `PasswordChangeSection` — 신규
- 기본 접힘. "비밀번호 변경"(`tertiary`) → `PasswordInput` 새 비밀번호 + 확인 2칸.
- zod(`passwordChangeSchema`): `password`(8~72), `confirm`(일치 `refine`).
- 성공: `updateMe({ password })` → 토스트 + 폼 접고 값 비움 → **`useMe` refetch**(비번 변경이 토큰을 무효화하면 401→정상 만료 처리되도록, §12). "재로그인 불필요"를 단정하지 않음.

### `AgreementStatus` — 신규
- `me.termsAgreed && me.privacyAgreed` → flat 행: lucide `Check`(`size=20 text-muted`) + "약관 동의 · 완료" + **`me.agreedAt ? \`(${parseServerDate(me.agreedAt)→yyyy-MM-dd})\` : \`\``** (null 가드 — 날짜 없으면 생략) `typo.datetime`.
- 아니면 **primary-soft 카드**: "약관 재동의가 필요합니다" + `<Link href="/agreements?next=/mypage">[재동의하기 →]`. (primary 등장 유일 지점)

### `WithdrawDialog` — 변경(구조 유지)
- 기존 self-contained 구조 유지: `useState`(open/password/error/submitting), `DialogTrigger`(muted 텍스트 "회원 탈퇴"), `withdraw(password)` 호출, `handleApiError(err, { onAuthFailed: setError })`.
- **변경점만**: (1) `[탈퇴하기]` `variant="secondary"` → **`variant="destructive"`**. (2) `DialogDescription`에 "모든 기기에서 로그아웃되며" 보강.

## 6. 데이터 흐름·뮤테이션

```
조회   useMe() ─ ["me"] ─ MypageContent ─prop→ 자식
수정   ProfileEditForm.submit → updateMe(변경분) ─onSuccess→ setQueryData(["me"], res) + notify + 읽기뷰
비번   PasswordChangeSection.submit → updateMe({password}) ─onSuccess→ notify + 폼 접기 + useMe refetch
약관   표시만 / 링크로 /agreements 위임
탈퇴   WithdrawDialog.submit → authApi.withdraw(password)[내부 clear()] ─onSuccess→ removeQueries(["me"]) + replace("/")
```

`authApi.ts`에 추가:
```ts
export async function updateMe(req: MeUpdateRequest): Promise<MeResponse> {
  const res = await authFetch("/api/members/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return parseJson<MeResponse>(res); // 200 + MeResponse
}
// withdraw(password)는 기존 그대로 재사용 (DELETE + !res.ok면 parseJson + clear())
```

## 7. 에러 처리 (가이드 4장 — `handleApiError` 경유)

폼 뮤테이션 `onError`는 `handleApiError(e, handlers)`로 분기(기존 핸들러 객체 활용):

| 출처 | 케이스 | 처리(handler) |
|---|---|---|
| updateMe(프로필) | `INVALID_INPUT_VALUE` | `onFieldErrors: (errs) => errs.forEach(fe => 화이트리스트(name·phone·email)에 있으면 setError(fe.field, { message: fe.reason }), 아니면 토스트 폴백)` |
| updateMe(프로필) | phone `DUPLICATE_RESOURCE` | `onDuplicate: () => setError("phone", { message: "이미 사용 중인 전화번호입니다" })` |
| updateMe(비번) | `INVALID_INPUT_VALUE` | `onFieldErrors`로 `password`만 PasswordChangeSection 폼에 매핑(프로필 폼은 password 미전송이라 충돌 없음) |
| withdraw | 비번 오류(§12: errorCode 미확정, `AUTHENTICATION_FAILED` 가정) | `onAuthFailed: (msg) => setError(msg)` — 모달 인라인, 유지 |
| withdraw | `ACCESS_DENIED`(마지막 SUPER_ADMIN) | handleApiError 기본 → `detail` 토스트, 모달 유지 |
| 공통 | `INVALID_TOKEN` | authFetch가 refresh 선처리. 도달 시 handleApiError가 세션만료 안내. 뮤테이션 `retry` 금지. |

> `FieldError`의 메시지 필드명은 **`reason`**. RHF는 `setError(field, { message })`. (SignupForm과 동일 경유 패턴.)

## 8. permissions 표시 규칙 (D5)
- `PERMISSION_LABELS: Record<string,string>` — 가이드 2.2의 12개(`SERMON_WRITE`→"설교 관리" 등). 미정의 키는 raw 폴백.
- `me.permissions.length === 0` → 칩 섹션 생략.
- 승인 배지: `me.roles.includes("MEMBER")` → `[교인]`(primary-soft) / else `[승인 대기]`(surface-strong).

## 9. 디자인·인터랙션

### destructive 버튼 (D8)
globals.css `@theme` 추가(실제 CSS 변수명 = `--color-error`(#cf202f) 계열, 유틸 `bg-error`):
```css
--color-error-active: #a81b27; /* hover·press */
--color-on-error: #ffffff;     /* error 채움 위 텍스트 */
```
Button `variantClass`에 추가(※ `typo.button`·transition·focus base는 `buttonVariants`의 `baseClass`가 자동 합침 — variantClass 항목엔 색·상태만):
```ts
destructive: cn(
  "bg-error text-on-error rounded-lg h-12 px-5",
  "hover:bg-error-active active:bg-error-active active:translate-y-px",
  "disabled:opacity-50",
  "focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card",
),
```
- 흰 텍스트 20px·600(큰 텍스트) → `#cf202f` 대비 WCAG AA 통과. 링 오프셋은 모달 표면과 일치하는 `surface-card`.
- 구현 전 `--color-error`가 globals.css에 실재하는지 확인(있음 — L36, `bg-error` 동작 보장).

### DESIGN.md 보정 (유틸명 병기)
1. 색 > 시맨틱: "단, 파괴적 확인 버튼(회원 탈퇴 등)에 한해 `error`(`--color-error`/유틸 `bg-error`)를 채움색으로 쓸 수 있다(`button-destructive`)" 추가.
2. 컴포넌트 > 버튼: `button-destructive` 항목 추가.
3. Do/Don't: "semantic success/error를 버튼·배경 색으로 쓰지 않는다 — **단, 파괴적 확인 버튼 예외**"로 보정.

### 인터랙션
Reveal 스태거 · Skeleton 로딩 · 읽기↔편집 크로스페이드 · 버튼 loading · 토스트. 전부 0.2~0.3s, **reduced-motion에서 정지/즉시표시**.

## 10. 테스트 계획 (게이트 80%+, 이슈 §5·§6)

| 대상 | 검증 |
|---|---|
| `updateMe`(authApi) | PATCH `/api/members/me` 경로·바디(변경분)·`MeResponse` 반환. |
| `ProfileCard` | 필드 표시·승인 배지 분기·직분 빈값 행 생략·권한 칩(생략 포함)·[수정] 토글. |
| `ProfileEditForm` | dirty 필드만 전송(email 빈값 미전송)·성공 `setQueryData`·`onFieldErrors`→`setError(field,{message})`·409→phone 메시지. |
| `PasswordChangeSection` | 확인 불일치 검증·`updateMe({password})`·성공 시 폼 접힘·refetch. |
| `AgreementStatus` | 완료/재동의 분기·**agreedAt null 가드**(날짜 생략)·링크 `next=/mypage`. |
| `WithdrawDialog` | (기존 테스트 유지/보강) 빈 비번 차단·`withdraw` 호출·성공→`removeQueries`+`replace`·비번오류 인라인·**[탈퇴하기] destructive 클래스**. |
| `MypageContent` | 가드(`!member ‖ !accessToken`)·isError refetch·isPending Skeleton. |
| 접근성 | 모달 초기 포커스(비번 입력)·`aria-describedby`(Title/Description)·닫힘 후 트리거 복귀·reduced-motion 애니메이션 정지. |
| `PERMISSION_LABELS` | 알려진 키 한글·미정의 raw 폴백. |
| 검수(§6) | 권한/직분 변경 후 lag 없이 최신값(`useMe`, 토큰 아님)·401 refresh는 authFetch 선처리. |

## 11. 완료 조건 (이슈 T15 §5 — 이슈의 `/me`는 `/mypage` 오타)
- [ ] `/mypage`: `GET /members/me` 표시(uuid·이름·전화·이메일·직분·역할/승인·permissions·약관).
- [ ] `PATCH /members/me` 수정(이름·전화·이메일, 변경분만) + `errors[]` 매핑.
- [ ] 비밀번호 변경(별도 섹션).
- [ ] 약관 상태 + 재동의 링크(`/agreements?next=/mypage`).
- [ ] 회원 탈퇴(기존 `withdraw` 재사용, 모달 확인 `destructive`).
- [ ] TanStack Query + `authFetch`, permissions **표시**.

## 12. 리스크·메모 (검증 패스 반영)
- **비번 변경 세션 영향 미확정**: PATCH `/me` `password` 변경 시 기존 access/refresh 유효성을 OpenAPI가 명시 안 함. "재로그인 불필요" 단정 금지 → 성공 후 `useMe` refetch로 401 시 정상 만료 흐름 타게. 실제 동작 확인 시 본 항목 갱신.
- **탈퇴 비번오류 errorCode 미확정**: `AUTHENTICATION_FAILED` 가정. 만약 `INVALID_TOKEN`으로 오면 authFetch가 refresh를 시도해 정상 세션이 만료될 위험 → 구현 전 실제 응답 확인. 확인 전까진 `handleApiError` 폴백(토스트)으로도 안전하게.
- **OpenAPI 표기 버그(참고)**: DELETE `/me`의 `Authorization` 파라미터가 `required:false`로 적혔으나 실제 로그인 필수. authFetch가 토큰 자동 부착하므로 프론트 영향 없음.
- 동시 작업: 탈퇴 스캐폴딩이 미커밋 상태 → 구현 착수 전 해당 변경의 출처·유지 여부 확인(이 스펙은 유지·재사용 전제).
