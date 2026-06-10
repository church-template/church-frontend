# [T15] 마이페이지 (내 정보 · 약관)

**라벨:** `page`
**선행:** T5(인증 인프라), T7(앱 셸)
**참조:** 가이드 1.5·2장·9장, 15.1, OpenAPI `/api/members/me`

---

## 목적
회원 본인의 정보 조회/수정과 약관 상태를 보여준다. **회원 영역 = 클라이언트 + TanStack Query + authFetch.**

---

## 1. 내 정보 — `GET /api/members/me` (인증 필요)
- 필드: `uuid`·`name`·`phone`·`email`·`position`·`roles`·`permissions`·`maxPriority`·약관상태.
- **라이브 값(1.5)**: 토큰/스냅샷은 발급시점 lag → 권한 기반 UI·프로필 표시는 **토큰이 아니라 `/members/me`를 신뢰.**
- 익명 호출은 401 → authFetch 인터셉터(T5)가 refresh 선처리.

## 2. 수정 — `PATCH /api/members/me`
- 본인 정보(이름·이메일 등) 수정. 검증 오류 errors[]→필드 매핑(T6/4.2).

## 3. 약관 (9장)
- 약관 상태 표시(termsAgreed/privacyAgreed/agreedAt). 재동의 필요 시 `/agreements`(T14) 링크.

## 4. 데이터 경계 (15.1)
- 클라이언트 컴포넌트 + **TanStack Query**. `queryFn`은 반드시 **`authFetch`(T5)** 경유.
- 게이팅은 `permissions` 문자열 기준(2.1) — `/members/me`의 permissions로 메뉴/버튼 show/hide.

## 5. 완료 조건
- [ ] `/me`: GET /members/me 표시(uuid·이름·전화·이메일·직분·역할·permissions·약관)
- [ ] PATCH /members/me 수정 + errors[] 매핑
- [ ] 약관 상태 + 재동의 링크
- [ ] TanStack Query + authFetch, permissions 기반 UI

## 6. 검수
- [ ] 권한/직분 변경 후에도 lag 없이 최신값 표시(`/members/me` 사용, 토큰 아님).
- [ ] 401 시 인터셉터가 refresh 선처리(T5).
