# 어드민 06 — 태그·직분 관리 (Taxonomy) 설계

- 이슈: `.issues/admin/06-taxonomy.md` (에픽 `.issues/admin/00-epic.md`)
- 트랙: 어드민 2차 배치 06 (선행 01 기반 인프라 완료, 02~05·04 병렬 트랙)
- 범위: **태그**(전역 태그 풀)·**직분**(표시용 레이블) 운영자 관리 화면 2종.
- 비범위: 권한 카탈로그(`GET /api/admin/permissions`)·역할·회원 = **07 거버넌스** 소관.

---

## 1. 배경 — API 사용/미사용 현황

| 엔드포인트 | 인증 | 현재 상태 |
|---|---|---|
| `GET /api/tags` | 공개 | ✅ **사용 중** — `getTags`(tags.ts). 서버 ISR 공개 페이지(설교·공지·일정 TagFilter) + 클라 `useQuery(["tags"])`(TagMultiSelect·갤러리 필터) 공용 |
| `POST /api/admin/tags` | `TAG_MANAGE` | ❌ 미사용 → 06 신설 |
| `PATCH /api/admin/tags/{id}` | `TAG_MANAGE` | ❌ 미사용 → 06 신설 |
| `DELETE /api/admin/tags/{id}` | `TAG_MANAGE` | ❌ 미사용 → 06 신설 |
| `GET /api/positions` | 공개 | ❌ **완전 미사용** — `getPositions`·`PositionResponse` 부재. `me.position`은 회원 상세의 문자열 스냅샷일 뿐 |
| `POST /api/admin/positions` | `POSITION_MANAGE` | ❌ 미사용 → 06 신설 |
| `PATCH /api/admin/positions/{id}` | `POSITION_MANAGE` | ❌ 미사용 → 06 신설 |
| `DELETE /api/admin/positions/{id}` | `POSITION_MANAGE` | ❌ 미사용 → 06 신설 |

**설계를 좌우하는 사실 3가지**
1. **태그·직분 모두 `version`(낙관락)이 없다.** 단건 GET(`/{id}`)도 없다. → 부서(04)의 "상세 fresh 조회 → version 시드 → 409 재조회" 전 과정 **불필요**. 수정 시드는 **목록 행 값**만으로 충분.
2. POST 성공코드는 OpenAPI 응답맵상 **`200`**(설명문만 "201 Created"). → 특정 코드 하드코딩 금지. `apiMutate`가 `parseJson`으로 **2xx 일괄 처리**(204는 별도 분기)하므로 그대로 안전.
3. `GET /api/positions`는 **공개 ISR 소비자가 0**. → 직분은 ISR revalidate 불요(어드민 클라 화면만 갱신). 태그만 공개 ISR이 실재해 무효화 필요.

---

## 2. 아키텍처

```
src/lib/api/
  types.ts                          ← PositionResponse 추가 (TagResponse는 기존)
  tags.ts                           ← getTags에 next.tags 부착(무효화 연결)
  positions.ts            (신규)     ← getPositions(공개 읽기, 클라 useQuery용)
  tags.admin.ts           (신규)     ← client-only: createTag/patchTag/deleteTag
  positions.admin.ts      (신규)     ← client-only: createPosition/patchPosition/deletePosition
src/lib/admin/
  revalidate.ts                     ← revalidateTags() 추가 (직분 제외)
src/components/admin/
  tags/
    schema.ts             (신규)     ← zod: name 1–50
    TagManager.tsx        (신규)     ← 오케스트레이터(목록·툴바·다이얼로그 배선)
    TagFormDialog.tsx     (신규)     ← 생성/수정 공용(행 값 시드)
  positions/
    schema.ts             (신규)     ← zod: name 1–50, sortOrder nonnegative int|null
    PositionManager.tsx   (신규)
    PositionFormDialog.tsx (신규)
src/app/(site)/mypage/manage/
  tags/page.tsx           (신규)     ← Container+h1+RequirePermission "TAG_MANAGE"
  positions/page.tsx      (신규)     ← 동일, "POSITION_MANAGE"
.claude/rules/DESIGN.md             ← 어드민 공용 블록 06 구획에 컴포넌트 4종 등록
```

**무변경(이미 정합)**: `src/lib/admin/manageDomains.ts`(태그·직분 카드·경로 보유), `src/constants/permissions.ts`(`TAG_MANAGE`·`POSITION_MANAGE` 라벨 보유). 관리 허브 카드는 권한 보유 시 자동 노출.

도메인별 분리(04 선례) — 공용 제네릭 미도입. 소비자 2개뿐이라 설정-인디렉션 비용이 중복 제거 이득을 초과. 공용 primitive(DataTable·DeleteConfirmDialog·apiMutate·adminOnError)는 재사용.

---

## 3. 데이터 계층

### 3-1. 타입 (`src/lib/api/types.ts`)
```ts
export interface PositionResponse {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string; // ISO date-time. 화면 미표시(정렬·진단용)
}
```
`TagResponse {id, name}`는 기존 정의 재사용.

### 3-2. 공개 읽기
- **태그**: 기존 `getTags` 재사용. **변경점**: `next` 옵션에 `tags:["tags"]` 부착 →
  ```ts
  // tags.ts
  const res = await fetch(apiUrl("/api/tags"), { next: { revalidate: 300, tags: ["tags"] } });
  ```
  (sermons.ts `tags:["sermons"]` 패턴과 동형. 클라 `useQuery` 호출 시 `next`는 무시되므로 기존 소비자에 영향 없음.)
- **직분**: 신규 `getPositions`(공개·**클라 useQuery 전용** — RSC import 금지 주석 명시. 공개 ISR 소비자가 없으므로 `next` 캐시 옵션 불요):
  ```ts
  // positions.ts  (클라 useQuery 전용 — RSC에서 import 금지)
  export async function getPositions(): Promise<PositionResponse[]> {
    const res = await fetch(apiUrl("/api/positions"));
    if (!res.ok) throw new Error(`GET /api/positions 실패: ${res.status}`);
    return (await res.json()) as PositionResponse[];
  }
  ```

### 3-3. 어드민 쓰기 (client-only 경계 — RSC 번들 금지 주석 명시)
`apiMutate`(authFetch + parseJson, 2xx 처리·204 분기). 요청 타입은 도메인-로컬(병렬화 스펙).

```ts
// tags.admin.ts
export interface TagCreateRequest { name: string }   // ≤50
export interface TagUpdateRequest { name: string }    // ≤50, version 없음. 서버 계약상 name optional(null=미변경)이나 프론트는 항상 전송(폼 ≥1 강제) — 의도적 narrowing
export function createTag(body: TagCreateRequest): Promise<TagResponse>          // POST /api/admin/tags
export function patchTag(id: number, body: TagUpdateRequest): Promise<TagResponse> // PATCH /api/admin/tags/{id}
export function deleteTag(id: number): Promise<void>                              // DELETE /api/admin/tags/{id} (204)
```
```ts
// positions.admin.ts
export interface PositionCreateRequest { name: string; sortOrder?: number } // sortOrder 생략 → 백엔드 max+10
export interface PositionUpdateRequest { name: string; sortOrder?: number }  // PATCH 부분수정. sortOrder 미포함 = 미변경
export function createPosition(body: PositionCreateRequest): Promise<PositionResponse>
export function patchPosition(id: number, body: PositionUpdateRequest): Promise<PositionResponse>
export function deletePosition(id: number): Promise<void>
```
> 명명: `next/cache`의 `updateTag`(revalidate.ts)와의 혼동 회피 + PATCH 동사 일치(gallery `patchAlbum` 선례)로 `patchTag`/`patchPosition` 채택.
> `*UpdateRequest`는 OpenAPI상 전 필드 optional(PATCH 부분수정)이나, 프론트 타입은 `name` 필수로 좁힌다(폼이 항상 name 전송). `sortOrder`만 optional로 유지해 "비움 = 미변경"을 표현.

### 3-4. ISR 무효화 (`src/lib/admin/revalidate.ts`)
```ts
export async function revalidateTags() { updateTag("tags"); } // 직분은 공개 소비자 0 → 추가 안 함
```

---

## 4. 캐시 무효화 전략

| 소비자 | 종류 | 무효화 |
|---|---|---|
| TagManager 자체 목록 | 클라 `useQuery(["tags"])` | mutation onSuccess → `qc.invalidateQueries(["tags"])` |
| TagMultiSelect · 갤러리 TagFilter | 클라 `useQuery(["tags"])` | **동일 키 공유** → 같은 invalidate로 자동 동기화 |
| 공개 설교·공지·일정 TagFilter | 서버 ISR(`getTags`, `tags:["tags"]`) | mutation onSuccess → `await revalidateTags()` |
| 콘텐츠에 임베드된 태그 *이름* (sermon.tags[].name 등) | 서버 ISR(sermons/notices/events 캐시) | **지연 반영(범위 밖)** — 에픽 00 "공개 페이지 반영 지연 안내" 정책. cascade revalidate 안 함 |

직분: 공개 ISR 소비자 없음 → `revalidatePositions` 불요. PositionManager는 `useQuery(["positions"])` invalidate만.

> 04(부서)가 ISR revalidate를 생략한 건 공개 부서 페이지가 **상수 구동이라 무효화할 캐시가 없어서**였다. 태그는 공개 ISR이 실재하므로 콘텐츠 도메인 선례(자기 태그 revalidate)를 따른다.

---

## 5. 스키마 (zod)

`optional().default()` 미사용(zodResolver 입출력 타입 불일치 회피, 04 선례). 기본값은 `useForm defaultValues`에서 주입.

```ts
// components/admin/tags/schema.ts
export const tagSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
});
export type TagFormValues = z.infer<typeof tagSchema>;
```
```ts
// components/admin/positions/schema.ts
export const positionSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
  sortOrder: z.number().int().nonnegative().nullable(), // departments/schema.ts:10 동형 — zod v4라 커스텀 number 메시지 인자 사용 안 함
});
export type PositionFormValues = z.infer<typeof positionSchema>;
```
> **zod v4 주의**: 프로젝트는 zod 4.4.3 — v3의 `z.number({ invalid_type_error })`/`required_error`는 제거됐다(TS 초과 프로퍼티 에러). number 필드는 departments/schema.ts처럼 메시지 인자 없이 기본 메시지를 쓴다.
- 서버 `name` 제약은 `minLength:0`이지만 빈 이름은 무의미하므로 프론트는 **≥1 필수**.
- `sortOrder` null = "비움" → **생성** 시 백엔드 자동 부여(max+10), **수정** 시 body에서 생략(PATCH 미변경). null↔"" 매핑은 폼 `Controller`에서 처리(§6-2, 04 선례).

---

## 6. 컴포넌트

### 6-1. TagManager / PositionManager (자립 오케스트레이터)
- **PositionManager 상단 안내 배너**(이슈 06-taxonomy 줄20 요구): `bg-surface-soft` + lucide `Info` + "직분은 표시용 이름이며 로그인 권한과 무관합니다." 고정 노출(04 `department-admin-manager` 안내 배너 선례). TagManager는 배너 없음.
- `useQuery(["tags"], getTags)` / `useQuery(["positions"], getPositions)` — 목록.
- 공용 `DataTable`:
  - 태그 컬럼 `[이름]`
  - 직분 컬럼 `[이름, 정렬순서]`
  - row actions = `수정`·`삭제` 버튼.
- 툴바 `＋새 태그`/`＋새 직분` → FormDialog(create).
- 삭제: 공용 `DeleteConfirmDialog`(`requirePassword=false`) + 도메인별 경고문 + Manager 보유 delete mutation의 `pending`/`onConfirm` 주입.
  - 태그 경고: "이 태그를 삭제하면 연결된 설교·공지·일정·부서에서도 태그가 함께 제거됩니다." (비차단 삭제)
  - 직분 경고: "이 직분을 삭제합니다. 되돌릴 수 없습니다." (물리 삭제)
- 상태: `dialog open/mode/target` + `delete target`. **`effect` 미사용**(이벤트 핸들러 직접 처리).
- onSuccess:
  - 태그: `qc.invalidateQueries(["tags"])` + `await revalidateTags()` + `notify.success` + 다이얼로그 닫기.
  - 직분: `qc.invalidateQueries(["positions"])` + `notify.success` + 닫기.
- onError: `adminOnError()`(네트워크/기타 토스트). 삭제 mutation도 동일.
- 로딩 → DataTable `loading`. 빈 목록 → `empty`("등록된 태그가 없습니다." / "등록된 직분이 없습니다.").

### 6-2. TagFormDialog / PositionFormDialog (AlbumFormDialog 패턴)
- RHF + `zodResolver`. props: `{ open, onOpenChange, mode: "create"|"edit", initial?: TagResponse|PositionResponse }`.
- **effect 정책**: FormDialog는 AlbumFormDialog처럼 `open/mode/initial` 변화 시 `useEffect`로 `reset`만 호출(setState-in-effect 아님 — lint 통과). Manager(§6-1)는 effect 미사용. 적용 범위가 다르다.
- `reset`으로 베이스라인 시드(create=빈 폼, edit=`initial` 행 값). **상세 GET 없음 — 행 값으로 직접 시드**(version 부재라 stale 위험 없음).
- 제출: create=POST, edit=PATCH.
  - 태그 body: `{ name }` (create·edit 동일).
  - 직분 body: **create·edit 통일** — `{ name, ...(sortOrder !== null ? { sortOrder } : {}) }`. 즉 sortOrder가 null(비움)이면 body에서 생략 → create는 백엔드 자동부여, edit(PATCH)는 미변경. "항상 숫자" 가정 폐기.
- **sortOrder 입력 배선(04 선례, DepartmentFormDialog.tsx:213-226)**: `register`+`setValueAs` 미사용(코드베이스 0건). `Controller`로 null↔"" 매핑:
  ```tsx
  <Controller control={control} name="sortOrder" render={({ field }) => (
    <Input type="number" inputMode="numeric"
      value={field.value === null ? "" : String(field.value)}
      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
      error={errors.sortOrder?.message} />
  )} />
  ```
- 중복(409 `DUPLICATE_RESOURCE`): `adminOnError({ onDuplicate: () => setError("name", { message: "같은 이름이 이미 있습니다." }) })` → name 필드 인라인 에러, 다이얼로그 유지.
- 입력 검증 에러(400 `INVALID_INPUT_VALUE`): `onFieldErrors`로 RHF `setError` 매핑(폴백 토스트).

---

## 7. 라우트

```tsx
// app/(site)/mypage/manage/tags/page.tsx
export default function ManageTagsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>태그 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="TAG_MANAGE" fallback={<EditAccessDenied />}>
          <TagManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```
- 직분 페이지 동일(제목 "직분 관리", `POSITION_MANAGE`, `<PositionManager />`).
- `useSearchParams` 미사용 → **Suspense 경계 불필요**(media 페이지와 달리). 부모 `manage/layout`이 로그인 가드.

---

## 8. 디자인 토큰·규칙

- `typo.*`·spacing 토큰만 사용. hex·px 인라인 금지. 섹션 제목 `typo.displayMd`(media 페이지 동형).
- UI 이모지 금지, 아이콘 `lucide-react`(`currentColor`). JSX 조건부 삼항.
- 어드민 화면(가독성 우선 단순 변형)이되 토큰 공유(DESIGN.md Known Gaps).
- **DESIGN.md 어드민 공용 블록**(06 구획)에 등록:
  - `tag-manager`: 태그 목록·CRUD 화면. `DataTable`(이름) + 툴바 등록 + 행 수정/삭제(`DeleteConfirmDialog`).
  - `tag-form-modal`: 태그 생성·수정 Dialog. `Input`(이름) 단일 필드. 중복 시 name 인라인 에러.
  - `position-manager`: 직분 목록·CRUD 화면. `DataTable`(이름·정렬순서) + 상단 "권한 무관 표시용" 안내 배너(lucide `Info`).
  - `position-form-modal`: 직분 생성·수정 Dialog. `Input`(이름)+number `Input`(정렬순서, 생성 시 생략→자동부여).

---

## 9. 에러·엣지 처리

| 상황 | 처리 |
|---|---|
| 이름 빈값/50자 초과 | zod → RHF 인라인 에러(제출 차단) |
| 이름 중복(409 DUPLICATE_RESOURCE) | `onDuplicate` → name 필드 인라인 에러, 다이얼로그 유지 |
| sortOrder 음수/소수 | zod 인라인 에러 |
| 태그 삭제(비차단) | 경고문 안내 후 진행. 연결 콘텐츠 태그 자동 정리(서버) |
| 직분 삭제(물리) | 경고문 안내 후 진행 |
| 네트워크/서버 오류 | `adminOnError` 기본 토스트 |
| 권한 없음 | `RequirePermission` → `EditAccessDenied` 폴백(제목·컨테이너는 렌더) |
| 빈 목록/로딩 | DataTable `empty`/`loading` |

---

## 10. 테스트 (vitest, globals:false 명시 import·jest-dom 없음·next/link mock — 프론트 관례)

| 파일 | 검증 |
|---|---|
| `lib/api/tags.admin.test.ts` | createTag POST·patchTag PATCH·deleteTag DELETE(204) 경로·메서드·본문 |
| `lib/api/positions.admin.test.ts` | create/patch/delete + sortOrder 생략 시 body 미포함 |
| `lib/api/positions.test.ts` | getPositions 경로·비2xx throw |
| `lib/api/tags.test.ts`(**기존 단언 수정**) | tags.test.ts:12의 `toHaveBeenCalledWith("/api/tags", { next:{revalidate:300} })` 기대값을 `{ next:{ revalidate:300, tags:["tags"] } }`로 갱신(신규 추가 아님 — 기존 정확일치 단언이 깨지므로 반드시 수정) |
| `components/admin/tags/schema.test.ts` | name 빈값·51자 실패; 정상 통과 |
| `components/admin/positions/schema.test.ts` | name 제약; sortOrder null 허용·음수·소수 실패 |
| `components/admin/tags/TagManager.test.tsx` | 목록 렌더; ＋새 태그 create; 행 수정/삭제 다이얼로그; 삭제확인→deleteTag; onSuccess invalidate(["tags"])+revalidateTags; empty |

> **server action mock(필수)**: TagManager onSuccess가 `await revalidateTags()`를 호출 → `revalidate.ts`는 `"use server"`+`next/cache updateTag`라 jsdom에서 그대로 실행 시 throw. SermonForm.test 선례대로 mock한다: `const { revalidateTagsMock } = vi.hoisted(() => ({ revalidateTagsMock: vi.fn() }))` → `vi.mock("@/lib/admin/revalidate", () => ({ revalidateTags: revalidateTagsMock }))` → `beforeEach: revalidateTagsMock.mockResolvedValue(undefined)`. (PositionManager.test는 revalidate 호출이 없어 불요.)
| `components/admin/tags/TagFormDialog.test.tsx` | name 빈값 검증; create POST body; edit 행 시드→PATCH {name}; 중복→name 인라인 에러; 재오픈 reset |
| `components/admin/positions/PositionManager.test.tsx` | 목록(이름·정렬순서); CRUD; 삭제확인→deletePosition; invalidate(["positions"]) |
| `components/admin/positions/PositionFormDialog.test.tsx` | name+sortOrder(Controller, 빈값→null); sortOrder 비움 시 body에서 생략(create·edit 공통); 채운 값은 body 포함; 중복→name 에러 |

**완료 게이트**: `pnpm test` 전체 통과 · `npx tsc --noEmit` 0 · `pnpm lint` 0. 커버리지 80%+.

---

## 11. 구현 순서(계획 단계에서 세분)

1. 타입(`PositionResponse`) → 공개 읽기(`getTags` 태깅·`getPositions`) → 어드민 쓰기(`tags.admin`·`positions.admin`) → `revalidateTags`.
2. 스키마 2종.
3. FormDialog 2종 → Manager 2종.
4. 라우트 2종.
5. DESIGN.md 등록.
6. 테스트(각 단계 TDD: RED→GREEN).
