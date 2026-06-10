# [T5] 인증 인프라 (authFetch · 토큰 · 401 refresh · Zustand)

**라벨:** `auth`
**선행:** T1
**참조:** 가이드 1장(1.1~1.6)·2장·11장

---

## 목적
토큰 수명주기·401 자동 refresh·인증 상태 스토어를 구축한다. 회원·어드민 기능 전체의 선행. 서버는 STATELESS(쿠키·세션 없음) — 토큰은 클라이언트가 보관·재전송.

---

## 1. 토큰 모델 (1.2·1.3)
- 로그인 응답 = `{ tokens: { accessToken, refreshToken }, member, requiresAgreement }`. **tokens는 항상 중첩.**
- access 기본 1h / refresh 기본 14d — **만료값 하드코딩 금지**(401로 감지, 0.3).
- 다중 기기 동시 로그인 허용(refresh가 jti 단위 독립). 한 기기 로그아웃이 타 기기 무영향.
- `POST /api/auth/refresh` → `{ tokens }`만. **access만 새로 발급**, refreshToken은 보낸 값 echo(회전 없음). 서버가 refresh 시 DB 권한 재조회.

## 2. authFetch (1.6 — 그대로 사용, 동시요청 큐잉)
```ts
let refreshing: Promise<string> | null = null;

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const access = () => localStorage.getItem("accessToken")!;
  const withAuth = (token: string): RequestInit => ({
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  let res = await fetch(url, withAuth(access()));
  if (res.status !== 401) return res;

  // INVALID_TOKEN만 refresh 대상. AUTHENTICATION_FAILED는 그대로 반환.
  const { errorCode } = await res.clone().json().catch(() => ({}));
  if (errorCode !== "INVALID_TOKEN") return res;

  // 동시 401들이 refresh를 한 번만 호출하도록 공유 프로미스로 큐잉
  refreshing ??= (async () => {
    const r = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }),
    });
    if (!r.ok) { logout(); throw new Error("refresh failed"); } // 401 INVALID_TOKEN
    const { tokens } = await r.json();
    localStorage.setItem("accessToken", tokens.accessToken);   // access만 갱신됨
    return tokens.accessToken as string;
  })().finally(() => { refreshing = null; });

  const fresh = await refreshing;
  return fetch(url, withAuth(fresh)); // 원요청 재시도
}
```
> 토큰 저장소(localStorage)는 프로젝트 정책에 맞게 추상화 가능. 핵심은 **INVALID_TOKEN만 refresh, 공유 프로미스 큐잉, access만 갱신.**

## 3. 401 분기 (1.4 — status만으론 구분 불가)
| errorCode | 의미 | 처리 |
|---|---|---|
| `AUTHENTICATION_FAILED` | 로그인 자격증명 실패 | 로그인 폼 단일 오류(refresh 안 함) |
| `INVALID_TOKEN` | 토큰 없음·만료·무효·블랙리스트 | access 만료면 refresh → 실패면 로그아웃 |

## 4. 로그아웃 (1.3)
- `POST /api/auth/logout`(인증, 204): 헤더 access + 본문 refreshToken 동봉. 현재 access 블랙리스트 + 본인 refresh revoke. **멱등**(무효/타인 refresh여도 204).

## 5. Zustand auth store
- [ ] 상태: `accessToken`·`refreshToken`·`member`(MemberSummary 스냅샷, **표시용**).
- [ ] member 스냅샷은 표시용 — **권한 판단은 `GET /api/members/me` 신뢰**(1.5: 토큰/스냅샷은 발급시점 lag).
- [ ] 게이팅은 **`permissions` 문자열 기준**(직분·roles 아님, 2.1). 접두사 없음(`SERMON_WRITE`).
- [ ] 401(익명) vs 403(권한부족) 구분(2.4).
- [ ] 전화번호는 서버가 숫자만 정규화(11장) — 표시/입력은 자유, 비교는 정규화 기준.

## 6. 완료 조건
- [ ] `authFetch` 구현(401 분기·큐잉·재시도)
- [ ] refresh/logout 연동(회전 없음·멱등)
- [ ] Zustand auth store(토큰 + member 스냅샷)
- [ ] permissions 기반 게이팅 헬퍼 + `/members/me` 라이브 조회 훅

## 7. 검수
- [ ] access 만료 시 동시 다발 요청이 refresh를 1회만 호출(공유 프로미스).
- [ ] `AUTHENTICATION_FAILED`는 refresh 미시도.
- [ ] refresh 성공 후 원요청이 새 access로 재시도.
- [ ] refresh 실패 시 로그아웃 → 로그인 화면.
