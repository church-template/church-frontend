# 05-미디어 설계: 갤러리·주보·미디어 라이브러리 관리 (#39)

> 어드민 트랙 wave2, 도메인 05. 조율 기준: `docs/superpowers/specs/2026-06-14-admin-track-parallelization.md`.
> 신뢰 소스: `.issues/admin/05-media.md`, `docs/api-docs.json`, `docs/church-frontend-guide.md`, `.claude/rules/DESIGN.md`.
> 모든 API 계약은 작성 전 `api-docs.json`에 대해 4축 병렬 재검증함(아래 §3은 그 검증 결과).

## 1. 개요 & 범위

운영자가 **갤러리·주보·미디어 파일**을 올리고 관리하는 화면을 연동한다. 세 하위 영역을 **한 스펙·3단계 순차 구현**으로 진행한다.

| 영역 | 권한 | 진입 모델 | 핵심 동작 |
|---|---|---|---|
| **미디어 라이브러리** | `MEDIA_MANAGE` | 운영 전용 화면 `/mypage/manage/media` | 업로드, 목록(type·날짜 필터·페이지), **차단형 삭제**(참조 있으면 사용처 보여주고 차단) |
| **주보** | `BULLETIN_WRITE` | 공개 목록 위 인라인 액션 | 등록·수정·삭제 (낙관락 `version`) |
| **갤러리** | `GALLERY_WRITE` | 회원 목록·상세 위 인라인 액션 | 앨범 CRUD, 사진 추가(기존 재사용)·제거 |

**핵심 결정 (사용자 승인):**
1. **통합 업로드 모델** — 모든 신규 파일은 항상 `POST /api/admin/media`로 라이브러리에 먼저 올려 `mediaId`를 받고, 갤러리·주보는 **`mediaId`로만 참조**한다. 결과적으로 멀티파트 업로드는 미디어 라이브러리 한 곳에만 존재하고, 갤러리 사진추가·주보 등록/수정은 **쿼리파라미터 전용 쓰기**가 된다. 이슈 의도("업로드 파일은 라이브러리에 모이고 여러 콘텐츠가 재사용")와 정확히 일치.
2. **MediaPicker v1 포함** — 기존 라이브러리 미디어 재사용을 위한 공유 모달. 갤러리·주보 공용.
3. **DataTable는 lean 컬럼 구동** + 백엔드 `Page<T>` 페이지네이션(`common/Pagination` 재사용).
4. **현재 브랜치**(`20260614_#39_갤러리_주보_미디어_라이브러리_관리`)에서 작업, 워크트리 미사용.

## 2. 배경·전제

### 2.1 단일 생산자 의무 (철칙 1)
05는 다음 두 공유 컴포넌트를 **최초 생산**한다. 06(분류)·07(거버넌스)이 머지 후 소비한다. 둘 다 현재 미존재 확인.
- `src/components/admin/DataTable.tsx`
- `src/components/admin/MediaUploader.tsx`

추가로 05 내부 공용으로 `MediaPicker.tsx`(허브)도 생산한다.

### 2.2 재사용 자산 (수정 없이 소비)
- 게이트: `RequirePermission`(props `{permission?, perms?, mode?, fallback?, children}`, `useMe()` 라이브 권한 기반, 로딩/미보유 시 `fallback`(기본 null))
- 쓰기: `apiMutate<T>(path, {method, body?})` — JSON 전용, 204 처리
- 에러: `adminOnError(handlers?)`(`@/lib/admin/mutationHandlers`), `handleApiError`(아래 매핑), `isOptimisticLockConflict`
- 쿼리키: `adminKeys.list(domain, params)` / `adminKeys.detail(domain, id)`
- 다이얼로그: `DeleteConfirmDialog`(props `{open, onOpenChange, title, warning?, requirePassword?, confirmLabel?, pending?, onConfirm}`)
- 폼 컴포넌트: `MarkdownEditor`(`{value, onChange, id?, error?, placeholder?, rows?}`), `TagMultiSelect`(`{value:number[], onChange}`), `DateTimePicker`(`{value, onChange, allDay?, id?, error?}` — `allDay`면 `type="date"`)
- 페이지네이션: `common/Pagination`(`{page: PageMeta}`, URL searchParams 구동)
- 토스트: `notify.success(msg)` / `notify.error(msg)` (`@/lib/notify`)
- 날짜: `toServerDateTime`, `toLocalInput` (`@/lib/date`)
- 무효화(공개 ISR): `revalidate.ts`(server action `updateTag`)

### 2.3 `handleApiError` errorCode → 핸들러 매핑 (검증됨)
| errorCode | 핸들러 키(없으면 고정 토스트) |
|---|---|
| `INVALID_INPUT_VALUE` | `onFieldErrors(error.errors)` (`error.errors?.length` 있을 때만) |
| `MEDIA_IN_USE` | `onMediaReferences(error.references ?? [])` |
| `OPTIMISTIC_LOCK_CONFLICT` | 항상 토스트 후 `void onReedit?.()` |
| `DUPLICATE_RESOURCE` | `onDuplicate(error)` |
| `FILE_SIZE_EXCEEDED` | 고정 토스트("파일 용량이 한도를 초과했습니다…") |
| `INVALID_TOKEN` | `onRedirectToLogin()` |
| default | `error.title ?? "오류가 발생했습니다."` |

`adminOnError`는 `ApiError`면 `handleApiError(e, handlers)`, 아니면 네트워크 오류 토스트. → 우리 폼은 핸들러만 넘기면 된다.

### 2.4 RSC 번들 경계 (철칙 2 부속)
어드민 쓰기 함수·요청 타입은 공개 GET 모듈과 분리한다(`apiMutate`→`authFetch`→`authStore`가 서버 번들에 끌려가 Turbopack 빌드 실패). 따라서 신규 어드민 모듈은 모두 `src/lib/api/{도메인}.admin.ts`. 요청 타입은 도메인-로컬, 수정 타입에 `version: number` 포함.

## 3. 백엔드 API 계약 (작성 전 4축 재검증 + 리뷰 교정 반영)

> ⚠️ `api-docs.json` 머신 스펙 기준. 리뷰 교정 사항:
> - **성공 코드**: 생성 POST(미디어·앨범·주보)는 머신 스펙이 **모두 200**(산문은 "201 Created"). DELETE만 204. → 코드·테스트는 status 하드체크 금지, `res.ok`(2xx)·204만 특수처리, **에러 분기는 errorCode로만**(status 무관).
> - **파일 본문 인코딩**: 미디어·주보의 `file` 본문을 머신 스펙은 `application/json`(schema `{file: binary}`)로 렌더(springdoc 쿼크). 실제 전송은 **multipart/form-data로 가정**(Content-Type 미설정 → 브라우저 boundary). 첫 업로드로 실증(§11 차단게이트).
> - **비-파일 파라미터 위치**: 여러 어드민 쓰기가 비-파일 값을 `in: query`로 선언. 통합 업로드 모델이라 신규 파일은 미디어 업로드 한 곳에서만 보내고, 갤러리·주보엔 `mediaId`만 쿼리로 전달.
> - **페이지네이션**: GET 목록은 OpenAPI상 단일 `pageable` 객체 파라미터지만 백엔드는 평면 `page`/`size`/`sort` 쿼리 수용(기존 `sermons.ts` 선례). 응답 `page`는 `@/lib/page`의 `PageMeta`(서버 `PageMetadata`와 동형: `size`·`number`·`totalElements`·`totalPages`) 재사용.

### 3.1 미디어 (`MEDIA_MANAGE`)
- **POST `/api/admin/media`** — multipart/form-data 전송(머신 스펙은 application/json+binary, §3 쿼크), 폼 필드명 **`file`**(binary, required). 응답 `MediaResponse`. **성공 200**. >10MB→`FILE_SIZE_EXCEEDED`. 미허용 형식→400(errorCode 미명시 — `INVALID_INPUT_VALUE` 가정, 기본 토스트 경로로 처리). 5종: JPEG/PNG/GIF/WEBP/PDF.
- **GET `/api/admin/media`** — query: `type`(`image`|`pdf`, 옵션)·`from`·`to`(`yyyy-MM-dd`, 옵션)·평면 `page`/`size`/`sort`(기본 `createdAt,desc`; §3 Pageable 참고). 응답 `PagedModelMediaResponse` = `{content: MediaResponse[], page: PageMeta}`(`PageMeta`=`@/lib/page`).
- **GET `/api/admin/media/{id}/references`** — 응답 `{mediaId:int64, inUse:boolean, references: ContentRef[]}`. 200(에러 봉투 아님).
- **DELETE `/api/admin/media/{id}`** — 성공 204. 참조 시 409 `MEDIA_IN_USE` + `ErrorResponse.references`(동일 `ContentRef[]`).
- `MediaResponse` = `{id:int64, filename:string, mimeType:string, size:int64, uploadedBy:int64, createdAt:date-time}`.
- `ContentRef` = `{type:string, id:int64, title:string}`. **`type`은 enum·example 미정의(opaque string)** — 값 casing 미확인. 분기·딥링크 금지, 표시만(§11 검증 항목).

### 3.2 갤러리 (`GALLERY_WRITE`)
- **POST `/api/admin/gallery/albums`** — **JSON body** `{title:string(≤200, 필수), description?:string(≤50000), tagIds?:int64[]}`. 응답 `GalleryAlbumDetailResponse`(photos 빈 배열). 성공 200.
- **POST `/api/admin/gallery/albums/{id}/photos`** — **`files`·`mediaIds` 모두 `in: query`**, body 없음. 통합 모델 → **`mediaIds`만 전송**(쿼리 배열, 반복 파라미터). 응답 갱신된 `GalleryAlbumDetailResponse`. 200.
- **PATCH `/api/admin/gallery/albums/{id}`** — **JSON body** `{title?, description?, tagIds?, version:int64(필수)}`. version은 **body**. 충돌 409 `OPTIMISTIC_LOCK_CONFLICT`(태그만 변경 시 version 불변). 응답 detail. 200.
- **DELETE `/api/admin/gallery/albums/{id}`** — 204(soft).
- **DELETE `/api/admin/gallery/photos/{photoId}`** — 204(연결 해제, 원본 보존). `photoId`는 `GalleryPhotoResponse.id`.
- `GalleryAlbumDetailResponse`·`GalleryPhotoResponse`는 `types.ts`에 이미 존재.

### 3.3 주보 (`BULLETIN_WRITE`)
- **POST `/api/admin/bulletins`** — **`title`·`serviceDate`(`yyyy-MM-dd`)·`mediaId` 모두 `in: query`**, `file`만 body. 통합 모델 → **쿼리 `title·serviceDate·mediaId`만 전송**, body 없음. `file` XOR `mediaId`는 우리가 항상 mediaId(클라 검증). 응답 `BulletinDetailResponse`. 성공 200. (둘 다/둘 다 없음 → 400; 우리는 mediaId 항상 동봉)
- **PATCH `/api/admin/bulletins/{id}`** — **`version`·`title`·`serviceDate`·`mediaId` 모두 `in: query`**, `file`만 body. **version은 query**(갤러리와 다름). 생략 파라미터=미변경. 충돌 409. 응답 detail. 200.
- **DELETE `/api/admin/bulletins/{id}`** — 204(soft, PDF 보존).
- **GET `/api/bulletins/{id}`** — **공개**, 응답 `BulletinDetailResponse` = `{id, title, serviceDate, mediaId, author, createdAt, updatedAt, version}`. **version 공개 반환** → 수정 전 version 시드로 사용.

### 3.4 errorCode 리터럴 (검증됨, 정확히 이 문자열로 분기)
`MEDIA_IN_USE` · `FILE_SIZE_EXCEEDED` · `OPTIMISTIC_LOCK_CONFLICT` · `DUPLICATE_RESOURCE` · `INVALID_INPUT_VALUE`.

## 4. 아키텍처 — 공유 인프라 (05 단독 생산)

### 4.1 `src/lib/admin/apiUpload.ts` (신규)
비-JSON 어드민 쓰기(멀티파트 업로드 + 쿼리파라미터 전용 쓰기) 공용 헬퍼. `authFetch` 재사용(401 refresh·큐잉). **Content-Type 미설정**(브라우저가 multipart boundary 설정; authFetch가 Authorization만 추가). ⚠️ **FormData 재시도**: authFetch는 401 시 동일 `init`(body=FormData)로 재요청(`authFetch.ts:54`). 브라우저에서 FormData는 1회성 ReadableStream과 달리 재직렬화 가능할 것으로 보이나 **미확정** — 업로드 직전 401 재시도 경로의 본문 유실 여부를 테스트로 실증(§11.3). 유실 시 대안: apiUpload가 `() => FormData` 팩토리를 받아 재시도 시 재생성, 또는 업로드 전 1회 사전 토큰 갱신.

```ts
export async function apiUpload<T>(
  path: string,
  opts: {
    method: "POST" | "PATCH";
    formData?: FormData;                  // 멀티파트(미디어 업로드만)
    query?: Record<string, string | number | (string | number)[] | undefined>; // 쿼리(배열=반복 파라미터)
  },
): Promise<T>
```
- `query` 직렬화: `undefined` 생략, 배열은 `key`를 값마다 반복(`mediaIds=1&mediaIds=2`). `URLSearchParams`로 구성해 `path`에 부착.
- `authFetch(pathWithQuery, { method, body: formData })` — headers 미지정.
- 204 → `undefined as T`; else `parseJson<T>(res)`.

### 4.2 `src/components/admin/MediaUploader.tsx` (신규·단일생산)
네이티브 파일 선택 + **클라 사전검증**(accept별 허용 MIME — image 4종/pdf 1종/all 5종 · 10MB; 즉시 피드백으로 413/400 왕복 감소) + `uploadMedia`(`POST /api/admin/media`, 순수 전송) + `onUploaded`. `multiple`이면 순차 업로드 후 결과 배열. (검증 책임은 MediaUploader 전담, `uploadMedia`는 전송만)

```ts
export interface MediaUploaderProps {
  // image=JPEG/PNG/GIF/WEBP, pdf=PDF, all=5종 전체. "all"은 라이브러리 페이지 전용(MediaPicker는 image|pdf만).
  accept: "image" | "pdf" | "all";
  multiple?: boolean;               // 기본 false(주보 1개), true=라이브러리·갤러리 다중
  onUploaded: (media: MediaResponse[]) => void;
  disabled?: boolean;
}
```
- 검증 실패 시 인라인 메시지(`typo.caption`, semantic 토큰). 업로드 중 `pending`(이중 제출 방지).
- 에러: `adminOnError()`(FILE_SIZE_EXCEEDED·INVALID_INPUT_VALUE 토스트는 기존 매핑이 처리).
- 라이브러리 페이지·MediaPicker "새 업로드" 탭 양쪽에서 사용.

### 4.3 `src/components/admin/MediaPicker.tsx` (신규·허브)
shadcn `Dialog` + `Tabs`("새 업로드" / "라이브러리"). 갤러리(image·multiple)·주보(pdf·single) 공용.

```ts
export interface MediaPickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accept: "image" | "pdf";
  multiple?: boolean;               // 기본 false
  onConfirm: (mediaIds: number[]) => void;  // 선택 확정
}
```
- **새 업로드 탭**: `MediaUploader`(같은 accept/multiple) → 업로드 성공 시 결과를 선택 상태로 누적, 라이브러리 쿼리 무효화.
- **라이브러리 탭**: `useQuery(adminKeys.list("media", {type}))`로 `listMedia({type})` → 썸네일 그리드(image) / 파일 행(pdf), 선택 토글. `accept`로 `type` 필터 고정(image→`type=image`, pdf→`type=pdf`).
- 확정 버튼 → `onConfirm(선택된 mediaIds)` + 닫기. single이면 단일 선택 강제.

### 4.4 `src/components/admin/DataTable.tsx` (신규·단일생산·06·07 소비)
lean 컬럼 구동 테이블. 정렬·행선택·페이지네이션 **미내장**(페이지네이션은 페이지 레벨 `common/Pagination`).

```ts
export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;              // td/th 정렬·폭
}
export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  actions?: (row: T) => ReactNode; // 후행 액션 셀(수정·삭제 등)
  empty?: ReactNode;               // 빈 상태(기본 <EmptyState message="데이터가 없습니다." /> — EmptyState는 message 필수)
  loading?: boolean;               // 스켈레톤/플레이스홀더
}
```
- 가독성 우선 단순 변형, 토큰 공유(헤어라인 행 구분, `typo.*`). hex·px 인라인 금지.
- 06·07 소비 시 컬럼 API 부족분(정렬·다중선택 등)은 해당 도메인에서 확장 제안 — 05는 lean만 보장(무리한 개조 금지).

## 5. 아키텍처 — 도메인 API 모듈

### 5.1 `src/lib/api/media.admin.ts` (신규)
```ts
// 타입(어드민 응답 — 공개 GET 없음, 도메인-로컬)
export interface MediaResponse { id; filename; mimeType; size; uploadedBy; createdAt }   // §3.1
// 참조 항목은 기존 MediaReference(@/lib/auth/apiError, {type,id,title}) 재사용 — 409 백스톱 onMediaReferences와 동일 타입(새 ContentRef 만들지 않음).
export interface MediaReferencesResponse { mediaId: number; inUse: boolean; references: MediaReference[] }
export interface MediaListParams { type?: "image" | "pdf"; from?: string; to?: string; page?: number; size?: number; sort?: string }

// 함수
listMedia(params): Promise<Page<MediaResponse>>          // GET, 로컬 query 빌더(type/from/to/page/size/sort)
uploadMedia(file: File): Promise<MediaResponse>          // apiUpload(formData: file) — 순수 전송(검증은 MediaUploader)
getMediaReferences(id): Promise<MediaReferencesResponse> // GET via authFetch
deleteMedia(id): Promise<void>                           // apiMutate DELETE
```
- `buildListQuery`는 `type/from/to` 미지원 → media 전용 로컬 직렬화.

### 5.2 `src/lib/api/gallery.admin.ts` (신규)
```ts
export interface GalleryAlbumCreateRequest { title: string; description?: string; tagIds?: number[] }
export interface GalleryAlbumPatchRequest { title?: string; description?: string; tagIds?: number[]; version: number }

createAlbum(body): Promise<GalleryAlbumDetailResponse>            // apiMutate POST(JSON)
patchAlbum(id, body): Promise<GalleryAlbumDetailResponse>         // apiMutate PATCH(JSON, version in body)
deleteAlbum(id): Promise<void>                                    // apiMutate DELETE
addPhotos(albumId, mediaIds: number[]): Promise<GalleryAlbumDetailResponse> // apiUpload POST(query mediaIds). ⚠️ files=required:true(머신) — mediaIds-only 200 실증 필수(§11.1 차단게이트). 400이면 폴백: 빈 files 파트 동봉 또는 신규파일 직접 멀티파트.
removePhoto(photoId): Promise<void>                              // apiMutate DELETE
```

### 5.3 `src/lib/api/bulletins.admin.ts` (신규) + 공개 모듈 보강
```ts
export interface BulletinCreateInput { title: string; serviceDate: string; mediaId: number }
export interface BulletinUpdateInput { version: number; title?: string; serviceDate?: string; mediaId?: number }

getBulletin(id): Promise<BulletinDetailResponse>          // 공개 GET via fetch({cache:"no-store"}) — 수정용 최신 version 확보(getNotice/getSermon 선례). 캐시 시 stale version→즉시 409.
createBulletin(input): Promise<BulletinDetailResponse>    // apiUpload POST(query)
patchBulletin(id, input): Promise<BulletinDetailResponse> // apiUpload PATCH(query, version in query)
deleteBulletin(id): Promise<void>                        // apiMutate DELETE
```
- `src/lib/api/types.ts`: `BulletinDetailResponse`(공개 GET 응답) **추가** + 상단 주석의 "상세 타입 미선언" 문구 갱신.
- `src/lib/api/bulletins.ts`: `getBulletins`에 `next: { tags: ["bulletins"], revalidate: 60 }` 태그 추가.
- `src/lib/admin/revalidate.ts`: `revalidateBulletins()` (`updateTag("bulletins")`) 추가.

## 6. Phase A — 미디어 라이브러리 (`/mypage/manage/media`)

- `src/app/(site)/mypage/manage/media/page.tsx` (RSC shell) → `RequirePermission permission="MEDIA_MANAGE"`(fallback=`EditAccessDenied`) → `<MediaLibrary/>`.
- `src/components/admin/media/MediaLibrary.tsx` (client):
  - searchParams(`type`·`from`·`to`·`page`) → `useQuery(adminKeys.list("media", params), () => listMedia(params))`.
  - 필터바(type select·날짜 from/to) + `MediaUploader accept="all"`(§4.2, 5종 허용) → 성공 시 접두 무효화 `invalidateQueries({ queryKey: ["admin","media","list"] })`(§9).
  - `DataTable`(컬럼: 미리보기/파일명·유형·크기·업로드일 + actions=삭제) + `Pagination`(`data.page`).
  - **차단형 삭제**: 행 삭제 클릭 → `getMediaReferences(id)` → `inUse`면 `MediaReferencesDialog`(참조 목록 표시, 삭제 버튼 없음, 편집 유도) / 아니면 `DeleteConfirmDialog`(warning="원본이 영구 삭제됩니다") → `deleteMedia` → 접두 무효화. **백스톱**: 실제 delete가 409 `MEDIA_IN_USE`면 `adminOnError({ onMediaReferences })`로 같은 다이얼로그.
- `src/components/admin/media/MediaReferencesDialog.tsx` (신규, DESIGN `media-references-list`): `references: MediaReference[]` 표시(유형 라벨 + 제목). 딥링크는 `type` 값 확인 후 best-effort(§11.4).

## 7. Phase B — 주보 인라인 어드민 (공개 RSC 목록)

- `src/components/bulletins/BulletinFormDialog.tsx` (client): RHF + zod. 스키마(`schemas.ts`): `title`(nonempty, ≤200), `serviceDate`(`/^\d{4}-\d{2}-\d{2}$/` nonempty), `mediaId`(양의 정수 필수).
  - 필드: `title`, `serviceDate`(DateTimePicker `allDay`=date 모드, `yyyy-MM-dd`), `mediaId`(MediaPicker `pdf`·single, **필수**). edit 시 현재 첨부 PDF는 `mediaId` 파일명/링크 + "변경" 액션으로 노출(미선택 오인 방지).
  - create → `createBulletin({title, serviceDate, mediaId})`. edit → 열 때 `getBulletin(id)`(no-store)로 version·현재값 시드 → `patchBulletin(id, {version, title, serviceDate, mediaId})`.
  - onSuccess: `await revalidateBulletins()` → `notify.success("저장했습니다.")` → `router.refresh()` → `onOpenChange(false)`.
  - onError: `adminOnError({ onFieldErrors→setError, onReedit→getBulletin 재조회(no-store)·폼 리셋, onDuplicate→토스트 })`.
- `src/components/bulletins/BulletinAdminActions.tsx` (client islands):
  - `BulletinListAction`: `RequirePermission BULLETIN_WRITE` → "새 주보" 버튼 + create `BulletinFormDialog`. 페이지 `<h1>주보</h1>` 옆 헤더 행에 배치.
  - `BulletinRowActions({ b })`: `RequirePermission BULLETIN_WRITE` → 수정(edit dialog)·삭제(`DeleteConfirmDialog`→`deleteBulletin`→revalidate+refresh).
- `src/app/(site)/bulletins/page.tsx` (RSC) 수정: `<h1>` + `<BulletinListAction/>`를 `flex justify-between` 헤더로; `.map`에서 각 행을 래퍼로 감싸 `<BulletinRow/>` + `<BulletinRowActions b={b}/>`를 **앵커 밖 형제**로 배치(중첩 `<a>` 금지). `BulletinRow`에 선택적 `actions?: ReactNode` 슬롯을 추가해 `<a>` 바깥(행 래퍼 내부)에서 렌더 — `border-b`를 래퍼로 이동(시각 일관). 공개 컴포넌트 수정이나 additive·05 소관.

## 8. Phase C — 갤러리 인라인 어드민 (회원 client 목록·상세)

갤러리는 `GalleryGate`(GALLERY_VIEW) 하위 client 컴포넌트(`AlbumList`·`AlbumDetail`·`PhotoGrid`)라 아일랜드를 **직접 주입**(별도 RSC island 불필요). 단 쓰기 컨트롤은 자체 `RequirePermission GALLERY_WRITE` 게이트(GALLERY_VIEW보다 좁음).

- `src/components/gallery/AlbumFormDialog.tsx` (client): RHF + zod. 스키마(`schemas.ts`): `title`(nonempty ≤200)·`description`(≤50000, 옵션)·`tagIds`(int[], 옵션). 필드 `title`·`description`(MarkdownEditor)·`tagIds`(TagMultiSelect). create → `createAlbum`. edit → `album.version` 동봉 `patchAlbum(id, {..., version})`.
  - onSuccess: `queryClient.invalidateQueries(["albums"])` + (edit면 `["album", id]`) → `notify.success` → 닫기. (갤러리는 ISR 아님 → revalidate 불요)
  - onError: `adminOnError({ onFieldErrors, onReedit→invalidate ["album", id], onDuplicate })`.
- `src/components/gallery/GalleryAdminActions.tsx`:
  - `AlbumListAction`: "새 앨범"(AlbumList `TagFilter` 옆 툴바).
  - `AlbumDetailActions({ album })`: 앨범 수정(edit dialog, `album.version` 사용)·삭제(`DeleteConfirmDialog`→`deleteAlbum`→invalidate `["albums"]`·`["album", id]`→상세 이탈/목록 복귀).
- **사진 관리**(앨범 상세):
  - `AlbumDetail` → `PhotoGrid`에 `albumId` 전달(현재 미전달, 추가 필요).
  - "사진 추가": `RequirePermission` 버튼 → `MediaPicker image·multiple` → `addPhotos(albumId, mediaIds)` → invalidate `["album", id]`(+`["albums"]` 썸네일·count).
  - 사진 제거: 각 사진(`<button>` 라이트박스 트리거) **밖** 오버레이로 제거 버튼(중첩 button 금지) → `DeleteConfirmDialog`(or 경량 확인) → `removePhoto(p.id)` → invalidate.

## 9. 횡단 관심사

- **무효화 전략**: 주보=공개 RSC/ISR → `revalidateBulletins()`(updateTag) + `router.refresh()`. 갤러리=회원 client → `queryClient.invalidateQueries`(list 접두키 `["albums"]` / detail `["album", id]`). 미디어 라이브러리=어드민 client → **접두 무효화** `queryClient.invalidateQueries({ queryKey: ["admin","media","list"] })`(params가 키에 포함돼 필터·페이지·MediaPicker 쿼리 전부 갱신; exact 키 금지). 05가 `adminKeys` list 최초 소비자.
- **에러**: 전부 `adminOnError(handlers)`. 클라 사전검증(MediaUploader)으로 413 왕복 최소화. 낙관락 충돌은 `onReedit`로 최신 재조회.
- **DESIGN.md**: 05 마커(`<!-- admin:05 미디어 — admin-data-table · media-uploader · media-references-list -->`, line 523) **아래에만 append-only**로 항목 추가 — 예약명 `admin-data-table`·`media-uploader`·`media-references-list`(=`MediaReferencesDialog`) + 05-내부 `media-picker`·`bulletin-form-modal`·`album-form-modal`·`gallery-photo-manager`. **크로스도메인 공유는 `admin-data-table`·`media-uploader`만**(나머지는 05 전용). 가독성 우선, 토큰·`typo.*` 공유, hex·px 인라인 금지.
- **JSX 규칙**: 조건부는 삼항(`cond ? <X/> : null`), 아이콘 `lucide-react`(currentColor·size), 이모지 금지.

## 10. 파일 인벤토리

**신규**
- `src/lib/admin/apiUpload.ts`
- `src/components/admin/MediaUploader.tsx` (+ test)
- `src/components/admin/MediaPicker.tsx` (+ test)
- `src/components/admin/DataTable.tsx` (+ test)
- `src/lib/api/media.admin.ts`
- `src/lib/api/gallery.admin.ts`
- `src/lib/api/bulletins.admin.ts`
- `src/components/admin/media/MediaLibrary.tsx` (+ test)
- `src/components/admin/media/MediaReferencesDialog.tsx` (+ test) — DESIGN `media-references-list`
- `src/app/(site)/mypage/manage/media/page.tsx`
- `src/components/bulletins/BulletinFormDialog.tsx` (+ test)
- `src/components/bulletins/BulletinAdminActions.tsx` (+ test)
- `src/components/gallery/AlbumFormDialog.tsx` (+ test)
- `src/components/gallery/GalleryAdminActions.tsx` (+ test)
- (zod 스키마) `src/components/bulletins/schemas.ts`, `src/components/gallery/schemas.ts`

**수정**
- `src/lib/api/types.ts` (`BulletinDetailResponse` 추가 + 주석; `GalleryAlbumDetailResponse.version` 주석을 "PATCH에서 읽어 전송"으로 갱신 — 기존 "전송 안 함"은 stale)
- `src/lib/api/bulletins.ts` (`tags: ["bulletins"]`)
- `src/lib/admin/revalidate.ts` (`revalidateBulletins`)
- `src/app/(site)/bulletins/page.tsx` (헤더 액션 + 행 액션 래퍼)
- `src/components/cards/BulletinRow.tsx` (선택적 `actions?` 슬롯)
- `src/components/gallery/AlbumList.tsx` (`AlbumListAction` 주입)
- `src/components/gallery/AlbumDetail.tsx` (`AlbumDetailActions` + `albumId`→PhotoGrid)
- `src/components/gallery/PhotoGrid.tsx` (`albumId` prop + 제거 오버레이)
- `.claude/rules/DESIGN.md` (어드민 공용 05 마커 아래 append)

## 11. 리스크 & 구현 직전 검증 항목

> ⚠️ **차단 게이트(1~3)는 Phase A 착수 전 실행 백엔드로 실증**. 실패 시 설계 분기를 먼저 확정한 뒤 진행.

1. **[차단] 갤러리 addPhotos `files` required:true** — 머신 스펙은 `files` 필수 표기, 산문은 mediaIds-only 재사용 허용. 통합 모델은 mediaIds만 전송 → **mediaIds-only 추가가 200인지 먼저 확인**. 400이면 즉시 폴백(빈 files 파트 동봉 또는 신규파일 직접 멀티파트)을 §5.2에 반영. Phase C 핵심이라 단일 가정 금지.
2. **[차단] 미디어 `file` 본문 인코딩** — 머신 스펙은 `application/json{file:binary}`(springdoc 쿼크). multipart/form-data + 필드명 `file`이 수용되는지 첫 업로드(성공 200)로 실증. 거부 시 인코딩 보정.
3. **[차단] authFetch FormData 재시도 본문 유실** — 업로드 직전 access 만료 시 401→refresh→재시도 경로에서 FormData 본문이 보존되는지 실증(테스트 §12). 유실 시 §4.1 대안(팩토리/사전갱신) 적용.
4. **`ContentRef.type` 값 casing** — 미정의(opaque string). **라이브 `MEDIA_IN_USE`/references 응답으로 실제 값 확보** 후에야 type→라우트 딥링크 매핑 가능. 그 전엔 `MediaReferencesDialog`는 유형 라벨+제목 텍스트만 표시(분기 금지).
5. **주보 patch version=query / 갤러리 patch version=body** — 모듈에서 위치 혼동 주의(§3 준수).
6. **`getBulletins` 태그 추가가 기존 ISR 동작 깨지지 않는지** — `revalidate: 60` 유지 + tags 병기. 빌드(CI 백엔드 없음) 영향 확인.

## 12. 테스트 전략

vitest, 프로젝트 관례(globals:false 명시 import·jest-dom 없음·next/link mock·장식 img alt=""). 80%+ 목표.
- `apiUpload`: authFetch mock — query 직렬화(배열 반복)·FormData 전달·204/parseJson·**401 재시도 시 FormData 본문 보존**(§11.3).
- `getBulletin`: `cache:"no-store"` 호출 실증(stale version 방지).
- `MediaUploader`: 형식·용량 클라 검증, 업로드 호출, onUploaded.
- `DataTable`: 컬럼 렌더·empty·loading·actions·rowKey.
- `MediaPicker`: 탭 전환·single/multiple 선택·onConfirm mediaIds.
- `MediaLibrary`: 필터·페이지네이션·차단형 삭제 분기(inUse→InUseDialog / 아니면 confirm→delete)·백스톱 409.
- 각 FormDialog(주보·앨범): 검증·create/edit 분기·version 동봉·충돌(onReedit)·필드 에러 매핑.
- `addPhotos`/`removePhoto`, 주보 행 액션(앵커 밖 배치) 렌더.

## 13. 구현 순서 & 완료 게이트

**A(공유 인프라 + 미디어 라이브러리) → B(주보) → C(갤러리)**.
- A가 `apiUpload`·`MediaUploader`·`MediaPicker`·`DataTable`·미디어 API를 생산 → B·C가 소비.
- 각 단계 후 게이트: `pnpm lint` · `npx tsc --noEmit` · `pnpm test`(= vitest run) · `pnpm build`(CI 백엔드 없음 — `connection()` 패턴 준수).

## 14. 범위 밖 (Out of Scope)

- 06(분류)·07(거버넌스)의 DataTable 소비는 별도 도메인.
- 미디어 원본 실제 삭제 외 경로(연결 해제는 앨범/주보 삭제로만, 원본 보존).
- 어드민 화면 정교한 비주얼 디자인(DESIGN.md Known Gaps — 가독성 우선).
- 드래그앤드롭 업로드·정렬(sortOrder 편집)·이미지 크롭(미요구, YAGNI).
