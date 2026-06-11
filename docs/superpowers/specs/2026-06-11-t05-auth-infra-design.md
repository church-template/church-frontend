# T05 인증 인프라(authFetch · 토큰 · 401 refresh · Zustand) — 설계

**작성일:** 2026-06-11
**이슈:** `.issues/T05-auth-infra.md`
**선행:** T1(셋업)
**참조:** 가이드 1장(1.1~1.6) · 2장 · 11장 / `docs/api-docs.json` / AGENTS.md

---

## 1. 목적

토큰 수명주기 · 401 자동 refresh · 인증 상태 스토어 · 권한 게이팅 헬퍼를 구축한다.
회원 · 어드민 기능 전체(T14~T16)의 선행. 서버는 **STATELESS**(쿠키 · 세션 없음) —
토큰은 클라이언트가 보관 · 재전송한다. T05는 **인프라만** 제공하고 UI는 후속 이슈에서 소비한다.

---

## 2. 확정 사실 (신뢰 소스 3종)

- **스택 미설치 상태**: `zustand` · `@tanstack/react-query` · `vitest` 신규 설치. `react-hook-form` · `zod`는
  폼 도입(T14)으로 보류(YAGNI). 기존 `src/lib`엔 `utils` · `notify`만 존재.
- **API 별도 오리진**: `NEXT_PUBLIC_API_BASE=http://localhost:8080`, 프론트는 `:3000`. CORS 단일 오리진 +
  `allowCredentials`. authFetch의 `/api/...`는 이 base를 결합해야 한다(가이드 0.2 · 0.3, 백엔드 G).
- **DTO 확정**(`api-docs.json`):
  - `LoginRequest{ phone, password }` → `LoginResponse{ tokens: TokenPair, member: MemberSummary, requiresAgreement }`
  - `TokenPair{ accessToken, refreshToken }` (**항상 중첩**)
  - `SignupRequest{ phone, name, password, email, termsAgreed, privacyAgreed }` → `SignupResponse{ uuid, name, phone, roles }` (**토큰 없음**, 201)
  - `RefreshRequest{ refreshToken }` → `RefreshResponse{ tokens }` (**access만 갱신**, refresh echo)
  - `LogoutRequest{ refreshToken }` → 204(멱등)
  - `MeResponse{ uuid, name, phone, email, position, roles, permissions[], maxPriority, termsAgreed, privacyAgreed, agreedAt }`
- **게이팅 기준**: `MeResponse.permissions` 문자열(roles · 직분 아님, 접두사 없음 — 가이드 2.1).
- **토큰 만료 하드코딩 금지**: 401 `errorCode`로 감지(가이드 0.3 · 1.4).

---

## 3. 모듈 구조 (작은 파일, 단일 책임)

```
src/lib/auth/
  apiBase.ts      # API_BASE = NEXT_PUBLIC_API_BASE, apiUrl(path) 결합 헬퍼
  apiError.ts     # ApiError(status·errorCode·detail) + parseJson<T>(res): !ok면 throw
  types.ts        # TokenPair·MemberSummary·MeResponse·LoginResponse 등 DTO 타입
  authStore.ts    # Zustand store(토큰+member) + persist + 액션
  authFetch.ts    # 401 분기·refresh 큐잉·재시도 (store getState/setState 사용, 항상 Response 반환)
  authApi.ts      # login·signup·signOut (auth 엔드포인트 호출 + 스토어 반영)
  permissions.ts  # hasPermission(perm, me) 순수 헬퍼
  useMe.ts        # TanStack Query 훅: GET /members/me (라이브 권한)
  authFetch.test.ts  # vitest — 검수 4종 + 엣지(refreshToken 부재)
src/app/
  providers.tsx   # 'use client' QueryClientProvider
  layout.tsx      # <Providers>{children}</Providers> 추가, <Toaster /> 유지 (수정)
vitest.config.mts # environment: 'jsdom', plugins: tsconfigPaths()+react() (Next16 문서 기준)
```

근거: 가이드 1 · 2장이 토큰 생명주기와 권한 게이팅을 분리하므로, fetch 계층(authFetch) ·
세션 상태(authStore) · 권한 판단(permissions/useMe)을 각각 떼어 둔다. HTTP 에러 정책(`!ok`→throw)은
전송(authFetch)과 분리해 `apiError`에 둔다 — authFetch는 Response를 그대로 돌려주고, 에러로 바꿀지는 소비측이 결정.

의존 방향(순환 없음): `authStore` → (없음) / `apiError` → `types` / `authFetch` → `authStore`·`apiBase` /
`authApi` → `authFetch`·`authStore`·`apiBase`·`apiError` / `useMe` → `authFetch`·`apiBase`·`apiError`·`permissions`(usePermission용) / `permissions` → `types`.

---

## 4. 컴포넌트 설계

### 4.1 Zustand auth store (`authStore.ts`)

- **상태**: `accessToken: string | null` · `refreshToken: string | null` · `member: MemberSummary | null`(스냅샷, **표시용**).
- **액션**:
  - `setSession(res: LoginResponse)` — 로그인 성공 시 토큰 + member 일괄 설정.
  - `setAccessToken(token: string)` — refresh 성공 시 access만 교체.
  - `forceLogout()` — 토큰 · member 비움(refresh 실패 등 강제).
  - `clear()` — 사용자 로그아웃 후 비움.
- **persist 미들웨어** → localStorage 자동 영속(키 예: `church-auth`). 토큰 저장소 추상화는 persist가 담당.
- **SSR 안전**: 공개 영역은 서버 컴포넌트라 store 미접근. 회원 영역만 `'use client'`에서 읽는다.
  hydration 가드(`useAuthStore.persist.hasHydrated()` 기반 헬퍼)를 제공해 첫 렌더 불일치를 막는다.
- member 스냅샷은 표시용 — **권한 판단은 `useMe()`(라이브) 신뢰**(가이드 1.5: 토큰/스냅샷은 발급 시점 lag).

### 4.2 authFetch (`authFetch.ts`) — 가이드 1.6 + 모듈 추상화

```ts
let refreshing: Promise<string> | null = null;
```

- **입력 계약(고정)**: `authFetch(path: string, init?: RequestInit)` — `path`는 항상 `/api/...` **path만** 받고,
  내부에서 `apiUrl(path)`로 base를 결합한다. **호출자는 절대 apiUrl을 미리 붙이지 않는다**(이중 결합 방지).
- **반환 계약(고정)**: authFetch는 **항상 `Response`를 반환**한다(HTTP status로 throw하지 않음 — 네트워크 오류만 throw).
  비-2xx를 에러로 바꾸는 책임은 소비측의 `parseJson`(apiError)에 있다.
- 토큰 접근: `useAuthStore.getState().accessToken` / `getState().setAccessToken()` (React 훅 없이 동작).
- 흐름:
  1. access로 요청 → 401 아니면 그대로 반환.
  2. 응답 `errorCode` 확인 → **`INVALID_TOKEN`만** refresh 대상. `AUTHENTICATION_FAILED`는 그대로 반환.
  3. **refreshToken 부재 가드**: `INVALID_TOKEN`이어도 store에 `refreshToken`이 없으면(비로그인·hydration 전)
     refresh를 시도하지 않고 `forceLogout()` 후 원 응답을 반환.
  4. 공유 프로미스 `refreshing: Promise<string>`으로 큐잉 — 동시 401이 refresh를 **1회만** 호출.
     refresh 실패 시 이 프로미스는 **reject**된다(`forceLogout()`은 프로미스 내부에서 1회 수행).
  5. refresh 성공 → `setAccessToken(fresh)` → 원요청을 새 access로 재시도.
  6. **refresh 실패(프로미스 reject) → 각 원요청이 `catch`하여 원 401 `Response`를 그대로 반환**(throw 안 함).
     → 동시 401들이 모두 동일하게 "원 401 Response 반환"으로 수렴(일부 throw·일부 반환 섞임 방지).
- **리다이렉트 책임 분리**: authFetch는 모듈 함수라 router 미사용. 로그인 화면 이동은 토큰 부재를 감지하는
  **소비측 라우트 가드(T14/15/16)** 가 담당한다.

### 4.3 auth API + 세션 액션 (`authApi.ts`)

- `login(phone, password)` → `fetch(apiUrl('/api/auth/login'))` → `parseJson<LoginResponse>` → `setSession(res)`. (공개, 토큰 헤더 없음)
- `signup(req: SignupRequest)` → `fetch(apiUrl('/api/auth/signup'))`(201, 토큰 없음) → 호출측이 이어서 `login` 호출.
- `signOut()` → `authFetch('/api/auth/logout', …)`(헤더 access + 본문 refreshToken, **멱등 204**).
  **로컬 정리 보장**: 서버 호출을 `try`로 감싸고, 성공·실패(401·네트워크·refresh 실패)와 무관하게
  `finally`에서 **항상 store `clear()`** 를 수행한다(refresh token 만료 상태에서 로그아웃을 눌러도 클라이언트가 로그인 상태로 남지 않게).
  React Query 캐시(`['me']`) 제거는 모듈에서 `queryClient`에 직접 닿을 수 없으므로 **호출측 핸들러(T14, `useQueryClient` 보유)가
  `signOut()` 이후 `removeQueries({ queryKey: ['me'] })`** 를 호출한다(또는 `signOut(onCleanup?)` 콜백으로 주입). refreshToken **회전 없음**, 다른 기기 세션 무영향.
- 공개 API(`login`/`signup`)와 refresh 요청은 **모두 `apiUrl()`로 base 결합**(authFetch 미경유분도 누락 없게).
- refresh 로직은 authFetch 내부에만 존재(큐 상태 co-located, 중복 정의 금지).
- login/signup **폼 · UI는 T14**. T05는 호출 함수만 제공.

### 4.4 권한 게이팅 (`permissions.ts` · `useMe.ts`)

- `hasPermission(perm: string, me: MeResponse | undefined): boolean` — 순수 함수, **`me.permissions` 문자열 기준**.
  (필요 시 `hasAnyPermission(perms, me)` 보조.)
- **에러 정책(apiError)**: `parseJson<T>(res)` 는 `res.ok`면 `res.json() as T`, 아니면 본문의
  `{ errorCode, detail }`를 읽어 `throw new ApiError(res.status, errorCode, detail)`. → fetch가 401/403에 throw하지 않는
  문제를 여기서 흡수한다.
- `useMe()` = `useQuery({ queryKey: ['me'], queryFn: () => authFetch('/api/members/me').then(parseJson<MeResponse>), enabled: !!accessToken, retry: false })`
  → **성공 시에만 `MeResponse`가 `data`에 들어간다**. 401/403은 `ApiError`로 throw되어 query `error`로 분기(비-2xx가 성공 데이터로 캐시되지 않음). 비로그인은 `enabled:false`로 호출 안 함.
- `usePermission(perm)` = `hasPermission(perm, useMe().data)` 편의 훅(예: 갤러리 `GALLERY_VIEW` 게이트, T16).
- **401(익명) vs 403(권한부족) 구분**(가이드 2.4): `useMe().error`가 `ApiError`이므로 `error.status`/`error.errorCode`로 분기.
- priority 위계 가드(2.5)는 어드민 영역 → 이번 배치 제외, helper 미작성.

### 4.5 Provider 마운트 (`providers.tsx` · `layout.tsx`)

- `providers.tsx` = `'use client'` 컴포넌트: `QueryClientProvider`로 `children`만 감싼다(Next 16 권장 — Provider는 client component, `{children}`만 깊게 감쌈).
  `QueryClient`는 `useState(() => new QueryClient())`로 인스턴스 1회 생성(SSR/리렌더 안전).
- `layout.tsx`(server component) 수정은 **`{children}`을 `<Providers>{children}</Providers>`로 교체하되, 기존 `<Toaster />`는 그대로 유지**한다.
  현재 `src/app/layout.tsx:28-29`의 `{children}` + `<Toaster />` 구조를 깨지 않는다.

---

## 5. 데이터 흐름

```
[로그인]  login() ─fetch(apiUrl('/api/auth/login'))→ parseJson ─→ setSession ─persist→ localStorage
[보호요청] authFetch('/api/...') ─getState.accessToken→ 요청 ─401 INVALID_TOKEN→ refresh(큐잉) ─→ setAccessToken ─재시도→ Response
[refresh실패] 프로미스 reject ─catch→ forceLogout()(1회) + 원 401 Response 반환 ─→ (소비측 가드가 /login 이동)
[라이브권한] useMe() ─authFetch('/api/members/me').then(parseJson)→ MeResponse ─hasPermission→ show/hide (비-2xx는 ApiError throw→ error)
[로그아웃] signOut() ─authFetch('/api/auth/logout')→ (try) ─finally→ clear() + removeQueries(['me'])
```

---

## 6. 에러 처리 분기 (가이드 1.4 · 2.4)

| errorCode | 의미 | 처리 |
|---|---|---|
| `AUTHENTICATION_FAILED` | 로그인 자격증명 실패 | refresh 안 함, 응답 그대로(로그인 폼이 단일 메시지 표시 — T14) |
| `INVALID_TOKEN` | 토큰 없음·만료·무효·블랙리스트 | access 만료면 refresh → 실패면 forceLogout |
| `ACCESS_DENIED`(403) | 인증됐으나 권한 부족·위계 위반 | 권한 없음 안내(refresh 무관) |

---

## 7. 테스트 (vitest, TDD)

**도입 범위(Next 16 문서 기준 — 실행 가능 상태까지)**:
- devDependency: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`
  (Next 16 번들 문서 `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` 수동 설정 목록 그대로).
- `vitest.config.mts`: `plugins: [tsconfigPaths(), react()]`, `test: { environment: 'jsdom' }`.
  → **jsdom 환경이 localStorage를 제공**하므로 Zustand persist를 별도 mock 없이 테스트 가능.
- `package.json`에 `"test": "vitest"` script 추가.

`authFetch.test.ts` — 전역 `fetch` 모킹으로 검증(각 테스트 전 store·`refreshing` 상태 초기화):

1. 동시 401 N개 → refresh **1회만** 호출(공유 프로미스 큐잉).
2. `AUTHENTICATION_FAILED` → refresh **미시도**(원 응답 반환).
3. refresh 성공 → 원요청이 **새 access로 재시도**.
4. refresh 실패 → `forceLogout` 호출(스토어 비움) **+ 원 401 Response 반환**(throw 아님).
5. (엣지) `INVALID_TOKEN`인데 **refreshToken 없음 → refresh 미호출** + forceLogout + 원 응답 반환.

추가로 `apiError.test.ts` — `parseJson`이 `!res.ok`에서 `ApiError(status·errorCode)`를 throw하는지(401/403) 검증.

RED → GREEN → REFACTOR 순서. 목표 커버리지 80%+(authFetch 분기 전수 + parseJson).

---

## 8. 범위 경계

| 포함 (T05) | 제외 (후속) |
|---|---|
| apiBase · apiError · types · authStore · authFetch · authApi · permissions · useMe · providers | 로그인/가입/재동의 **UI** → T14 |
| `zustand` · `@tanstack/react-query` 설치 | 마이페이지(내정보·약관) → T15 |
| `vitest` · `@vitejs/plugin-react` · `jsdom` · `@testing-library/react` · `@testing-library/dom` · `vite-tsconfig-paths` 설치 + `vitest.config.mts` + `test` script | 갤러리 회원 게이트 → T16 |
| authFetch·apiError 단위 테스트(검수 4종 + 엣지) | `react-hook-form` · `zod` 설치 → T14(폼 도입 시) |
| QueryClientProvider 루트 마운트(Toaster 유지) | priority 위계 가드(2.5) → 어드민 트랙 |

---

## 9. 완료 조건 (이슈 6 · 7 매핑)

- [ ] `authFetch` 구현 — **path-only 입력 + 항상 Response 반환** 계약, 401 분기 · INVALID_TOKEN만 refresh ·
  refreshToken 부재 가드 · 공유 프로미스 큐잉 · 새 access 재시도 · refresh 실패 시 catch→원 401 반환.
- [ ] `apiError`(`ApiError` + `parseJson`) — 비-2xx에서 throw하여 성공 데이터 오염 방지.
- [ ] refresh/logout 연동(회전 없음 · 멱등 204) — **`signOut()`은 서버 결과와 무관하게 `finally`에서 `clear()` + `removeQueries(['me'])` 보장**.
- [ ] Zustand auth store(토큰 + member 스냅샷, persist, hydration 가드).
- [ ] permissions 기반 게이팅 헬퍼(`hasPermission`) + `useMe` 라이브 조회 훅(비-2xx는 error로 분기).
- [ ] vitest **실행 가능 상태**: 위 deps + `vitest.config.mts`(jsdom) + `test` script. 검수 4종 + 엣지 통과, 커버리지 80%+.

---

## 10. 구현 게이트 (AGENTS.md)

- 이 Next.js는 breaking changes 존재 — **코드 작성 전 `node_modules/next/dist/docs/`** 의 관련 문서
  (env 처리 · client component · providers 패턴)를 확인하고 deprecation을 준수한다.
- hex · px 인라인 금지(해당 없음 — 본 이슈는 비시각 인프라).
