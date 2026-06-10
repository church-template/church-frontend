# 교회 홈페이지 프론트엔드 연동·동작 가이드

이 문서는 백엔드를 프론트에서 다룰 때 필요한 3종 문서 중 "얇은 동작 레이어"다. 필드별 스키마·요청/응답 구조·상태코드의 단일 진실은 `api-docs.json`(OpenAPI)이고, 왜 이렇게 설계됐는지는 `docs/church-backend-spec.md`(설계 청사진)에 있다. 이 문서는 그 둘이 담지 못하는 **횡단 동작·흐름·규칙·UI 게이팅·엣지케이스**만 다룬다. 필드·상태코드를 나열하지 않고, "이 응답을 받았을 때 프론트가 무엇을 해야 하는가"에 집중한다. 예외적으로 13~14장은 **메인 화면(히어로 포함)의 구현 명세**를 담는다 — 메인은 데이터 연동과 연출이 결합된 유일한 화면이라 한곳에 모았다.

## 0. 시작하기

### 0.1 3종 문서 역할

| 문서 | 역할 | 무엇을 볼 때 |
|---|---|---|
| `api-docs.json` (OpenAPI) | **스키마 단일 진실** — 경로·요청/응답 필드·상태코드 | "이 엔드포인트가 정확히 어떤 필드를 받고 주는가" |
| `docs/church-backend-spec.md` | **설계 청사진** — 도메인 모델·의사결정 배경 | "왜 이렇게 설계됐는가" |
| **이 문서** | **횡단 동작·UI 게이팅** — 흐름·규칙·엣지케이스 | "응답을 받았을 때 프론트가 무엇을 해야 하는가" |

원칙: 필드명·상태코드가 헷갈리면 OpenAPI를 먼저 보라. 이 문서는 "OpenAPI에 없는 동작 규칙"을 메운다. 노트에 근거 없는 세부는 본문에서 "OpenAPI 참조"로 위임한다.

### 0.2 baseURL · 인증 헤더

- 모든 API는 `/api/**` 프리픽스. Swagger UI는 `/docs/swagger-ui.html`, 스펙은 `/v3/api-docs`(둘 다 공개).
- 보호 요청은 모두 `Authorization: Bearer <accessToken>` 헤더 필요. 서버는 **STATELESS**(쿠키·세션 없음) — 토큰은 클라이언트가 보관·재전송한다.
- **CORS**: 서버는 단일 origin + `allowCredentials(true)`로 기동된다. 프론트 도메인이 서버 `CORS_ALLOWED_ORIGIN`과 정확히 일치해야 한다(`*` 설정 시 서버가 기동 실패).

### 0.3 프론트가 알아야 할 env

프론트는 토큰 만료값·교회 고유값을 **하드코딩하지 말 것**. 서버 env가 출처이며, 프론트가 직접 의존하는 값은 다음 하나뿐.

| 키 | 용도 | 프론트 사용처 |
|---|---|---|
| `FILE_BASE_URL` | 미디어 서빙 베이스 | `media:{id}` → 실제 URL 치환. 다만 본 백엔드는 공개 서빙 경로 `GET /api/media/{id}`를 직접 제공하므로, 프론트는 보통 `media:{id}` → `/api/media/{id}`로 치환한다(5장) |
| `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | 토큰 수명(1h / 14d) | **프론트가 하드코딩 금지** — 만료는 401 응답으로 감지하고 refresh로 대응(1장) |

> 교회 이름·도메인 같은 고유값은 프론트 빌드 시 주입한다(12장).

## 1. 인증·세션 수명주기

### 1.1 가입 → 승인 모델 (이메일 인증 없음)

이 백엔드에는 **SMTP·이메일 인증이 없다.** 신원 확인은 관리자가 `MEMBER` 역할을 부여하는 것으로 대체된다.

1. `POST /api/auth/signup`(공개, **201**) — 응답에 **토큰 없음**. `SignupResponse`(uuid·name·phone·roles)만. 가입 직후 로그인 상태가 아니므로 **프론트가 별도로 `login`을 호출**해야 한다.
2. 가입 시 자동으로 `USER` 역할(권한 0)만 부여된다. 갤러리 등 회원 전용 기능은 아직 차단.
3. 관리자가 `MEMBER` 역할을 부여하면(9장 아님, 7장 회원 관리) **교인 승인** 완료 → `GALLERY_VIEW` 획득.

**가입 폼에서 프론트가 미리 막아야 매끄러운 검증**: password ≥ 8자, `termsAgreed`·`privacyAgreed` **둘 다 true**(아니면 400), email은 선택(형식 검증), phone 중복은 서버가 **409 `DUPLICATE_RESOURCE`**.

### 1.2 로그인 응답 활용

`POST /api/auth/login`(전화번호 + 비밀번호) 응답 = `{ tokens, member, requiresAgreement }`.

- `tokens` = `{ accessToken, refreshToken }` (**항상 중첩**).
- `member` = `MemberSummary`(uuid·name·phone·position·roles) — **표시용**. 권한 판단엔 쓰지 말 것(2장).
- `requiresAgreement` = boolean. `true`면 **재동의 플로우로** 보낸다(9장).
- **로그인 실패는 전화번호 존재 여부와 무관하게 항상 동일한 `401 AUTHENTICATION_FAILED`.** "없는 번호" vs "비번 오류"를 구분 표시하면 안 된다 → 단일 메시지("전화번호 또는 비밀번호가 올바르지 않습니다").

### 1.3 토큰 저장·재발급·로그아웃

- Access(기본 1h) / Refresh(기본 14d)를 클라이언트가 보관.
- **다중 기기 동시 로그인 허용** — 로그인마다 refresh가 jti 단위로 독립 저장된다. 한 기기 로그아웃이 다른 기기를 끊지 않는다.
- `POST /api/auth/refresh` → `{ tokens }`만 반환(`member`·`requiresAgreement` 없음). **access만 새로 발급**, `refreshToken`은 보낸 값을 그대로 echo(회전 없음). 서버는 refresh 시 **DB에서 권한을 재조회**해 새 access에 반영한다.
- refresh 실패(만료·revoke·위변조·탈퇴) → **`401 INVALID_TOKEN`** → 로그인 화면으로.
- `POST /api/auth/logout`(인증 필요, **204**): 헤더에 access + 본문에 refreshToken을 함께 보낸다. 현재 access를 즉시 블랙리스트, 본인 refresh를 revoke. **멱등** — 무효/타인 refresh여도 조용히 204. 다른 기기 세션엔 영향 없음.

### 1.4 401 처리 분기 (status만으로 구분 불가)

401이 두 종류라 `errorCode`로 분기해야 한다.

| errorCode | 의미 | 프론트 처리 |
|---|---|---|
| `AUTHENTICATION_FAILED` | 로그인 자격증명 실패 | 로그인 폼에 단일 오류 메시지 |
| `INVALID_TOKEN` | 토큰 없음·만료·무효·블랙리스트 | **access 만료면 refresh 시도 → 실패면 로그아웃** |

### 1.5 토큰값 vs `/api/members/me` (lag)

JWT의 `name`·`position`·`permissions`·`maxPriority`는 **발급 시점 스냅샷**이다.

- **권한 변경**: 다음 refresh 때 반영(refresh가 DB 재조회). access 만료(1h) 전까지 낡은 권한 유지 가능.
- **이름/직분/프로필 변경**: 다음 refresh까지 낡은 채로.
- **라이브 값이 필요한 화면**(권한 기반 UI, 프로필 표시)은 토큰이 아니라 **`GET /api/members/me`(로그인 필요)**를 신뢰하라. DB 최신값(uuid·이름·전화·이메일·직분·역할·permissions·maxPriority·약관상태)을 준다.

### 1.6 스니펫: 401 refresh 인터셉터(동시요청 큐잉)

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

  // 동시 401들이 refresh를 한 번만 호출하도록 큐잉(공유 프로미스)
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

## 2. 인가·권한 → UI 게이팅

### 2.1 두 축은 절대 결합하지 말 것

**직분(position)**과 **역할/권한(role/permission)**은 독립 축이다. 높은 직분(목사·장로)이라도 **권한은 0**. 메뉴·버튼 게이팅을 직분으로 하면 서버와 어긋난다. 게이팅은 **항상 `permissions`(권한 문자열)** 기준으로 한다.

- JWT는 `roles`가 아니라 펼쳐진 **`permissions`** + `maxPriority`를 담는다. 프론트도 roles가 아니라 permissions로 show/hide를 결정해야 서버 `@PreAuthorize("hasAuthority(...)")`와 일치한다.
- 권한 이름은 **접두사 없음**(`SERMON_WRITE`, `GALLERY_VIEW` 그대로).

### 2.2 권한 ↔ 화면기능 매핑표 (실제 `@PreAuthorize` 기반)

| 권한 | 이 권한이 켜는 화면 기능 | 주요 경로 |
|---|---|---|
| `SERMON_WRITE` | 설교 작성/수정/삭제 버튼 | `POST/PUT/PATCH/DELETE /api/admin/sermons` |
| `NOTICE_WRITE` | 공지 작성/수정/삭제 | `/api/admin/notices` |
| `EVENT_WRITE` | 일정 작성/수정/삭제 | `/api/admin/events` |
| `DEPT_WRITE` | 부서 작성/수정/삭제 | `/api/admin/departments` |
| `GALLERY_WRITE` | 앨범·사진 생성/수정/삭제 | `/api/admin/gallery/**` |
| `GALLERY_VIEW` | **갤러리 조회 자체**(회원 전용) | `/api/gallery/**` |
| `BULLETIN_WRITE` | 주보 업로드/수정/삭제 | `/api/admin/bulletins` |
| `MEDIA_MANAGE` | 미디어 라이브러리(업로드/목록/삭제) | `/api/admin/media` |
| `TAG_MANAGE` | 태그 추가/수정/삭제 | `/api/admin/tags` |
| `POSITION_MANAGE` | 직분 추가/수정/삭제 | `/api/admin/positions` |
| `MEMBER_MANAGE` | 회원 조회·수정·비번초기화, 약관 일괄리셋 | `/api/members`(조회), `/api/admin/members/{uuid}`, `/api/admin/agreements/reset` |
| `ROLE_MANAGE` | 역할/권한 관리, 회원 역할 부여/회수 | `/api/admin/roles`, `/api/admin/permissions`, `/api/admin/members/{uuid}/roles` |

> **주의 — 경로만 보면 헷갈리는 곳**: 회원 조회 `GET /api/members`·`GET /api/members/{uuid}`는 `/api/admin/**`가 아니지만 **`MEMBER_MANAGE`로 메서드 보안**이 걸려 있다(경로 규칙상 공개로 보여도 실제 차단). 반대로 `GET /api/positions`, `GET /api/tags`, `GET /api/bulletins`, `GET /api/main`, `GET /api/media/{id}`는 **공개**다.

### 2.3 경로 인가 3분법

| 경로 | 규칙 | UI 함의 |
|---|---|---|
| `/api/admin/**` | **로그인만**(경로) + **메서드 `@PreAuthorize`**(권한) 2단 방어 | 로그인했어도 권한 없으면 403; 토큰 없이 호출 시 401 `INVALID_TOKEN` |
| `/api/gallery/**` | **`GALLERY_VIEW` 필요**(회원 전용, 비공개) | 비로그인·`USER`만 보유 사용자는 차단 |
| 그 외 `/api/**` 읽기 | 공개 | 비로그인 노출 가능 |

**갤러리 회원전용 차단 UX**: 갤러리 진입 시 토큰/`/members/me`에 `GALLERY_VIEW`가 없으면, 호출하지 말고 "교인 승인 후 이용 가능" 안내를 띄운다. 그대로 호출하면 비로그인은 401 `INVALID_TOKEN`, 로그인+권한없음은 403 `ACCESS_DENIED`.

### 2.4 인가 거부 → 401 vs 403

`@PreAuthorize` 거부는 인증 상태에 따라 갈린다.

- **익명/미인증** → `401 INVALID_TOKEN` (로그인/토큰 갱신 필요)
- **인증됐으나 권한 부족·위계 위반** → `403 ACCESS_DENIED`

### 2.5 priority 위계 → 버튼 비활성

역할 관련 작업은 위계 가드를 받는다. 프론트는 가능하면 **버튼을 미리 비활성**해 403 왕복을 줄인다.

| 가드 | 규칙 | 위반 시 |
|---|---|---|
| 위계(escalation) | 대상 역할 priority가 **내 `maxPriority` 초과**면 차단(같은 레벨은 허용) | 403 |
| 시스템 역할 | `isSystem=true`(`SUPER_ADMIN`/`ADMIN`/`USER`) 수정·삭제 불가 | 403 |
| 자기 보호 | **자기 자신**의 역할 부여/회수 불가 | 403 |
| 마지막 SUPER_ADMIN | 활성 SUPER_ADMIN이 1명이면 그 역할 회수·강등·삭제 불가 | 403 |

> 위계 위반은 **모두 `errorCode=ACCESS_DENIED`로 동일**하다. 구체 사유는 한글 `detail` 텍스트에만 담긴다(코드로 구분 불가) → 상세 사유 표시는 `detail`을 그대로 보여준다.

> 민감 화면(권한 토글 UI)의 라이브 판단은 토큰이 아니라 `GET /api/members/me`를 읽어라(1.5).

## 3. 공통 응답 규약

### 3.1 목록 봉투 `{ content, page }`

모든 페이지네이션 목록은 Spring Data `PagedModel` 직렬화(`VIA_DTO`)로 다음 형태다. SB3식 평면 키(`pageable`, `sort`, 최상위 `totalElements`)는 **나오지 않는다.**

```json
{
  "content": [ /* 카드 객체 배열 */ ],
  "page": { "size": 10, "number": 0, "totalElements": 42, "totalPages": 5 }
}
```

`page` 하위 키는 정확히 `size`·`number`(0-base 현재 페이지)·`totalElements`·`totalPages` 4개뿐.

### 3.2 목록 카드엔 본문 없음

목록과 상세는 **다른 DTO**다. 카드에는 본문(`content`/`description`) 필드 자체가 없고, `version`도 없다. 본문·`version`은 **상세 단건 조회(`GET .../{id}`)에서만** 온다. 별도 `summary`(잘린 요약) 필드는 없다 — 카드는 메타, 본문은 상세.

### 3.3 홈 맛보기 vs 전용 페이지 vs `/api/main`

- 같은 목록을 **`size`만 달리** 호출해 홈 미리보기(`size=3`)와 전용 페이지(`size=10`)를 구분한다.
- 또는 `GET /api/main`(공개)으로 **최신 설교 3 + 공지 3 + 다가오는 일정 5**를 한 번에 받는다(10장).

### 3.4 페이징·정렬·필터 표준

- 공통: `?page=0&size=10&sort=createdAt,desc`. `page`는 0-base. 기본값은 도메인별 `@PageableDefault`(정확한 기본 정렬 필드는 10장 표 / OpenAPI 참조).
- 표준 필터 파라미터(존재 여부는 도메인별, 10장):
  - 태그: **`tagId`**(단수). 매칭 글 없으면 빈 페이지.
  - 일정 달력: `year`+`month` **또는** `startDate`+`endDate`(둘 다 `yyyy-MM-dd`, **쌍으로**).
  - 미디어·설교 날짜 범위: `from`+`to`(상한 포함).

### 3.5 토큰 봉투

`login`/`refresh` 응답의 토큰은 항상 `tokens` 객체로 중첩(`accessToken`·`refreshToken`). 1장 참조.

## 4. 에러 처리(RFC 7807 → UI)

### 4.1 봉투 구조

모든 실패는 단일 봉투로 직렬화되며 **`@JsonInclude(NON_NULL)`** — 값 없는 필드는 키째 빠진다. 보안 필터 단계(401/403)도 동일한 봉투다.

- 항상: `errorCode`(영문 UPPER_SNAKE, **분기 키**)·`title`(한글, 표시용)·`status`·`detail`·`instance`(요청 경로).
- 조건부: `errors`(검증 실패 `INVALID_INPUT_VALUE`일 때만), `references`(`MEDIA_IN_USE`일 때만). **둘은 함께 오지 않는다.**

> **분기는 반드시 `errorCode`로.** `title`/`detail`은 표시용(한글)이라 분기 키로 쓰면 안 된다. `status`만으로도 불가 — 409가 5종, 401이 2종이다. `errors`는 항상 옵셔널 처리(타입 변환·본문 파싱 실패 400엔 `errors`가 없다).

### 4.2 errorCode → UI 처리표

| status | errorCode | UI 처리 |
|---|---|---|
| 400 | `INVALID_INPUT_VALUE` | `errors[]`(있으면) 필드별 인라인 표시; 없으면 `detail` 토스트 |
| 401 | `AUTHENTICATION_FAILED` | 로그인 폼 단일 오류(가입 여부 비노출) |
| 401 | `INVALID_TOKEN` | refresh 시도 → 실패 시 로그인 화면 리다이렉트 |
| 403 | `ACCESS_DENIED` | 권한 부족/위계 위반 — `detail` 표시, 버튼 숨김 점검 |
| 404 | `RESOURCE_NOT_FOUND` | "삭제됐거나 없는 항목" 안내, 목록 복귀 |
| 409 | `MEDIA_IN_USE` | `references` 링크 노출, 삭제 차단(6장) |
| 409 | `OPTIMISTIC_LOCK_CONFLICT` | 최신본 재조회 → 재편집 안내(8장) |
| 409 | `DUPLICATE_RESOURCE` | 해당 입력 필드(전화 등)에 중복 안내 |
| 409 | `ROLE_IN_USE` | "회원에게 할당된 역할은 삭제 불가" 안내 |
| 409 | `DEPARTMENT_HAS_CHILDREN` | "하위 부서 먼저 정리" 안내 |
| 413 | `FILE_SIZE_EXCEEDED` | 파일 크기 초과(400 아님) — 한도 안내·재선택 |
| 500 | `FILE_STORAGE_ERROR` | 파일 처리 오류 — 재시도 |
| 500 | `INTERNAL_ERROR` | 일반 오류 토스트 |

### 4.3 케이스별 동작 메모

- **401 가입여부 비노출**: `AUTHENTICATION_FAILED`는 전화번호 미존재·비번 불일치를 동일 응답으로 처리. 두 경우를 구분 표시하지 말 것.
- **`MEDIA_IN_USE`**: `references`(각 `{type,id,title}`) 동봉, `detail`은 항상 `"이 미디어를 참조하는 콘텐츠가 있어 삭제할 수 없습니다."` → 참조 목록을 링크로 보여주고 삭제 막기(6장).
- **`OPTIMISTIC_LOCK_CONFLICT`**: 추가 payload 없음. "다른 사용자가 먼저 수정함" → 최신본 재조회 후 재편집(8장).

### 4.4 스니펫: 전역 errorCode 분기

```ts
type ApiError = {
  errorCode: string; title: string; status: number; detail: string;
  errors?: { field: string; reason: string }[];
  references?: { type: string; id: number; title: string }[];
};

async function handleApiError(res: Response): Promise<never> {
  const e: ApiError = await res.json();
  switch (e.errorCode) {
    case "AUTHENTICATION_FAILED":
      throw new FormError("전화번호 또는 비밀번호가 올바르지 않습니다."); // 가입여부 비노출
    case "INVALID_TOKEN":
      redirectToLogin(); break;                       // refresh는 인터셉터에서 선처리(1장)
    case "ACCESS_DENIED":
      toast(e.detail); break;                          // 위계 사유는 detail에만
    case "INVALID_INPUT_VALUE":
      if (e.errors?.length) showFieldErrors(e.errors); // 필드 인라인
      else toast(e.detail);
      break;
    case "MEDIA_IN_USE":
      showMediaReferences(e.references ?? []); break;  // 삭제 차단 + 참조 링크
    case "OPTIMISTIC_LOCK_CONFLICT":
      toast("다른 사용자가 먼저 수정했습니다. 최신 내용을 다시 불러옵니다.");
      await reloadAndReedit(); break;
    case "DUPLICATE_RESOURCE":
      markDuplicateField(); break;
    default:
      toast(e.title);                                  // ROLE_IN_USE / 413 / 500 등
  }
  throw e;
}
```

## 5. 콘텐츠 렌더링 파이프라인

### 5.1 raw 마크다운 — 서버는 변환하지 않음

본문 필드(`sermon.content`, `notice.content`, `event.description`, `department.description`, 갤러리 앨범 `description`)는 **raw 마크다운 TEXT**로 저장된다. 서버는 HTML 변환도 sanitize도 하지 않는다 → **마크다운 → HTML 변환 + 새니타이즈가 전적으로 프론트 책임.** raw HTML은 기본 비허용으로 처리하라(XSS 방지).

### 5.2 `media:{id}` → URL 치환

본문 속 이미지·PDF는 URL이 아니라 **`media:{id}` 리터럴**로 참조된다(`![alt](media:42)`, `[제목](media:42)`). 렌더 전에 실제 서빙 URL `GET /api/media/{id}`(공개)로 치환한다. 이 모델 덕에 본문이 교회별 베이스 URL과 무관하게 동일하다.

- `GET /api/media/{id}`는 파일 바이트를 반환하며 응답에 `X-Content-Type-Options: nosniff`가 붙는다(MIME 스니핑 기반 저장형 XSS 차단). 관리용 메타 조회(`/api/admin/media/{id}`)와 다르다(6장).
- **치환 순서**: 마크다운 파싱 후 sanitize까지 끝낸 다음 `media:{id}`를 URL로 바꾸거나, sanitize 단계에서 허용 스킴/도메인을 통제하라. 어느 쪽이든 **새니타이즈는 반드시 거친다.**

### 5.3 스니펫: `media:{id}` → URL 치환 + DOMPurify 새니타이즈

```ts
import { marked } from "marked";
import DOMPurify from "dompurify";

// 경계 안전: media:42 뒤에 숫자가 이어지면 매칭 안 함(420/421 오탐 방지) — 서버 추적 규약과 동일
const MEDIA_REF = /media:(\d+)(?!\d)/g;

function renderMarkdown(raw: string): string {
  // 1) media:{id} → 공개 서빙 URL
  const withUrls = raw.replace(MEDIA_REF, (_, id) => `/api/media/${id}`);
  // 2) 마크다운 → HTML
  const html = marked.parse(withUrls, { async: false }) as string;
  // 3) 새니타이즈(raw HTML/스크립트 제거) — 서버가 안 하므로 필수
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
```

## 6. 미디어 라이브러리 워크플로

### 6.1 업로드-먼저-참조

이미지·PDF는 하나의 `media` 풀에 산다. **먼저 업로드해 `media.id`를 얻고**, 본문에서 `media:{id}`로 참조하거나(설교·공지·이벤트·부서·앨범 설명), 갤러리·주보가 FK로 재사용한다. 바이너리를 도메인 테이블에 따로 저장하는 경로는 없다.

| 동작 | 경로 | 권한 | 반환 |
|---|---|---|---|
| 업로드 | `POST /api/admin/media` (`multipart`, 필드 `file`) | `MEDIA_MANAGE` | **201** + 메타 |
| 목록 | `GET /api/admin/media` | `MEDIA_MANAGE` | 페이지(기본 `size=20`, `createdAt,desc`) |
| 메타 조회 | `GET /api/admin/media/{id}` | `MEDIA_MANAGE` | 메타(바이트 아님) |
| 참조 조회 | `GET /api/admin/media/{id}/references` | `MEDIA_MANAGE` | `{ mediaId, inUse, references[] }` |
| 삭제 | `DELETE /api/admin/media/{id}` | `MEDIA_MANAGE` | **204** 또는 409 |
| **공개 서빙** | `GET /api/media/{id}` | **공개** | 파일 바이트 |

### 6.2 업로드 규칙

- 허용 형식 **5종만**: JPEG/PNG/GIF/WEBP/PDF. **매직바이트로 형식 확정** — 확장자·Content-Type 헤더는 신뢰하지 않는다. 미허용은 디스크에 쓰지 않고 거부(`400 INVALID_INPUT_VALUE`).
- 크기 초과(기본 10MB) → **`413 FILE_SIZE_EXCEEDED`**(400 아님).
- 목록 필터: `type=image|pdf`(생략=전체, 그 외 값 400), `from`/`to`(업로드일, `yyyy-MM-dd`, **상한 포함**).

### 6.3 삭제 = 차단형(blocking)

1. 삭제 전 **`GET .../{id}/references`로 사전 조회** 권장 — `{ mediaId, inUse, references[] }`. 정상 200(에러 봉투 아님).
2. `DELETE` 시 참조가 **1건이라도** 있으면 **`409 MEDIA_IN_USE`** + `references` 동봉. 프론트는 "이 콘텐츠들에서 사용 중" 안내 + 항목(`type`/`title`) 링크 노출, **삭제 버튼은 막고 편집으로 유도**.
3. 참조가 0이 되면 그때 실제 삭제(파일+레코드).

`references[]`의 `type` 실제 값: `sermon`·`notice`·`event`·`department`·`gallery_album`·`gallery_photo`·`bulletin`. (`gallery_photo`는 소속 앨범의 id·title로 표면화.)

### 6.4 갤러리·주보 제거 = 연결 해제

앨범에서 사진 제거, 앨범 삭제, 주보 삭제는 **연결 해제(un-link)일 뿐 원본은 라이브러리에 보존**된다. 원본 실제 삭제는 위 차단형 미디어 삭제가 유일한 경로다. soft-deleted 콘텐츠는 참조로 집계되지 않는다.

## 7. 작성자 표시 정책

- 응답의 작성자 필드명은 **`author`**(타입 `String`). 회원 id나 객체가 아니라 **이미 해석된 표시 이름 문자열**이 내려온다.
- 표시 기준은 **`updated_by`(마지막 편집자)**, `created_by`(원작성자)가 아니다. 글이 수정되면 `author`가 그 시점 편집자 이름으로 바뀐다(탈퇴 작성자의 글이 편집되면 자가 치유).
- 마스킹은 **서버가 적용해 내려준다** — 프론트는 그대로 표기하면 된다(클라이언트에서 재판단 불필요):
  - 해당 회원이 탈퇴(soft-delete) → **`"(탈퇴한 사용자)"`**
  - `updated_by`가 null이거나 회원 행 없음 → **`"(알 수 없음)"`**
- `author`는 **설교·공지·갤러리·주보**에만 있고, **일정·부서엔 필드 자체가 없다**(설계상 미사용, 10장).

## 8. 동시 수정(낙관적 락)

### 8.1 흐름

설교·공지·일정·부서·갤러리 앨범·주보는 모두 `@Version` 낙관락이다.

1. 상세(`GET .../{id}`)에서 받은 **`version`을 보관**(목록 카드엔 없음).
2. 수정(`PUT`/`PATCH`) 요청 본문에 그 **`version`을 `@NotNull` 필수로 동봉**.
3. 충돌 시 **`409 OPTIMISTIC_LOCK_CONFLICT`**(추가 payload 없음) → 최신본 재조회 후 재편집 안내.

### 8.2 응답 `version` 재사용

수정 성공 응답의 `version`은 **증가 후(post-increment) 값**이다(서버가 `flush`로 즉시 반영). 연속 편집 시 직전 응답의 `version`을 다음 요청에 그대로 재사용하면 된다 — **별도 재조회 불필요.**

> 엣지: **태그만 바꾸는 수정은 `version`이 오르지 않는다**(엔티티 본 필드가 안 바뀜 — 일정·갤러리 앨범). 단 `PATCH`로 본문/태그를 안 바꿔도 도메인에 따라 version이 오를 수 있다(설교·공지). 어느 쪽이든 **응답에 실린 `version`을 신뢰**하면 안전하다.

### 8.3 스니펫: 409 낙관락 재시도

```ts
async function saveWithRetry(id: number, edit: (cur: Detail) => UpdateReq) {
  let detail = await getDetail(id);           // 최신본(version 포함)
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await authFetch(`/api/admin/sermons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...edit(detail), version: detail.version }), // version 필수 동봉
    });
    if (res.ok) return res.json();             // 응답 version = post-increment, 그대로 재사용 가능
    const e = await res.json();
    if (e.errorCode !== "OPTIMISTIC_LOCK_CONFLICT") throw e;
    // 충돌: 최신본 재조회 → 사용자에게 변경 알리고 재편집 유도
    detail = await getDetail(id);
    if (!await confirmReedit(detail)) throw e; // 사용자가 병합/포기 결정
  }
  throw new Error("재시도 후에도 충돌");
}
```

## 9. 약관 동의 사이클

- 가입 필수 2종: `termsAgreed`·`privacyAgreed` **둘 다 true**여야 가입 성립(아니면 400).
- 로그인 응답 `requiresAgreement = !(termsAgreed && privacyAgreed)`. **true면 재동의 페이지로** 보낸다.
- 본인 약관: `GET /api/members/me/agreements`(현재 상태) / `PATCH /api/members/me/agreements`(재동의 제출). 제출은 **둘 다 true여야 성립**, 하나라도 false면 `400 INVALID_INPUT_VALUE`. 성공 시 `agreedAt` 갱신 → 다음 로그인부터 `requiresAgreement=false`.
- **관리자 일괄 리셋**: `POST /api/admin/agreements/reset`(`MEMBER_MANAGE`, **200 본문 없음**). body `target`은 **정확히 `"terms"` 또는 `"privacy"`** 하나(그 외 400, 한 번에 한 항목). 해당 플래그를 전 회원 false로 → 영향 회원은 다음 로그인 시 `requiresAgreement=true` → 재동의 유도.

## 10. 도메인별 연동 노트

각 도메인 1~2행. 정확한 필드·상태코드는 OpenAPI 참조.

| 도메인 | 기본 정렬 | 필터 | 카드 표시 항목 | tagIds | 공개 여부 | 본문(마크다운) |
|---|---|---|---|---|---|---|
| **auth** | — | — | — | — | signup/login/refresh 공개, logout 인증 | — |
| **member(me)** | — | — | uuid·name·phone·position·roles·permissions·maxPriority·약관 | — | 본인 인증 필요(익명 401) | — |
| **member(admin)** | — | — | 목록/상세 + `approved`(MEMBER 보유) | — | 조회·수정 `MEMBER_MANAGE`, 역할부여/회수 `ROLE_MANAGE` | — |
| **position** | `sortOrder,asc`(비페이징 평배열) | 없음 | id·name(한글)·sortOrder | — | **목록 공개**, 쓰기 `POSITION_MANAGE` | — |
| **role** | `priority,desc`(비페이징 평배열) | 없음 | id·name·priority·isSystem·description·permissions | — | `ROLE_MANAGE` | — |
| **permission** | `name,asc`(비페이징 평배열) | 없음 | id·name(영문)·description(한글) | — | `ROLE_MANAGE` | — |
| **tag** | `name,asc`(비페이징 평배열) | 없음 | id·name(한글) | — | **목록 공개**, 쓰기 `TAG_MANAGE` | — |
| **sermon** | `preachedAt,desc` | `preacher`·`series`(완전일치)·`from`/`to`·`q`·`tagId` | id·title·preacher·series·scripture·preachedAt·viewCount·tags·author | O(create/update/patch) | 조회 공개, 쓰기 `SERMON_WRITE` | `content` (+videoUrl·audioUrl 외부링크) |
| **notice** | `isPinned,desc` + `createdAt,desc` | `q`(**제목만**)·`tagId` | id·title·isPinned·viewCount·createdAt·tags·author | O | 조회 공개, 쓰기 `NOTICE_WRITE` | `content` |
| **event** | `startAt,asc` | `year`+`month` **또는** `startDate`+`endDate`(쌍 필수)·`tagId` | id·title·location·startAt·endAt·allDay·tags (**author·viewCount 없음**) | O(태그만 수정 시 version 불변) | 조회 공개, 쓰기 `EVENT_WRITE` | `description` |
| **department** | `sortOrder,id`(**비페이징 평배열**) | 없음 | id·name·leader·parentId·sortOrder (**author·tags·viewCount 없음**) | **X**(태그 없음) | 조회 공개, 쓰기 `DEPT_WRITE` | `description` |
| **main** | 고정(설교3·공지3·일정5) | 없음 | 세 도메인 카드 메타(본문 제외) | — | **공개**(Redis 캐시, 콘텐츠 CUD 시 무효화) | — |
| **media** | `createdAt,desc`(admin) | `type`·`from`/`to` | 메타 | — | 관리 `MEDIA_MANAGE`, **서빙 `/api/media/{id}` 공개** | — |
| **gallery** | `createdAt,desc` | `tagId` | id·title·thumbnailMediaId(첫 사진, 없으면 null)·photoCount·createdAt·tags·author | O(앨범, 태그만 수정 시 version 불변) | **`GALLERY_VIEW` 회원전용**, 쓰기 `GALLERY_WRITE` | 앨범 `description` |
| **bulletin** | `serviceDate,desc` | 없음(OpenAPI 참조) | id·title·serviceDate·mediaId·author | — | **조회 공개**, 쓰기 `BULLETIN_WRITE` | 없음(PDF FK만, `GET /api/media/{mediaId}`로 열람) |

도메인 특이 동작 메모:
- **일정 달력**: 범위 파라미터는 **반드시 쌍**(한쪽만 보내면 400). 둘 다 보내면 year/month 우선. 겹침은 `end_at` 배타 경계, `end_at=null` 점 이벤트는 `start_at` 기준 포함.
- **부서**: 비페이징 평배열 → 프론트가 `parentId`로 트리 조립. 하위 부서 있으면 삭제 `409 DEPARTMENT_HAS_CHILDREN`. 루트화는 `PUT parentId=null`만(PATCH의 `parentId=null`은 미변경).
- **공지 검색**: `q`는 **제목만** 매칭(Swagger 설명은 "제목/내용"이라 적혀 있으나 코드는 제목만 — 소스가 사실).
- **조회수**: 설교·공지만 존재. 상세 조회 시 +1(부수효과).
- **갤러리 사진 추가**: `POST .../{id}/photos`(multipart) — `files`(신규 업로드) **와/또는** `mediaIds`(기존 재사용) 혼합 가능. 반환은 갱신된 앨범 상세 전체.
- **주보 업로드/수정**: `file` **XOR** `mediaId`(정확히 하나, 수정은 둘 다 생략 시 PDF 미변경). PDF 매직바이트 검증, 한도 초과 413.

## 11. 식별자·언어 규칙

- **코드용 키 = 영문**: permission `name`(`SERMON_WRITE`), role `name`(`ADMIN`/`MEMBER`/`USER`). UI는 **영문 name으로 분기**한다.
- **표시용 라벨 = 한글**: role `description`, position `name`, tag `name`. UI는 **한글 라벨을 보여준다**.
- **외부 식별자**:
  - **회원 = `uuid`** (경로 변수, JWT `sub`). BIGINT `id`는 외부 비노출.
  - **콘텐츠(설교·공지·…) = `id`** (경로 변수). 단, 역할 회수만 `roleId`(Long)를 path에 추가로 받는다.
- **전화번호**: 서버가 **숫자만 정규화**(`01012345678`)해 저장·중복검사한다. 프론트는 하이픈 등을 넣어 보내도 되지만, 중복/조회 결과는 정규화 기준이다.

## 12. 백엔드에 없는 것

- **교회 소개·연혁·비전·오시는 길** 등 거의 안 바뀌는 상수 콘텐츠는 **API에 없다** — 프론트에 하드코딩한다(프론트가 교회별이므로).
- **교회 고유값**(이름·도메인·로고 등)은 **프론트 빌드 시 주입**한다(0.3).
- **SMTP·이메일 인증 없음** — 신원 확인은 `MEMBER` 역할 부여로 대체(1.1).
- **복잡한 비밀번호 정책 없음** — 최소 길이(~8자)만, 특수문자·대소문자 강제 없음(고령 사용자 배려).

## 13. 메인 페이지 데이터·구성

### 13.1 데이터 소스 — `GET /api/main` 하나로

- **공개**(인증 불필요). 응답 `MainResponse` = `{ sermons, notices, upcomingEvents }` — **최신 설교 3 · 공지 3 · 다가오는 일정 5**의 카드 메타만(본문 없음, 3.2 원칙 그대로).
- 서버가 **Redis 캐시(`main`)**로 응답하고, 설교·공지·일정의 모든 CUD에서 캐시를 무효화한다. 프론트는 신선도를 직접 관리할 필요가 없다.
- **Next.js 권장 패턴**: 메인은 공개 콘텐츠 + 토큰 불필요 → **서버 컴포넌트에서 fetch**한다. 서버 캐시가 이미 있으므로 `next: { revalidate: 60 }` 정도의 짧은 ISR이면 충분하다.

```ts
// app/page.tsx (서버 컴포넌트)
const res = await fetch(`${API_BASE}/api/main`, { next: { revalidate: 60 } });
const main: MainResponse = await res.json();
```

- 개별 목록을 `size=3`으로 따로 부르는 방식(3.3)과의 선택: **메인은 `/api/main`을 쓴다.** 왕복 1회 + 서버 캐시 적중이 항상 유리하다. `size` 분리 호출은 전용 목록 페이지(설교/공지/일정 페이지)에서만 쓴다.

### 13.2 섹션별 카드 매핑

| 메인 섹션 | 출처 | 카드 표시 | 클릭 이동 |
|---|---|---|---|
| 최신 설교 (3) | `sermons[]` | `title` · `preacher` · `preachedAt`(datetime 토큰) · `series`/`scripture`(있으면 보조 표기) · `tags` | `/sermons/{id}` |
| 공지 (3) | `notices[]` | `title` · `createdAt` · `isPinned`이면 고정 배지 | `/notices/{id}` |
| 다가오는 일정 (5) | `upcomingEvents[]` | `title` · `startAt`~`endAt` · `location` · `allDay`면 시간 생략 | `/events` (캘린더) 또는 `/events/{id}` |

- 정렬은 서버가 보장한다(설교 `preachedAt desc`, 공지 고정글 우선, 일정 `startAt asc`) — 프론트 재정렬 금지.
- **일정 표기 엣지**(10장과 동일): `endAt=null`은 점(단일 시점) 이벤트 — "시작~끝"이 아니라 시작 시각만 표기. `allDay=true`면 날짜만 표기.
- `viewCount`는 메인 카드에서 표기하지 않는 것을 권장한다(상세·목록 페이지 전용). `author`도 메인에서는 생략 가능.
- **빈 배열 처리**: 섹션을 통째로 숨기지 말고 "등록된 설교가 없습니다" 류의 플레이스홀더를 둔다(레이아웃 점프 방지). 세 배열이 동시에 빈 경우는 초기 구축 상태뿐이다.

### 13.3 메인에서 API에 없는 것들 (12장 원칙의 적용)

히어로 타이틀·카피·미디어, 예배 시간 안내, 교회 소개·오시는 길 요약은 **API에 없다** — 12장 원칙대로 **프론트 빌드 시 주입**한다.

- **히어로 미디어 소스는 두 가지를 허용**한다:
  - (a) 프론트 정적 에셋(`/public/hero.mp4` 등) — 가장 단순. 교체는 배포로.
  - (b) **미디어 라이브러리 업로드 후 공개 서빙 URL** `GET /api/media/{id}` 고정 참조 — 배포 없이 파일을 바꾸고 싶을 때. 단, 미디어는 불변(새 업로드 = 새 id)이므로 **id를 env로 주입**하고, 교체 시 env만 갱신한다. 공개 서빙 응답은 타입 메타를 주지 않으므로 **타입(video/image)도 env가 명시**해야 한다.
- env 예시 (빌드 주입):

```env
NEXT_PUBLIC_HERO_MEDIA_TYPE=video        # video | image
NEXT_PUBLIC_HERO_MEDIA_SRC=/api/media/7  # 또는 /hero.mp4 (정적 에셋)
NEXT_PUBLIC_HERO_POSTER=/api/media/8     # video일 때 강력 권장 (14.5 폴백)
NEXT_PUBLIC_HERO_TITLE=지역과 함께하는 ○○교회
NEXT_PUBLIC_HERO_CAPTION=말씀과 삶이 만나는 곳\n우리 동네의 교회
```

### 13.4 페이지 구성 (권장 순서)

1. **CrossHero** (14A) — 십자가 열쇠구멍 스크롤 히어로 (메인 전용)
2. **예배 시간 안내** — 빌드 주입 상수, `schedule-card` 그리드
3. **최신 설교 3** — `sermons[]`
4. **공지 3** — `notices[]`
5. **다가오는 일정 5** — `upcomingEvents[]`
6. **새가족 CTA 밴드** — "처음 오셨나요?" + 오시는 길/새가족 안내 링크
7. 푸터

디자인 토큰·컴포넌트 스타일은 `DESIGN.md`를 따른다. 특히 컨테이너(최대 1200px, 좌우 24px)는 히어로(14A/14B)와 본문 섹션이 **하나의 규칙을 공유**해야 한다(14.3).

## 14. 메인 히어로(CrossHero) 구현 명세

메인 페이지의 히어로다. **십자가 열쇠구멍 리빌** — 풀스크린 배경 영상/사진 위에 어두운 덮개가 깔리고, 덮개에 뚫린 십자가 구멍이 스크롤에 따라 커지며 배경이 화면을 가득 채운다. "닫힌 어둠 사이로 십자가를 통해 시야가 열린다"는 연출이다. 부서 소개 페이지는 다른 연출(14B 카드 확장)을 쓴다.

> **왜 이 방식인가(설계 근거)**: 십자가를 "화면을 채우는 큰 도형"으로 쓰면 세로로 긴 모바일에서 비례가 깨진다(가로 팔이 처져 보임). 열쇠구멍 방식은 십자가를 **화면 중앙의 작은 상징**으로 시작해 확대만 하므로, 화면 비율과 무관하게 비례가 유지된다. 이 모바일 안정성이 방식 선택의 핵심 이유다.

### 14A.1 효과 개요

1. **시작**: 풀스크린 배경(영상/사진) 위에 어두운 덮개(딥 네이비). 덮개에 십자가 구멍이 뚫려 그 너머 배경만 보인다 — 화면 중앙의 작은 십자가.
2. **진행**: 스크롤에 따라 십자가 구멍이 `ease-in` 가속으로 확대된다. 세로 기둥이 화면 폭을 넘는 순간 덮개가 완전히 밀려나고 배경이 화면 전체를 덮는다.
3. **완료 후**: 배경 위로 오버레이 카피가 아래에서 떠오르며 페이드인.
4. 섹션을 다 통과하면 sticky가 풀리고 다음 섹션(13.4의 ②)으로 이어진다.

중앙 헤드라인 텍스트·하단 스크롤 힌트는 두지 않는다(십자가 상징만으로 첫 화면을 구성).

### 14A.2 핵심 구현 원리

**(1) 레이어 순서 — 배경이 아래, 덮개가 위.** z-index 1 = 풀스크린 배경 미디어(`position:absolute; inset:0`), z-index 2 = SVG 덮개(어두운 `<rect>` + 십자가 `<mask>`), z-index 3 = 오버레이 카피. 14B(카드 확장)와 정반대 — 거기선 미디어를 잘랐지만 여기선 **덮개에 구멍을 뚫는다**.

**(2) SVG 마스크 + transform: scale.** 덮개 `<rect>`에 `mask`를 적용하고, 마스크 안의 십자가 `<path>`(검은색=구멍)를 `transform="translate(cx cy) scale(s)"`로 키운다. width/height가 아니라 transform이므로 GPU 합성으로 처리돼 부드럽다.

**(3) 목표 배율 동적 계산.** 십자가 세로 기둥이 화면을 완전히 덮는 배율 = `max(뷰포트너비 ÷ 기둥폭, 뷰포트높이 ÷ 100) × 1.1`(여유 10%). 화면 크기·비율이 바뀌어도 `resize`에서 재계산하므로 끝 상태(완전 커버)가 항상 보장된다.

**(4) ease-in 가속 곡선.** 선형이 아니라 `t³`. 처음엔 천천히 열리다 끝에서 "십자가 속으로 빨려드는" 가속감을 준다 — 카드 확장(14B, 선형)과 의도적으로 다른 질감.

**(5) 스크롤 구간(segment) 분할.**

| 구간 | 대상 | 동작 |
|---|---|---|
| p = 0.00 ~ 0.72 | 십자가 구멍 scale | startScale → targetScale (ease-in) |
| p = 0.78 ~ 0.95 | 오버레이 카피 | opacity(0→1) + translateY(+30→0) |

### 14A.3 확정 십자가 비율 (변경 시 디자인 검토 필요)

십자가는 로컬 좌표계(세로 높이 100, 중심 원점)에서 정의한다. **아래 값이 확정값이다.**

| 파라미터 | 값 | 의미 |
|---|---|---|
| 세로 기둥 폭 | 16 | 기둥 좌우 폭 |
| 가로 팔 전체 길이 | 64 | 팔 좌우 끝 거리 |
| 가로 팔 두께 | 16 | 팔 상하 두께 |
| 교차점 높이 | 32% | 머리 상단(-50)에서 아래로 32 → y = -18 |
| 시작 크기 | 38% | 십자가 높이가 화면 짧은 변에서 차지하는 비율 |
| 덮개 어둡기 | 0.85 | 덮개 `rgba(10,15,31,0.85)` |

확정 path (위 값으로 산출, 닫힌 라틴 십자가):

```
M -8 -50 H 8 V -26 H 32 V -10 H 8 V 50 H -8 V -10 H -32 V -26 H -8 Z
```

빌드 함수로 두면 추후 비율 조정이 쉽다(아래 참조 구현의 `buildCrossPath`). 덮개 색 `#0a0f1f`는 DESIGN.md `surface-dark` 계열의 더 짙은 네이비 — 토큰화하려면 `cover-dark`로 추가한다.

### 14A.4 참조 구현 (App Router 클라이언트 컴포넌트)

`'use client'`. 로직은 검증된 데모 기준이며 변경하지 말 것. 미디어 주입은 14B와 동일한 `HeroMedia` 타입(13.3 env)을 재사용한다.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './CrossHero.module.css';
import type { HeroMedia } from './DeptHero'; // 14B와 공유

interface CrossHeroProps {
  caption: React.ReactNode;   // 풀스크린 후 등장 카피
  media: HeroMedia;           // 배경(십자가 너머의 세계)
}

// 확정 비율 (14A.3)
const CROSS = { vbw: 16, haw: 64, hbh: 16, cp: 32 };
const START_PCT = 38;   // 시작 크기 %
const DIM = 0.85;       // 덮개 어둡기

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const segment = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));
const easeIn = (t: number) => t * t * t;

function buildCrossPath() {
  const v = CROSS.vbw / 2, h = CROSS.haw / 2;
  const cY = -50 + CROSS.cp;
  const t1 = cY - CROSS.hbh / 2, t2 = cY + CROSS.hbh / 2;
  return `M ${-v} -50 H ${v} V ${t1} H ${h} V ${t2} H ${v} V 50 H ${-v} V ${t2} H ${-h} V ${t1} H ${-v} Z`;
}

export default function CrossHero({ caption, media }: CrossHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const hero = heroRef.current!, sticky = stickyRef.current!;
    const hole = holeRef.current!, captionEl = captionRef.current!;

    let startScale = 1, targetScale = 10, cx = 0, cy = 0, ticking = false;

    const measure = () => {
      const vw = sticky.clientWidth, vh = sticky.clientHeight;
      cx = vw / 2; cy = vh / 2;
      startScale = (Math.min(vw, vh) * (START_PCT / 100)) / 100;
      targetScale = Math.max(vw / CROSS.vbw, vh / 100) * 1.1;
      update();
    };

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - hero.offsetTop) / total);

      const pe = easeIn(segment(p, 0, 0.72));
      const s = lerp(startScale, targetScale, pe);
      hole.setAttribute('transform', `translate(${cx} ${cy}) scale(${s})`);

      const pc = segment(p, 0.78, 0.95);
      captionEl.style.opacity = String(pc);
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, pc)}px))`;

      ticking = false;
    };

    const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        <div className={styles.bg}>
          {media.type === 'video' && !videoFailed ? (
            <video autoPlay muted loop playsInline preload="metadata"
              src={media.src} poster={media.poster}
              onError={() => setVideoFailed(true)} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.type === 'video' ? (media.poster ?? '') : media.src}
              alt={media.type === 'image' ? (media.alt ?? '') : ''} />
          )}
        </div>

        <svg className={styles.cover} aria-hidden="true">
          <defs>
            <mask id="crossMask">
              <rect width="100%" height="100%" fill="white" />
              <path ref={holeRef} d={buildCrossPath()} fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%"
            fill={`rgba(10,15,31,${DIM})`} mask="url(#crossMask)" />
        </svg>

        <p ref={captionRef} className={styles.caption}>{caption}</p>
      </div>
    </section>
  );
}
```

```css
/* CrossHero.module.css */
.hero { position: relative; height: 320vh; }
.sticky { position: sticky; top: 0; height: 100vh; height: 100dvh; overflow: hidden; }

.bg { position: absolute; inset: 0; z-index: 1; }
.bg video, .bg img { width: 100%; height: 100%; object-fit: cover; display: block; }

.cover { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; }

.caption {
  position: absolute; top: 50%; left: 0; right: 0; z-index: 3;
  text-align: center;
  transform: translateY(calc(-50% + 30px));
  color: #fff; font-size: clamp(26px, 4vw, 48px);
  font-weight: 500; line-height: 1.5; letter-spacing: -0.02em;  /* DESIGN.md display 계열 */
  margin: 0; opacity: 0;
  will-change: transform, opacity;
  text-shadow: 0 2px 24px rgba(0,0,0,0.4);
}

@media (prefers-reduced-motion: reduce) {
  .hero { height: auto; }
  .sticky { position: static; height: 80vh; }
  .cover { display: none; }          /* 덮개 제거 → 배경 그대로 노출 */
  .caption { position: absolute; opacity: 1; bottom: 10%; top: auto; transform: none; }
}
```

### 14A.5 미디어·폴백·접근성

- 배경 미디어는 14B와 **동일한 `HeroMedia` 타입과 폴백 규칙**(영상 onError→poster, 모바일 자동재생은 muted+playsinline). 13.3 env로 주입(`NEXT_PUBLIC_HERO_*`).
- 배경 위에 어두운 덮개가 있으므로 영상이 살짝 어두워도 무방 — 오히려 십자가 빛 대비가 산다.
- 네비게이션은 `mix-blend-mode: difference` 또는 흰색 고정으로 어두운 덮개 위에서 가독성을 확보한다(DESIGN.md `top-nav-transparent`).
- **prefers-reduced-motion**: 덮개를 제거해 배경을 그대로 보이고 카피를 정적 배치. JS 미등록.
- iOS 주소창: `100vh` 뒤 `100dvh` 중복 선언(반영됨).
- SEO: 카피는 opacity 0이어도 DOM 존재. 십자가는 장식이므로 `aria-hidden`.

### 14A.6 구현 금지 사항

- 십자가 구멍을 width/height로 키우지 말 것 — transform: scale만(reflow 방지).
- 시작 크기·목표 배율을 상수 px로 하드코딩하지 말 것 — `measure()`에서 뷰포트 기준 계산.
- scroll 이벤트에서 rAF 스로틀 없이 DOM 갱신 금지.
- 배경과 덮개에 **서로 다른 장면**을 1차 범위에서 쓰지 말 것(영상 2개 필요 — 향후 확장. 지금은 단색 덮개).
- 중앙 헤드라인 텍스트·하단 스크롤 힌트를 추가하지 말 것(확정 디자인).
- 14A.3 확정 비율을 임의 변경하지 말 것 — 변경 시 디자인 재검토.

### 14A.7 검수 기준

- [ ] 첫 화면: 어두운 덮개 + 화면 중앙의 십자가 구멍으로 배경이 비친다(중앙 텍스트·스크롤 힌트 없음).
- [ ] 스크롤 시 십자가가 ease-in 가속으로 커지고, 끝에서 배경이 화면을 100% 덮는다(덮개 완전 소멸).
- [ ] 풀스크린 후에야 카피가 페이드인된다.
- [ ] **모바일(세로 화면)에서 십자가 비례가 데스크톱과 동일하게 유지된다**(교차점이 처지지 않음) — 이 방식 채택의 핵심 검수 항목.
- [ ] 창 비율을 바꿔도 끝에서 항상 배경이 완전히 덮인다(목표 배율 재계산).
- [ ] 영상 URL을 깨뜨리면 poster로 폴백되고 효과는 정상 동작.
- [ ] `/api/media/{id}` 소스로도 정적 에셋과 동일하게 동작.
- [ ] prefers-reduced-motion에서 덮개 없이 배경+카피로 폴백.
- [ ] 스크롤 중 reflow 없이 부드럽다(DevTools Performance).

## 14B. 부서 소개 히어로(DeptHero) 구현 명세

부서 소개 페이지(청년부·장년부·교회학교 등)의 히어로다. 당근식 카드 확장 연출 — 미디어 카드가 스크롤에 따라 풀스크린으로 펼쳐진다. **메인이 아닌 부서 페이지 전용**이며, 메인 히어로는 14A(십자가 열쇠구멍)를 쓴다.

> **부서별 히어로 미디어 출처**: 13.3의 메인 env와 별개로, 부서 페이지는 부서 식별자별 정적 에셋(`/public/dept/{slug}.jpg`)을 기본으로 한다. 부서 API 응답에 대표 이미지 필드가 없으므로(12장 원칙), 부서↔이미지 매핑은 프론트 상수 테이블로 둔다. `DeptHero`는 메인의 `CrossHero`와 `HeroMedia` 타입을 공유하므로 주입 방식만 다르고 컴포넌트 계약은 동일하다.


### 14B.1 효과 개요

스크롤 한 번의 진행 동안 세 가지가 시차를 두고 일어난다.

1. **시작**: 헤드라인 아래에 미디어가 "카드"처럼 보인다 — 좌우 컨테이너 여백, **위쪽 모서리만 둥글게(24px)**, **하단은 여백 없이 뷰포트 바닥까지 이어짐**(화면 아래로 잘려나가는 인상).
2. **진행**: 헤드라인은 위로 밀려나며 페이드아웃, 미디어는 위·좌·우 여백이 0이 될 때까지 펼쳐져 **화면 전체(100vw×100vh)를 덮는다**. 모서리도 0으로.
3. **완료 후**: 미디어 위로 오버레이 카피가 아래에서 떠오르며 페이드인.
4. 섹션을 다 통과하면 고정(sticky)이 풀리고 다음 섹션(13.4의 ②)으로 이어진다.

### 14B.2 핵심 구현 원리 (반드시 이 방식으로)

**(1) clip-path 방식 — 카드를 키우는 게 아니라 가려진 풀스크린 미디어를 드러낸다.**
미디어는 처음부터 뷰포트 전체 크기(`position: absolute; inset: 0`)로 깔고, `clip-path: inset(...)`으로 카드 영역만 보이게 잘라둔 뒤 스크롤 진행도에 따라 inset을 0까지 보간한다. width/height 애니메이션은 매 프레임 reflow를 유발하므로 금지(14.7).

**(2) 자리표시자(placeholder) 측정 — 시작 inset을 하드코딩하지 않는다.**
카드의 시작 사각형은 일반 레이아웃 흐름 안의 보이지 않는 placeholder가 결정하고, JS가 `getBoundingClientRect()`로 측정해 시작 inset(px)으로 쓴다. 좌우 여백이 헤드라인과 픽셀 단위로 자동 정렬되고, 레이아웃을 바꿔도 애니메이션 코드 수정이 없다.

**(3) 스크롤 구간(segment) 분할 — 한 스크롤 안에 여러 애니메이션을 시차 배치.**

```ts
const segment = (p, start, end) => clamp01((p - start) / (end - start));
```

| 구간 | 대상 | 동작 |
|---|---|---|
| p = 0.00 ~ 0.35 | 헤드라인 | translateY(0 → -80px) + opacity(1 → 0) |
| p = 0.00 ~ 0.55 | 미디어 clip-path | inset(측정값 → 0), 위쪽 radius(24 → 0) |
| p = 0.60 ~ 0.90 | 오버레이 카피 | opacity(0 → 1) + translateY(+30 → 0) |

확장 종료(0.55)와 카피 시작(0.60) 사이의 **0.05 숨 고르기**가 연출 완성도의 핵심이다. 임의로 겹치지 말 것.

### 14B.3 레이아웃 규칙

- 여백은 vw 비율이 아니라 **고정 max-width 컨테이너 + 가운데 정렬**: `max-width: 1200px; margin: 0 auto; padding-left/right: 24px`. 1248px 이하 화면에서 좌우 여백 24px, 그보다 넓으면 `(뷰포트−1200)÷2`만큼 자연 증가. **`DESIGN.md`의 `layout.container-*` 토큰과 반드시 일치.**
- 시작 카드 사각형: 위 = 헤드라인 아래(placeholder 자동) / 좌우 = 컨테이너 여백(자동) / **아래 = 0** / 모서리 = **위 두 코너만 24px**(`round 24px 24px 0 0`).
- 섹션 구조:

```
<section .hero>              ← height: 300vh (스크롤 길이 = 속도감, 250~350 조정)
  <div .hero-sticky>         ← sticky; top:0; height:100vh; overflow:hidden
    <div .hero-layout>       ← 컨테이너 (z-index:2, pointer-events:none)
      <h1 .hero-title>
      <div .media-frame>     ← 보이지 않는 placeholder (flex:1, visibility:hidden)
    </div>
    <div .hero-media>        ← 풀스크린 미디어 (absolute inset 0, z-index:1)
    <p .hero-caption>        ← 오버레이 카피 (z-index:3, 초기 opacity 0)
  </div>
</section>
```

- 네비게이션은 `position: fixed; z-index: 10`으로 히어로 위에 떠 있는다(`DESIGN.md`의 `top-nav-transparent`). 풀스크린 전환 후 가독성이 떨어지면 진행도에 따라 텍스트를 on-dark로 전환하거나 반투명 블러 배경을 더한다.

### 14B.4 참조 구현 (App Router 클라이언트 컴포넌트)

스크롤·측정 로직이 있으므로 `'use client'`. 아래 로직은 검증된 코드이며 **변경하지 말 것.**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './CrossHero.module.css';

/** 영상과 이미지를 동등하게 지원하는 판별 유니온 (13.3 env에서 조립해 주입) */
export type HeroMedia =
  | { type: 'video'; src: string; poster?: string }
  | { type: 'image'; src: string; alt?: string };

interface CrossHeroProps {
  title: string;
  caption: React.ReactNode;
  media: HeroMedia;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const segment = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));

export default function DeptHero({ title, caption, media }: CrossHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // 정적 폴백은 CSS가 처리(14.6)

    const hero = heroRef.current!;
    const sticky = stickyRef.current!;
    const frame = frameRef.current!;
    const mediaEl = mediaRef.current!;
    const titleEl = titleRef.current!;
    const captionEl = captionRef.current!;

    let startInset = { top: 0, right: 0, bottom: 0, left: 0 };
    let ticking = false;

    const measure = () => {
      const s = sticky.getBoundingClientRect();
      const r = frame.getBoundingClientRect();
      startInset = {
        top: r.top - s.top,
        left: r.left - s.left,
        right: s.right - r.right,
        bottom: s.bottom - r.bottom, // 레이아웃상 0 (하단 패딩 없음)
      };
      update();
    };

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - hero.offsetTop) / total);

      const pe = segment(p, 0, 0.55);
      const radius = lerp(24, 0, pe);
      mediaEl.style.clipPath =
        `inset(${lerp(startInset.top, 0, pe)}px ` +
        `${lerp(startInset.right, 0, pe)}px ` +
        `${lerp(startInset.bottom, 0, pe)}px ` +
        `${lerp(startInset.left, 0, pe)}px ` +
        `round ${radius}px ${radius}px 0 0)`;

      const pt = segment(p, 0, 0.35);
      titleEl.style.transform = `translateY(${lerp(0, -80, pt)}px)`;
      titleEl.style.opacity = String(1 - pt);

      const pc = segment(p, 0.6, 0.9);
      captionEl.style.opacity = String(pc);
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, pc)}px))`;

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    measure();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        <div className={styles.layout}>
          <h1 ref={titleRef} className={styles.title}>{title}</h1>
          <div ref={frameRef} className={styles.frame} aria-hidden="true" />
        </div>

        <div ref={mediaRef} className={styles.media}>
          {media.type === 'video' && !videoFailed ? (
            <video
              autoPlay muted loop playsInline
              preload="metadata"
              src={media.src}
              poster={media.poster}
              onError={() => setVideoFailed(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.type === 'video' ? (media.poster ?? '') : media.src}
              alt={media.type === 'image' ? (media.alt ?? '') : ''}
            />
          )}
        </div>

        <p ref={captionRef} className={styles.caption}>{caption}</p>
      </div>
    </section>
  );
}
```

```css
/* CrossHero.module.css */
.hero { position: relative; height: 300vh; }

.sticky { position: sticky; top: 0; height: 100vh; height: 100dvh; overflow: hidden; }

.layout {
  position: relative; z-index: 2;
  height: 100%;
  width: 100%; max-width: 1200px; margin: 0 auto;  /* DESIGN.md layout 토큰과 일치 */
  padding: 14vh 24px 0;                            /* 하단 0: 카드가 바닥까지 이어짐 */
  display: flex; flex-direction: column;
  pointer-events: none;
}

.title {
  font-size: clamp(36px, 6vw, 72px);
  font-weight: 500; letter-spacing: -0.02em;       /* DESIGN.md display-mega */
  margin: 0 0 5vh;
  will-change: transform, opacity;
}

.frame { flex: 1; visibility: hidden; }

.media {
  position: absolute; inset: 0; z-index: 1;
  will-change: clip-path;
  /* JS 측정 전 첫 페인트 깜빡임 방지용 근사 초기값 */
  clip-path: inset(35% 24px 0 24px round 24px 24px 0 0);
}
.media video, .media img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}

.caption {
  position: absolute; top: 50%; z-index: 3;
  left: max(24px, calc((100vw - 1200px) / 2 + 24px)); /* 컨테이너 기준선 정렬 */
  transform: translateY(calc(-50% + 30px));
  color: #fff; font-size: clamp(28px, 4.5vw, 56px);
  font-weight: 500; line-height: 1.4; letter-spacing: -0.02em;
  margin: 0; opacity: 0;
  will-change: transform, opacity;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .hero { height: auto; }
  .sticky { position: static; height: auto; }
  .layout { padding-bottom: 0; }
  .media { position: static; clip-path: none !important; height: 70vh; }
  .frame, .caption { display: none; }
}
```

### 14B.5 미디어 듀얼 모드·폴백

- `media` prop은 `HeroMedia` 판별 유니온 하나로 주입한다. **두 모드는 완전히 동등** — 둘 다 `object-fit: cover`라 clip-path 로직에 분기가 없다.
- 소스는 13.3의 두 경로(정적 에셋 / `GET /api/media/{id}` 공개 서빙)를 모두 허용한다. 공개 서빙은 타입 메타를 주지 않으므로 **타입은 env(`NEXT_PUBLIC_HERO_MEDIA_TYPE`)가 명시**한다.
- 폴백 규칙(반드시 구현):

| 상황 | 동작 |
|---|---|
| 영상 로드 실패(`onError`) | `poster`로 자동 전환. poster도 없으면 배경색 유지 |
| 영상 로딩 중 | `poster`가 첫 화면(`<video poster>` 네이티브 동작) |
| 모바일 자동재생 차단 | `muted`+`playsinline`으로 예방. 막혀도 poster가 보여 깨지지 않음 |

- 따라서 `type: 'video'`일 때 **poster 동시 제공을 강력 권장**한다.
- 에셋 스펙: 영상 1920×1080·10~20초 루프·h264 mp4·10MB 이하(서버 업로드 한도와 동일, 6.2). 이미지 1920×1080 이상 webp/jpg 500KB 이하 권장.

### 14B.6 접근성·반응형·엣지

1. **prefers-reduced-motion**: 연출 전부 비활성, 헤드라인 + 정적 미디어(70vh)의 일반 흐름으로 폴백. JS도 이벤트 미등록.
2. **모바일**: 동일 로직 동작. 폰트는 clamp가 처리. 필요시 `.hero` 250vh로 단축.
3. **리사이즈**: `resize`에서 재측정 — placeholder 방식이라 자동 대응.
4. **iOS 주소창**: `100vh` 뒤에 `100dvh` 중복 선언(참조 구현 반영됨).
5. **첫 페인트 깜빡임**: CSS 근사 초기 clip-path 선언 → hydration 후 측정값으로 교체.
6. **SEO**: 헤드라인 `<h1>`, 카피는 opacity 0이어도 DOM에 존재해 크롤링된다.

### 14B.7 구현 금지 사항

- width/height/margin 직접 애니메이션 금지(reflow).
- 시작 inset의 % / 상수 하드코딩 금지(placeholder 측정 사용).
- scroll 이벤트에서 rAF 스로틀 없이 DOM 갱신 금지.
- GSAP 등 외부 애니메이션 라이브러리 추가 금지(위 바닐라 로직으로 충분).
- 확장 구간과 카피 등장 구간을 겹치게 하지 말 것(0.05 간격 유지).
- 히어로 텍스트·미디어 하드코딩 금지 — 13.3 env 주입.

### 14B.8 튜닝 파라미터

| 항목 | 위치 | 기본값 | 효과 |
|---|---|---|---|
| 스크롤 길이 | `.hero` height | 300vh | 클수록 느리게 펼쳐짐 |
| 컨테이너 폭/패딩 | `.layout` | 1200px / 24px | DESIGN.md와 동기화 |
| 시작 모서리 | `lerp(24, 0, pe)` | 24px | 카드 둥글기 |
| 확장 구간 | `segment(p, 0, 0.55)` | 0~0.55 | 확장 종료 시점 |
| 카피 구간 | `segment(p, 0.6, 0.9)` | 0.6~0.9 | 카피 등장 타이밍 |
| 헤드라인 퇴장 | `segment(p, 0, 0.35)` / -80px | — | 퇴장 속도·이동량 |

### 14B.9 검수 기준 (Acceptance Criteria)

- [ ] 시작 상태: 카드 좌우 여백이 헤드라인 시작점과 정확히 정렬된다.
- [ ] 시작 상태: 카드 하단이 여백 없이 뷰포트 바닥에 붙고, 위쪽 모서리만 둥글다.
- [ ] 스크롤 시 헤드라인이 먼저 사라지기 시작하고, 카드가 100vw×100vh까지 펼쳐진다.
- [ ] 풀스크린 완료 후에야 카피가 페이드인된다(겹침 없음).
- [ ] 섹션 통과 후 sticky가 풀리며 13.4의 다음 섹션으로 자연스럽게 이어진다.
- [ ] 창 크기를 바꿔도 카드 시작 위치가 레이아웃과 어긋나지 않는다.
- [ ] 스크롤 중 reflow 없이 60fps에 준하는 부드러움(DevTools Performance 확인).
- [ ] prefers-reduced-motion에서 정적 레이아웃으로 폴백.
- [ ] `media.type`을 video ↔ image로 바꿔도 동일 연출이 동작한다(prop 교체만으로).
- [ ] 영상 URL을 고의로 깨뜨리면 poster로 폴백되고 효과는 정상 동작한다.
- [ ] `/api/media/{id}` 소스로도 정적 에셋과 동일하게 동작한다.
- [ ] 모바일 Safari/Chrome에서 영상 자동재생 + 효과 동작.


## 15. 기술 스택·공통 컴포넌트 인벤토리

이 장은 구현 일관성을 위한 **확정 결정**이다. 여기 없는 라이브러리를 임의로 추가하지 말 것 — 필요하면 15.1 표에 추가한 뒤 사용한다.

### 15.1 기술 스택 (확정)

| 영역 | 선택 | 사용 규칙 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript | 공개 페이지는 서버 컴포넌트 우선 |
| 스타일링 | **Tailwind CSS** | DESIGN.md 토큰을 CSS 변수로 1차 노출 → `theme.extend`에서 변수 참조. **임의 hex/px 유틸 금지**(`bg-[#0052ff]` 같은 arbitrary value로 토큰 우회 금지). 예외: CrossHero(14.4)는 동적 인라인 스타일 특성상 CSS Module 유지 |
| UI 컴포넌트 | **하이브리드 (최종)** | **동작 중심만 shadcn/ui로 도입**: Dialog(Modal)·Toast(sonner)·Popover·DropdownMenu·Select·Tabs·Sheet(모바일 네비). 코드 복사 방식이므로 파일은 프로젝트 소유 — 설치 즉시 DESIGN.md 토큰으로 재스킨(기본 룩 사용 금지). **시각 중심은 직접 구현**: Button·Card·Badge·Input은 DESIGN.md 정의대로 자체 작성(shadcn 버전 도입 금지). 위 목록 외 shadcn 컴포넌트 추가 설치 금지 |
| 서버 상태(클라이언트 측) | **TanStack Query** | 회원·어드민 영역 전용. `queryFn`은 반드시 `authFetch`(1.6) 경유 |
| 클라이언트 상태 | **Zustand** | 인증 스토어(토큰·member 스냅샷) 하나로 시작. 전역 스토어 남발 금지 — 서버 데이터는 Query가, 폼 상태는 RHF가 담당 |
| 폼 | **react-hook-form + zod** | 가입 폼 사전검증(1.1)을 zod 스키마로: password ≥ 8자, 약관 2종 true. 서버 `errors[]`(4.2)는 `setError`로 필드에 매핑 |
| 마크다운 | **marked + DOMPurify** | 5.3 파이프라인 그대로. 우회 렌더링 금지 |
| 날짜 | **date-fns** | 캘린더 셀 계산·날짜 포맷. moment/dayjs 추가 금지 |

**데이터 패칭 경계 (중요)**:
- **공개 페이지**(메인·설교·공지·일정·부서·주보 조회): 서버 컴포넌트에서 `fetch` + ISR. TanStack Query 사용하지 않는다 — 토큰이 필요 없고 서버 캐시(13.1)가 이미 있다.
- **회원·어드민 영역**(갤러리, 내 정보, /api/admin/**): 클라이언트 컴포넌트 + TanStack Query + `authFetch`. 401 refresh는 1.6 인터셉터가 선처리.

### 15.2 공통 컴포넌트 인벤토리

UI 카탈로그(버튼·카드·배지·입력 등)는 DESIGN.md `components:`가 단일 진실이다. 아래는 **DESIGN.md에 없는 동작 컴포넌트**의 명세다. 구현 시 스타일 토큰은 DESIGN.md를 따른다.

| 컴포넌트 | 동작 명세 |
|---|---|
| `Pagination` | 응답 봉투 `page`(3.1: size·number·totalElements·totalPages) 그대로 받는다. number는 0-base, URL 쿼리 `?page=`와 동기화. 페이지 7개 초과 시 말줄임 |
| `TagFilter` | `GET /api/tags`(공개, name asc) → 필 버튼 가로 나열. 선택 시 `?tagId=` 단수(3.4) 재조회. "전체" = tagId 제거 |
| `Toast` | **shadcn(sonner) 기반.** 4.2 errorCode → UI 처리표의 출력 채널. 전역 1개 컨테이너, 성공/오류 변형, 자동 소멸 4초. 아래 동작은 라이브러리가 제공한다 — **재스킨 시 깨뜨리지 말 것**: `aria-live` 기반 스크린리더 자동 낭독 |
| `Modal` | **shadcn Dialog 기반.** 낙관락 재편집 확인(8.3 `confirmReedit`), 미디어 삭제 차단 안내(6.3) 등에 사용. 아래 동작은 Radix가 제공한다 — **재스킨 시 깨뜨리지 말 것**: 포커스 트랩, 닫힐 때 트리거로 포커스 복귀, ESC·오버레이 클릭 닫기, `role="dialog"`+`aria-modal`+`aria-labelledby`, body 스크롤 잠금. `DialogTitle`을 시각적으로 숨기더라도 제거하지 않는다(aria 연결 유지) |
| `Popover` | **shadcn Popover 기반.** 캘린더 "+n" 더보기(15.3), 네비 드롭다운에 사용. 트리거 `aria-expanded`, ESC·외부 클릭 닫기, 포커스 복귀는 Radix 제공 — 재스킨 시 보존 |
| `MarkdownContent` | 5.3 `renderMarkdown` 래퍼. `prose` 스타일은 DESIGN.md body-md(행간 1.7) 기준으로 커스텀 |
| `Skeleton` / `EmptyState` | 목록 로딩·빈 배열(13.2) 표준 표시. EmptyState 문구는 "등록된 ○○가 없습니다" 패턴 |
| `EventCalendar` | 15.3 별도 명세 |

어드민 화면의 테이블·폼 레이아웃은 DESIGN.md 범위 밖(Known Gaps)이므로, 위 컴포넌트와 토큰을 재사용한 단순 변형으로 구현한다.

### 15.3 일정 캘린더(EventCalendar) 명세 — 직접 구현 (라이브러리 금지)

**읽기 전용 표시 컴포넌트**다(일정 CRUD는 어드민 폼). FullCalendar 등 캘린더 라이브러리를 도입하지 않는다 — 편집 기능을 쓰지 않으면서 번들·스타일 충돌 비용만 생긴다.

**데이터**
- `GET /api/events?year={y}&month={m}` — **쌍 필수**(10장). 월 이동 시마다 재조회.
- 겹침 판정은 서버 규약(10장): `end_at` **배타 경계**, `endAt=null`은 `startAt` 기준 점 이벤트.

**데스크톱(≥1024px) — 월 그리드**
- 7열(일~토) × 5~6행. date-fns `startOfWeek(startOfMonth())` ~ `endOfWeek(endOfMonth())`로 셀 범위 계산.
- 셀: 날짜 숫자는 `datetime` 토큰(tnum). 이번 달 외 날짜는 `muted-soft`. **오늘은 `primary-soft` 배경 원형 마커**.
- 이벤트는 셀 안에 **칩(chip)**으로 표시 — `badge-pill-primary` 스타일, 제목 한 줄 말줄임. 셀당 최대 3개 + "+n" 더보기(클릭 시 그 날짜 이벤트 팝오버).
- **기간 이벤트**(endAt이 다른 날): 시작~끝 사이 모든 해당 셀에 칩을 반복 표시한다(가로 연결 바는 구현 복잡도 대비 효용이 낮아 1차 범위에서 제외). `allDay=true`면 시간 생략, 아니면 칩에 `HH:mm` 접두.
- 칩 클릭 → 일정 상세(또는 상세 모달).
- 상단 헤더: `← 2026년 6월 →` 월 네비게이션 + "오늘" 버튼.

**모바일(<1024px) — 날짜 그룹 목록**
- 월 그리드 대신 **그 달의 이벤트를 날짜별로 그룹핑한 세로 목록**으로 전환한다(같은 데이터, 다른 뷰).
- 그룹 헤더 = `6월 14일 (토)`, 항목 = event-card 축약형(제목·시간·장소).
- 이벤트 없는 달은 EmptyState.

**검수 기준**
- [ ] 월 이동 시 `year`+`month` 쌍으로 재조회된다(한쪽만 보내는 400 케이스 없음).
- [ ] `endAt=null` 점 이벤트가 시작일 셀에만 표시된다.
- [ ] 기간 이벤트가 시작~끝 모든 날짜 셀에 나타나고, `end_at` 배타 경계가 지켜진다(종료 시각이 자정인 다음날 셀에 표시되지 않음).
- [ ] `allDay` 이벤트에 시간이 표기되지 않는다.
- [ ] 오늘 마커가 정확하고, 1024px 경계에서 그리드 ↔ 목록이 전환된다.
- [ ] 외부 캘린더 라이브러리 의존성이 package.json에 없다.

### 15.4 UI 컴포넌트 검수 기준

shadcn 도입분(동작)과 직접 구현분(시각)을 나눠 점검한다.

**shadcn 재스킨 검증 — 스타일을 바꾸다 동작을 깨뜨리지 않았는가**
- [ ] Modal: Tab 순환이 모달 밖으로 나가지 않고, 닫힘 시 트리거로 포커스가 복귀하며, 열림 동안 배경이 스크롤되지 않는다(스타일 수정 후에도).
- [ ] Toast: 스크린리더(VoiceOver 등)가 새 토스트를 자동 낭독한다.
- [ ] 모든 shadcn 컴포넌트에서 기본 룩(zinc 회색 팔레트, 기본 radius)이 남아 있지 않다 — DESIGN.md 토큰(필 버튼, 24px 카드, primary 블루)이 적용됐다.
- [ ] 15.1 목록 외의 shadcn 컴포넌트가 `components/ui/`에 추가돼 있지 않다.

**직접 구현분(Button·Card·Badge·Input 등) 검증**
- [ ] DESIGN.md `components:` 정의(크기·라운드·패딩·타이포 토큰)와 픽셀 단위로 일치한다.
- [ ] 모든 인터랙티브 요소에 포커스 표시(focus-visible 링)가 보인다 — 입력은 2px primary 보더(DESIGN.md).
- [ ] 키보드만으로 전 기능 조작이 가능하다.
