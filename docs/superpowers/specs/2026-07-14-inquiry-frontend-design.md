# 문의(Inquiry) 프론트 연동 — 공개 접수 폼 + 어드민 처리 화면

- 날짜: 2026-07-14
- 대상: `src/lib/api/inquiries.ts`(신규) · `src/lib/api/inquiries.admin.ts`(신규) ·
  `src/components/about/InquirySection.tsx`(신규) · `src/components/admin/inquiries/*`(신규) ·
  `src/app/(site)/about/location/page.tsx` · `src/app/(site)/mypage/manage/inquiries/page.tsx`(신규) ·
  `src/constants/permissions.ts` · `src/lib/admin/manageDomains.ts` · `src/lib/auth/handleApiError.ts` ·
  `.claude/rules/DESIGN.md`
- 신뢰 소스: `docs/api-docs.json`(문의 4경로·6스키마) · `docs/church-frontend-guide.md` · `.claude/rules/DESIGN.md`

## 1. 배경

백엔드에 문의 API가 추가됐다(`docs/api-docs.json` 신규 4경로). 프론트에는 대응 코드가 **전혀 없다**.

| 경로 | 인증 | 용도 |
|---|---|---|
| `POST /api/inquiries` | **불필요** — 누구나 | 방문자 문의 등록. IP당 1시간 5건 초과 시 429 `RATE_LIMIT_EXCEEDED` |
| `GET /api/admin/inquiries` | `INQUIRY_MANAGE` | 목록(카드 메타만, `content` 제외) · `completed` 필터 · 페이지네이션(기본 `createdAt,desc`) |
| `GET /api/admin/inquiries/{id}` | `INQUIRY_MANAGE` | 상세(문의 내용 포함) |
| `PATCH /api/admin/inquiries/{id}/complete` | `INQUIRY_MANAGE` | 완료 체크/취소 → 갱신된 상세 반환 |
| `DELETE /api/admin/inquiries/{id}` | `INQUIRY_MANAGE` | soft delete(204) |

두 가지 사실이 설계를 규정한다:

1. **공개 POST는 비인증이다.** 기존 쓰기 경로(`apiMutate`)는 전부 `authFetch` 기반이라 그대로 쓸 수 없다.
   비회원 방문자가 제출하는 첫 쓰기 API다.
2. **목록에 `content`가 없다.** 관리자는 문의 내용을 읽으려면 반드시 상세를 열어야 한다 —
   "목록에서 바로 완료 체크"는 내용을 안 읽고 체크할 수 있게 만들어 오조작을 부른다.
   따라서 **읽기와 처리를 같은 자리(상세 다이얼로그)에서** 한다.

낙관락(`version`)은 문의에 없다 — 완료 토글·삭제 모두 version을 받지 않는다(스키마 확인).

## 2. 목표 / 비목표

**목표**
- 방문자가 `/about/location`에서 문의를 남기고 접수 확인을 받는다.
- `INQUIRY_MANAGE` 보유자가 `/mypage/manage/inquiries`에서 문의를 읽고 완료 처리·삭제한다.
- 기존 패턴(태그·회원 관리) 재사용 — 새 인프라 0.

**비목표(의도적 제외)**
- 문의 검색·정렬 UI — 백엔드가 `completed` 필터와 최신순 정렬만 제공. 없는 기능을 프론트가 흉내내지 않는다.
- 메인 페이지 CTA 유입 링크 — IA 변경(navigation.ts·푸터) 없이 기존 "연락처 및 위치" 페이지 안에서 완결.
- 이메일/문자 알림 — 답변은 담당자가 직접 발송한다(API 설명 명시). 프론트는 처리 여부만 기록.
- 문의 목록의 공개 노출(내 문의 조회) — API가 없다.

## 3. IA — 왜 `/about/location` 안인가

기존 "연락처 및 위치" 페이지는 이미 전화·이메일·주소를 갖고 있다. 문의 폼은 **같은 의도의 세 번째 채널**이다.
전용 `/contact` 페이지를 만들면 연락 정보가 두 페이지로 쪼개지고 `navigation.ts`·푸터 IA를 건드려야 한다.

페이지 리듬(DESIGN.md — 흰 → 회색 → 흰 교차)도 그대로 성립한다:

```
LocationContact     (흰 캔버스 — 주소·전화·이메일 + 약도)
LocationDirections  (surface-soft 밴드 — 찾아오는 방법)
InquirySection      (흰 캔버스 — 문의 폼)   ← 신규
```

## 4. API 레이어

### 4.1 `src/lib/api/inquiries.ts` — 공개(비인증)

`apiMutate`는 `authFetch`(401 refresh·토큰 큐잉) 위에 있어 비회원 제출에 부적합하다.
공개 GET들이 쓰는 `apiUrl` + 에러 변환기 `parseJson`만 조합한 얇은 함수를 둔다.

```ts
import { apiUrl } from "@/lib/auth/apiBase";
import { parseJson } from "@/lib/auth/apiError";

export interface InquiryCreateRequest {
  name: string;      // 필수 ≤50
  phone: string;     // 필수 ≤20
  email?: string;    // 선택, email 형식 ≤100
  content: string;   // 필수 10~2000
  privacyAgreed: boolean; // 필수 true
}
export interface InquiryCreatedResponse { id: number } // 개인정보 미반환 — 접수번호만

export function createInquiry(body: InquiryCreateRequest): Promise<InquiryCreatedResponse>;
```

`parseJson`이 비-2xx를 `ApiError`로 바꾸므로 429·400 모두 `errorCode` 분기(가이드 4장)에 그대로 얹힌다.

### 4.2 `src/lib/api/inquiries.admin.ts` — 어드민

`members.admin.ts` 동형(읽기 = `authFetch` + `parseJson`, 쓰기 = `apiMutate`). client 전용.

```ts
export interface InquiryCardResponse {   // 목록 — content 없음
  id: number; name: string; phone: string; email: string;
  completed: boolean; completedAt: string | null; createdAt: string;
}
export interface InquiryDetailResponse extends InquiryCardResponse { content: string }
export interface InquiryListParams { completed?: boolean; page?: number; size?: number }

listInquiries(p: InquiryListParams): Promise<Page<InquiryCardResponse>>
getInquiry(id: number): Promise<InquiryDetailResponse>
completeInquiry(id: number, completed: boolean): Promise<InquiryDetailResponse>
deleteInquiry(id: number): Promise<void>
```

`completed` 미지정 = 전체(쿼리 파라미터 자체를 생략). `sort`는 보내지 않는다 — 백엔드 기본이 `createdAt,desc`.

## 5. 공개 문의 폼 — `InquirySection`

`"use client"` 컴포넌트. `SignupForm`의 검증·약관 패턴을 그대로 따른다.

**필드**(zod 스키마는 API 제약과 1:1)

| 필드 | 검증 | UI |
|---|---|---|
| 이름 | 1~50 | `Input` |
| 연락처 | 필수 ≤20, 입력 시 `formatPhone` 정규화(auth 재사용) | `Input` |
| 이메일 | 선택, 있으면 email 형식·≤100 | `Input` |
| 문의 내용 | 10~2000 | `Textarea` (10자 미만 시 인라인 caption 에러) |
| 개인정보 동의 | `true` 강제 | `Checkbox` + `TermsDialog doc={PRIVACY_POLICY}` (가입 폼과 동일 조합) |

**상태 전이**

```
idle ──제출──> submitting ──201──> submitted(접수번호)
                    │
                    └──ApiError──> idle (에러 표시)
```

- **성공은 폼 자리를 접수 완료 패널로 교체한다.** 토스트만 띄우면 고령 사용자가 놓친다.
  패널: 확인 아이콘 플레이트(lucide `Check`) + "문의가 접수되었습니다" + 접수번호 `#{id}` +
  "담당자가 남겨주신 연락처로 회신드립니다" + "다시 문의하기" 버튼(폼 리셋 → idle).
- 제출 중 버튼 `disabled` — 중복 제출 방지.
- 에러는 `handleApiError(e, { onFieldErrors })` — `INVALID_INPUT_VALUE`의 `errors[]`를 RHF `setError`로
  필드에 꽂고, 그 외(429·500)는 토스트.

## 6. 어드민 — `/mypage/manage/inquiries`

`MemberManager` 동형. 새 컴포넌트 패턴 도입 없음.

```
InquiryManager (client)
├── Tabs 필터: 전체 | 미처리 | 완료   → URL ?completed=
├── DataTable: 이름 · 연락처 · 접수일 · 상태 Badge
├── Pagination (URL ?page=, size 10)
└── InquiryDetailDialog (행 클릭 시)
    ├── getInquiry 시드 (useQuery 파생, staleTime/gcTime 0, retry false)
    ├── 헤더: 이름 + 상태 Badge
    ├── 메타: 연락처(tel:) · 이메일(mailto:) · 접수일시
    ├── 본문: content (whitespace-pre-wrap — 방문자 원문, 마크다운 변환 안 함)
    └── 액션: [삭제 → DeleteConfirmDialog] [완료 처리 / 완료 취소]
```

- 페이지 셸은 `manage/tags/page.tsx`와 동일: `Container` + `RequirePermission permission="INQUIRY_MANAGE"` + `EditAccessDenied` 폴백.
- 쿼리키: `adminKeys.list("inquiries", params)` / `adminKeys.detail("inquiries", id)`.
  mutation 성공 시 `adminKeys.listAll("inquiries")` 무효화 + 상세 무효화. 공개 소비자가 없어 ISR 무효화(`revalidateTags`)는 불필요.
- **어드민 다이얼로그 시드는 `useQuery` 파생**(메모리 관례) — `useState` + effect `setState`는 lint 에러.
- 본문은 **마크다운으로 렌더하지 않는다.** 방문자가 쓴 평문이므로 `whitespace-pre-wrap` 그대로 — `marked` 통과는 불필요한 해석 위험.

## 7. 곁가지 수정

| 파일 | 변경 |
|---|---|
| `constants/permissions.ts` | `INQUIRY_MANAGE: "문의 관리"` (권한 라벨) |
| `lib/admin/manageDomains.ts` | 카테고리 `inbox`("문의")를 `MANAGE_CATEGORIES` **맨 앞**에 + 카드 `{ key:"inquiries", permission:"INQUIRY_MANAGE", href:"/mypage/manage/inquiries", kind:"manage", category:"inbox" }` |
| `lib/auth/handleApiError.ts` | `case "RATE_LIMIT_EXCEEDED"` → "문의가 너무 많이 접수되었습니다. 잠시 후 다시 시도해 주세요." |
| `app/(site)/about/location/page.tsx` | `<InquirySection />` 추가 |
| `.claude/rules/DESIGN.md` | `inquiry-form`(폼 섹션) · `inquiry-manager`(어드민) 항목 등록 |

**`inbox` 카테고리를 새로 만드는 이유**: 기존 4개 카테고리(콘텐츠·미디어·조직·회원권한)는 전부
"교회가 **내보내는** 것"이다. 문의는 "**들어오는** 것"이라 어디에 끼워도 의미가 어긋난다.
관리자가 가장 자주 확인할 항목이므로 허브 맨 위에 둔다. 카드가 1개인 카테고리는 기존 로직이 허용한다
(보유 권한 0이면 제목째 숨김).

## 8. 테스트

기존 vitest 관례(globals:false 명시 import · jest-dom 없음 · fetch mock).

| 대상 | 검증 |
|---|---|
| `inquiries.test.ts` | POST 경로·본문 직렬화 · 비-2xx → `ApiError`(429 errorCode 보존) |
| `inquiries.admin.test.ts` | `completed` 미지정 시 쿼리 생략 · true/false 반영 · page/size · 완료 PATCH 본문 · DELETE 204 |
| `InquirySection.test.tsx` | 필수 검증(이름·연락처·10자 미만 내용·미동의) 차단 · 성공 시 접수번호 패널 · 제출 중 버튼 disabled · 필드 에러 인라인 표시 |
| `InquiryManager.test.tsx` | 탭 전환 → `completed` 파라미터 · 행 클릭 → 상세 열림 · 빈 목록 EmptyState |
| `InquiryDetailDialog.test.tsx` | content 렌더 · 완료 토글 mutation 호출 · 삭제 확인 다이얼로그 경유 |

## 9. 검수 기준

1. 비로그인 상태에서 `/about/location` 문의 제출 → 201 · 접수번호 패널 표시.
2. 10자 미만 내용·미동의 상태로 제출 차단(클라 검증).
3. `INQUIRY_MANAGE` 미보유 회원이 `/mypage/manage/inquiries` 접근 → `EditAccessDenied`.
4. 보유자: 목록 → 상세 → 완료 처리 → 목록 상태 Badge 즉시 갱신(캐시 무효화).
5. 완료 취소·삭제 동작. 삭제는 확인 다이얼로그 경유.
6. `pnpm lint` · `npx tsc --noEmit` · `pnpm test` 그린.
