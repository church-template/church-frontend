# T05 인증 인프라 — authFetch · 토큰 수명주기 · 401 refresh · Zustand

---

### 📌 작업 개요

회원·어드민 기능 전체의 선행 인프라를 구축했다.
서버는 STATELESS(쿠키·세션 없음)이므로 토큰을 클라이언트가 보관·재전송하는 방식이다.
authFetch의 401 자동 refresh(공유 프로미스 큐잉), Zustand persist 스토어, `permissions` 기반 권한 게이팅 헬퍼,
TanStack Query `useMe` 훅까지를 포함한다. UI는 포함하지 않으며 T14 이후 소비한다.

---

### 🎯 구현 목표

- access 만료 시 동시 다발 요청이 refresh를 1회만 호출(공유 프로미스 큐잉)
- `AUTHENTICATION_FAILED`는 refresh 미시도
- refresh 성공 후 원요청이 새 access로 재시도
- refresh 실패 시 forceLogout + 원 401 Response 반환(throw 안 함)
- authFetch는 항상 Response를 반환하고 에러 변환 책임은 소비측 `parseJson`이 담당
- permissions 문자열 기반 권한 게이팅(roles·직분 아님)
- vitest 실행 가능 상태, 검수 4종 + 엣지 통과, 커버리지 stmt 94.2% / branch 94.7%

---

### ✅ 구현 내용

#### 1. HTTP 기반 유틸 분리

- **파일**: `src/lib/auth/apiBase.ts`
- **변경 내용**: `API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""`, `apiUrl(path)` 결합 헬퍼 제공
- **이유**: 백엔드가 별도 오리진(`:8080`)이므로 base 결합을 호출마다 인라인하지 않고 단일 출처로 관리. 테스트 환경에서는 미설정 시 `""` fallback으로 path만 남아 endsWith 매칭이 동작한다.

- **파일**: `src/lib/auth/apiError.ts`
- **변경 내용**: `ApiError(status, errorCode, detail)` 커스텀 에러 클래스 + `parseJson<T>(res)` 파서
- **이유**: `fetch`는 4xx/5xx에 throw하지 않으므로, 비-2xx 응답을 여기서 `ApiError`로 변환한다. authFetch가 Response를 그대로 반환하는 설계를 유지하면서 소비측이 에러 변환 여부를 결정할 수 있다.

#### 2. 인증 타입 정의

- **파일**: `src/lib/auth/types.ts`
- **변경 내용**: `TokenPair`, `MemberSummary`, `LoginResponse`, `SignupRequest`, `SignupResponse`, `MeResponse` 인터페이스 정의
- **이유**: `api-docs.json` OpenAPI를 단일 진실로 삼아 타입을 선언. `tokens`는 항상 중첩(`LoginResponse.tokens: TokenPair`). `MeResponse.permissions`는 권한 게이팅 기준.

#### 3. Zustand auth store

- **파일**: `src/lib/auth/authStore.ts`
- **변경 내용**: `useAuthStore`(persist 미들웨어, 키 `church-auth`) + `setSession` / `setAccessToken` / `forceLogout` / `clear` 액션 + `hasHydrated()` 가드
- **이유**: 토큰의 단일 출처. `forceLogout`(시스템 강제)과 `clear`(사용자 명시 로그아웃)를 의미 분리해 향후 세션 만료 안내 등 분기를 위한 호출 맥락을 추적한다. member 스냅샷은 표시용이며 **권한 판단은 `useMe()`(라이브)가 담당**한다.

#### 4. authFetch — 401 분기·refresh 큐잉·재시도

- **파일**: `src/lib/auth/authFetch.ts`
- **변경 내용**: 모듈 스코프 `refreshing: Promise<string> | null`으로 공유 프로미스 큐잉 구현
- **이유**: 이슈 검수 4종의 핵심 계약을 모두 이 파일에서 구현한다.

핵심 흐름:
1. `useAuthStore.getState().accessToken`으로 Bearer 요청.
2. 401이 아니면 즉시 반환(정상 경로).
3. 401이면 응답 본문 `errorCode` 확인 — `INVALID_TOKEN`만 refresh 대상, `AUTHENTICATION_FAILED`는 그대로 반환.
4. `refreshToken` 부재 가드: store에 refreshToken이 없으면 `forceLogout()` 후 원 응답 반환(refresh 미호출).
5. `refreshing ??= refresh().finally(...)` — 동시 401들이 하나의 프로미스를 공유해 refresh를 1회만 호출.
6. refresh 성공: `setAccessToken(fresh)` 후 원요청 재시도.
7. refresh 실패: `catch`에서 원 401 Response를 반환(throw 아님). `forceLogout`은 `refresh()` 내부에서 1회만 수행되므로 중복 호출이 없다.

**특이사항**:
- authFetch는 리다이렉트 책임을 갖지 않는다. 로그인 화면 이동은 소비측 라우트 가드(T14/15/16)가 담당한다.
- `path`는 항상 `/api/...` path만 받는다(호출자가 `apiUrl`을 미리 붙이지 않는다 — 이중 결합 방지).

#### 5. 인증 API 함수

- **파일**: `src/lib/auth/authApi.ts`
- **변경 내용**: `login` / `signup` / `signOut` 구현
- **이유**:
  - `login`: 공개 API(토큰 헤더 없음) → `parseJson` 성공 시 `setSession`으로 스토어 반영.
  - `signup`: 201 반환, 토큰 없음 → 호출측이 이어서 `login`을 호출하는 패턴.
  - `signOut`: 서버 호출 결과(성공·실패·네트워크 오류)와 무관하게 `finally`에서 반드시 `clear()`를 수행한다(멱등 로그아웃 보장). React Query 캐시 제거는 `queryClient`에 접근 가능한 호출측 핸들러(T14)가 담당한다.

#### 6. 권한 게이팅 헬퍼

- **파일**: `src/lib/auth/permissions.ts`
- **변경 내용**: `hasPermission(perm, me)` / `hasAnyPermission(perms, me)` 순수 함수
- **이유**: 게이팅 기준은 `MeResponse.permissions` 문자열(roles·직분 아님, 접두사 없음). 순수 함수라 테스트와 재사용이 쉽다. `me`가 `undefined`이면 `false`(비로그인·로딩 중).

#### 7. useMe — 라이브 권한 조회 훅

- **파일**: `src/lib/auth/useMe.ts`
- **변경 내용**: `useMe()` TanStack Query 훅 + `usePermission(perm)` 편의 훅
- **이유**: `enabled: !!accessToken`으로 비로그인 시 호출 안 함. `retry: false`로 authFetch가 이미 refresh·재시도를 처리하므로 Query 레벨 재시도가 이중으로 동작하지 않도록 차단. 비-2xx는 `parseJson`이 `ApiError`로 throw하여 query `error` 분기(성공 데이터로 캐시되지 않음). `usePermission`은 `hasPermission(perm, useMe().data)` 래퍼.

#### 8. QueryClientProvider 마운트

- **파일**: `src/app/providers.tsx` (신규)
- **변경 내용**: `'use client'` 컴포넌트로 `QueryClientProvider` 제공. `useState(() => new QueryClient())`로 인스턴스를 1회만 생성(SSR·리렌더 안전).
- **이유**: Next.js Server Component인 `layout.tsx`에서 Provider를 직접 쓸 수 없으므로 분리.

- **파일**: `src/app/layout.tsx`
- **변경 내용**: `{children}` → `<Providers>{children}</Providers>` 로 교체. `<Toaster />`는 Providers 외부로 유지.
- **이유**: TanStack Query를 앱 전체에 공급. Toaster는 회원 영역 외에도 필요하므로 Providers 밖에 둔다.

---

### 🔧 주요 변경사항 상세

#### 에러 분기 정책

| errorCode | 의미 | authFetch 처리 |
|---|---|---|
| `INVALID_TOKEN` | 토큰 없음·만료·무효·블랙리스트 | refresh 시도 → 실패 시 forceLogout |
| `AUTHENTICATION_FAILED` | 로그인 자격증명 실패 | refresh 안 함, 원 응답 그대로 반환 |
| `ACCESS_DENIED` (403) | 인증됐으나 권한 부족 | authFetch 미처리, parseJson→ApiError throw |

#### 의존 방향 (순환 없음)

```
apiBase   ← authFetch, authApi
apiError  ← authApi, useMe
authStore ← authFetch, authApi, useMe
types     ← 모든 모듈
permissions ← useMe
```

---

### 📦 의존성 변경

**프로덕션 추가**
- `zustand: ^5.0.14` — 인증 상태 스토어(persist 미들웨어 포함)
- `@tanstack/react-query: ^5.101.0` — 회원 영역 서버 상태 관리(useMe)

**개발 의존성 추가**
- `vitest: ^4.1.8` — 테스트 러너
- `@vitejs/plugin-react: ^6.0.2` — JSX 변환(vitest 환경)
- `vite-tsconfig-paths: ^6.1.1` — `@/*` 경로 별칭 해석
- `jsdom: ^29.1.1` — 브라우저 환경 시뮬레이션(localStorage 포함)
- `@testing-library/react: ^16.3.2` — 훅 렌더링 테스트
- `@testing-library/dom: ^10.4.1` — DOM 쿼리 유틸
- `@vitest/coverage-v8: ^4.1.8` — 커버리지 수집

**스크립트 추가**
- `"test": "vitest run"` — CI용 단회 실행
- `"test:watch": "vitest"` — 개발용 감시 모드

---

### 🧪 테스트 및 검증

#### 테스트 파일 구성 (7개, 27 tests)

| 파일 | 테스트 항목 |
|---|---|
| `apiBase.test.ts` | apiUrl base 결합, 이중 결합 방지 |
| `apiError.test.ts` | `res.ok`이면 반환, 403 ApiError throw, 빈 본문 401 throw |
| `authStore.test.ts` | setSession, setAccessToken(access만 교체), forceLogout |
| `authFetch.test.ts` | 검수 4종 + 엣지(refreshToken 부재) |
| `authApi.test.ts` | login 성공·401, signup 성공·400, signOut 서버성공·네트워크오류·비-2xx |
| `permissions.test.ts` | hasPermission(있음·없음·undefined), hasAnyPermission |
| `useMe.test.tsx` | 성공 시 data 반환, 403 ApiError error 분기 |

#### vitest.config.mts

`environment: 'jsdom'`으로 설정해 jsdom이 localStorage를 제공하므로 Zustand persist를 별도 mock 없이 테스트한다.
`tsconfigPaths()` 플러그인으로 `@/*` 경로 별칭을 해석한다.

#### 검수 4종 결과

1. 동시 401 3개 → `fetch` mock 호출 중 refresh 엔드포인트 1회만 확인 — **통과**
2. `AUTHENTICATION_FAILED` → refresh 미호출 확인 — **통과**
3. refresh 성공 → 재시도 요청의 Authorization이 `Bearer new` — **통과**
4. refresh 실패 → `forceLogout`, 반환값 `status 401`(throw 아님) — **통과**
5. 엣지: refreshToken 없음 → refresh 미호출, `forceLogout` 확인 — **통과**

#### 커버리지

- Statement: **94.2%** (80% 게이트 상회)
- Branch: **94.7%** (80% 게이트 상회)
- `pnpm build` / `pnpm lint` 통과

---

### 📌 참고사항

- `signOut` 이후 React Query 캐시 제거(`removeQueries({ queryKey: ['me'] })`)는 T14에서 `useQueryClient`를 보유한 컴포넌트 핸들러가 수행한다. T05 모듈 함수는 queryClient에 직접 닿을 수 없다.
- `hasHydrated()` 헬퍼는 SSR 첫 렌더 hydration 불일치를 방지하기 위해 회원 영역 소비측에서 사용한다.
- 토큰 만료값 하드코딩 금지 — 만료 감지는 서버의 401 `errorCode`로만 한다.
- priority 위계 가드(가이드 2.5)는 어드민 영역 범위로 본 이슈에서 제외한다.
- 로그인·가입·재동의 UI는 T14에서 구현한다.
