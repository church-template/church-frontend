# [T14] 인증 UI (로그인 · 가입 · 재동의)

**라벨:** `auth`
**선행:** T5(인증 인프라), T7(앱 셸)
**참조:** 가이드 1.1·1.2·9장·4.2, 11장, 15.1

---

## 목적
로그인·회원가입·약관 재동의 화면을 react-hook-form + zod로 구현한다. 서버 검증 오류(`errors[]`)를 필드에 매핑한다.

---

## 1. 로그인 — `/login`
- `POST /api/auth/login` (전화번호 + 비밀번호).
- 응답 `{ tokens, member, requiresAgreement }` → T5 스토어 저장.
- **실패는 단일 메시지**: `AUTHENTICATION_FAILED`는 전화번호 미존재·비번 불일치를 동일 처리(1.2/4.3) → "전화번호 또는 비밀번호가 올바르지 않습니다." **가입 여부 비노출.**
- 성공 후: `requiresAgreement === true`면 **재동의 페이지로**(§3), 아니면 홈/이전 경로.
- 전화번호는 하이픈 넣어 보내도 됨(서버가 숫자만 정규화, 11장).

## 2. 회원가입 — `/signup`
- `POST /api/auth/signup` (공개, **201**). 응답 `SignupResponse`(uuid·name·phone·roles) — **토큰 없음.**
- 가입 직후 로그인 아님 → **별도 `login` 호출 필요**(1.1). (가입 성공 → 자동 로그인 또는 로그인 유도)
- zod 사전검증(1.1):
  - `password` ≥ 8자 (특수문자·대소문자 강제 없음, 고령 배려 12장)
  - `termsAgreed` && `privacyAgreed` **둘 다 true**(아니면 서버 400)
  - `email` 선택(형식 검증), `phone` 필수
- 서버 오류 매핑: `errors[]`(4.2) → `setError(field, ...)`. `phone` 중복 = `409 DUPLICATE_RESOURCE` → 전화 필드에 중복 안내.
- USER 역할(권한 0)만 자동 부여 — 갤러리 등은 관리자가 MEMBER 부여 후(1.1).

## 3. 재동의 — `/agreements`
- `GET /api/members/me/agreements` (현재 상태) / `PATCH /api/members/me/agreements` (제출).
- 제출은 **둘 다 true여야 성립**, 하나라도 false면 `400 INVALID_INPUT_VALUE`. 성공 시 `agreedAt` 갱신 → 다음 로그인부터 `requiresAgreement=false`(9장).
- 진입: 로그인 응답 `requiresAgreement=true`(관리자 일괄 리셋 후 등).

## 4. 폼 스택 (15.1)
- react-hook-form + zod. 검증 메시지는 입력 아래 caption, 색 semantic 토큰(텍스트만, T3).

## 5. 완료 조건
- [ ] `/login`: 전화+비번, 단일 오류 메시지, requiresAgreement 분기
- [ ] `/signup`: zod 사전검증(pw≥8·약관2종·email선택), 201 토큰없음→login, errors[] 매핑, phone 409
- [ ] `/agreements`: GET/PATCH, 둘다 true 강제
- [ ] RHF+zod, 서버 errors[]→setError

## 6. 검수
- [ ] 없는 번호/틀린 비번이 동일 메시지로 표시(가입여부 비노출).
- [ ] 약관 2종 미동의 시 클라이언트 제출 차단.
- [ ] 가입 성공 후 자동 로그인 또는 로그인 유도(가입 응답 토큰 없음 전제).
- [ ] 로그인 시 requiresAgreement=true면 재동의로 이동.
