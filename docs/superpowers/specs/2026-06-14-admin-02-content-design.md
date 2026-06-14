# 어드민 02 — 콘텐츠(설교·공지) 등록·수정·삭제 설계

> 출처 이슈: `.issues/admin/02-markdown-content.md`(GitHub #36). 에픽 #34. 브랜치 `20260614_#36_콘텐츠_등록_수정_삭제`.
> 상위 조율: `docs/superpowers/specs/2026-06-14-admin-track-parallelization.md`(웨이브·단일생산자 2철칙). 01 토대: `2026-06-14-admin-foundation-design.md`.
> 신뢰 소스: `docs/api-docs.json`(스키마 단일 진실) · `docs/church-frontend-guide.md`(4·5·8·15장) · `.claude/rules/DESIGN.md`.

## 1. 목적·범위

권한 보유 운영자가 설교·공지를 등록·수정·삭제한다. 진입 = **공개 페이지 인라인 액션 + 전용 편집 라우트**. 02는 어드민 트랙 공유 자산(`MarkdownEditor`·`TagMultiSelect`·인라인 액션 패턴)의 **단일 생산자**로, 이를 최초 BUILD해 03(일정)·05(미디어)가 머지 후 소비한다(철칙 1).

**이연(02 범위 외)**
- 본문 이미지·PDF **업로드** UI → 05(MediaUploader 단독 생산) 이후. 02는 본문 마크다운 작성·미리보기(`media:{id}` 렌더)까지. (현재 참조할 미디어 라이브러리 자체가 없음)
- **신규 태그 생성** → 06(태그 관리, TAG_MANAGE 권한). 02 `TagMultiSelect`는 기존 태그 선택만.

## 2. 진입 모델·아키텍처 원칙

- 공개 페이지(`/sermons`·`/notices` 목록/상세)는 100% RSC(목록 `revalidate:60` ISR, 상세 `cache:'no-store'`). 권한 보유 시 액션 노출은 **RSC 안에 `'use client'` island 한 줄 삽입**이 유일 경로(페이지를 client로 전환 금지 — 캐시 경계 보존).
- 어드민 쓰기 = 클라이언트 + TanStack Query `useMutation` + `apiMutate`(authFetch). 게이팅 = `useMe()` 라이브 `permissions`(`SERMON_WRITE`·`NOTICE_WRITE`), 토큰 스냅샷 아님. 게이트는 UX, 서버가 `/api/admin/**` 2단 방어.
- 도메인-로컬 타입(철칙 2): 어드민 요청 타입은 `src/lib/api/sermons.ts`·`notices.ts`에 선언(공유 `types.ts` 확장 금지). 수정(PUT/PATCH) 요청에 낙관락 `version` 포함.

## 3. 모듈 구조 (신규 파일)

**공유 생산물 `src/components/admin/` (03·05 소비 — 인터페이스 선확정 의무)**
| 파일 | 내용 |
|---|---|
| `MarkdownEditor.tsx` | `Tabs`(작성/미리보기) + `Textarea` + `MarkdownContent`(미리보기). `value`/`onChange` 제어. 미리보기는 탭 활성 시에만 `renderMarkdown`(키 입력마다 동기 변환 회피). 첨부 UI 자리는 주석 placeholder(05 이후) |
| `TagMultiSelect.tsx` | `Popover` + 검색 + `Checkbox` 목록 + 선택 `Badge` 칩. props `value: number[]`·`onChange`·옵션은 `getTags`(useQuery). 신규 생성 없음 |

**UI 프리미티브 `src/components/ui/`**
| 파일 | 내용 |
|---|---|
| `Textarea.tsx` | 멀티라인 입력(현재 없음). `Input` variant.text 스타일·`error`/`aria-invalid`/caption 배선 이식(`h-12`→`min-h`) |

**API 도메인-로컬**
- `src/lib/api/sermons.ts` += 요청 타입 + `createSermon`·`updateSermon`·`patchSermon`·`deleteSermon`(apiMutate 래핑)
- `src/lib/api/notices.ts` += 동일(+ isPinned)

**도메인 폼·액션·뮤테이션 `src/components/{sermons,notices}/`**
| 파일 | 내용 |
|---|---|
| `SermonForm.tsx`·`NoticeForm.tsx` | client. RHF+zod, `MarkdownEditor`·`TagMultiSelect`·필드, 저장/취소. 등록·수정 공용(mode prop) |
| `schemas.ts` | zod 스키마(설교 필수 `title·preacher·preachedAt` / 공지 필수 `title`) + `z.infer` 타입 |
| `SermonAdminActions.tsx`·`NoticeAdminActions.tsx` | 인라인 액션 island. 목록 toolbar('새 X' Link)·상세(수정 Link·삭제 버튼) / 공지 + 고정 토글 |
| `useSermonMutations.ts`·`useNoticeMutations.ts` | `useMutation`(mutationFn=apiMutate, onError=adminOnError, onSuccess=invalidate+`router.refresh`) |

**라우트 `src/app/(site)/`** — RSC가 권한 게이트(`RequirePermission`) + 폼 렌더. 수정은 서버에서 상세 프리필 후 폼에 전달
- `sermons/new/page.tsx` · `sermons/[id]/edit/page.tsx` (공지 동일) → `/sermons/new`·`/sermons/{id}/edit`

**DESIGN.md** — `<!-- admin:02 -->` 마커 아래 `markdown-editor`·`tag-multiselect`·`admin-inline-action` append(자기 구획만).

## 4. API 도메인-로컬 타입 (api-docs.json 실측)

설교(`/api/admin/sermons`):
```ts
// src/lib/api/sermons.ts (신규)
interface SermonCreateRequest { title: string; preacher: string; preachedAt: string; // 필수
  series?: string; scripture?: string; content?: string; videoUrl?: string; audioUrl?: string; tagIds?: number[]; }
interface SermonUpdateRequest extends SermonCreateRequest { version: number; } // PUT, 전체 교체(미지정 선택 필드는 비워짐)
interface SermonPatchRequest { version: number; // 필수. 아래 전부 선택 — 보낸 필드만 적용
  title?: string; preacher?: string; preachedAt?: string; series?: string; scripture?: string;
  content?: string; videoUrl?: string; audioUrl?: string; tagIds?: number[]; } // tagIds 미전송 시 태그 미변경
```
제약: `title≤200`·`preacher≤100`·`series≤100`·`scripture≤200`·`content≤50000`(md, `media:{id}`)·`videoUrl/audioUrl≤500`·`preachedAt` `yyyy-MM-dd`. 응답 `SermonDetailResponse`(version 포함, 이미 `types.ts`에 존재).

공지(`/api/admin/notices`):
```ts
// src/lib/api/notices.ts (신규)
interface NoticeCreateRequest { title: string; content?: string; isPinned?: boolean; tagIds?: number[]; } // 필수 title
interface NoticeUpdateRequest { title: string; version: number; content?: string; isPinned?: boolean; tagIds?: number[]; } // PUT
interface NoticePatchRequest { version: number; title?: string; content?: string; isPinned?: boolean; tagIds?: number[]; } // PATCH(고정 토글)
```
제약: `title≤200`·`content≤50000`. PUT은 `isPinned` 미지정 시 false로 덮어씀 → 전체 저장은 폼의 현재 isPinned를 항상 송신.

## 5. 데이터 흐름

| 액션 | 호출 | 성공 처리 |
|---|---|---|
| 등록 | POST `/api/admin/sermons`(`notices`) | `/sermons/{id}` 이동 + 토스트(공개 목록 최대 60s 반영 지연 안내) |
| 수정(전체) | **PUT** `/{id}`(version 포함, 전체 필드) | 상세 이동 + `router.refresh` |
| 공지 고정 토글 | **PATCH** `/{id}` `{isPinned, version}` | `router.refresh` |
| 삭제 | DELETE `/{id}` → 204 | `DeleteConfirmDialog`(requirePassword=false) 확인 후 목록 이동 |

- **낙관락 409 OPTIMISTIC_LOCK_CONFLICT**: `adminOnError`의 `onReedit`이 최신본 재조회 → 폼 `version` 갱신 + "다른 사용자가 먼저 수정했습니다" 토스트(가이드 8장). 자동 머지 안 함.
- **검증 400 INVALID_INPUT_VALUE**: `onFieldErrors`로 서버 `FieldError{field,reason}` → RHF `setError(field,{message:reason})`. 폼 미매핑 필드는 `notify.error` 폴백.
- **그 외 errorCode**: `handleApiError` 기본 토스트. 분기는 `errorCode`로만(status/title 금지).

## 6. 결정 사항 (확정)

- 목록 카드/행 = 전체 단일 `<Link>`(중첩 `<a>` 금지) → **목록엔 "새 설교/새 공지" 등록 버튼만, 개별 수정/삭제는 상세에서**.
- 전체 저장=PUT(현재 폼 전체 송신), 인라인 고정=PATCH(`{isPinned, version}`만).
- 공지 고정 = **`Checkbox`**(Switch 미존재·라이브러리 추가 금지). 라벨 "상단 고정".
- 미리보기 렌더 = 기존 `MarkdownContent` 재사용(신규 렌더러 금지), 탭 전환 시 변환.
- 편집 폼 = 전용 라우트 페이지(모달 아님).

## 7. 알려진 트레이드오프

- **편집 프리필 view count +1**: 어드민 전용 GET 부재 → `getSermon`/`getNotice`(no-store, 조회수+1 부수효과)로 프리필 시 조회수 1 증가. 현재 수용(경미). 추후 백엔드에 비증가 어드민 GET 제안 가능.
- **편집 화면 SiteShell**: `(site)` 그룹이라 하단 CtaBand 노출. 어드민 화면은 DESIGN 범위 밖(Known Gaps)이라 수용.

## 8. 재사용 맵 (재구현 금지)

| 필요 | 재사용(기존) |
|---|---|
| 어드민 JSON 쓰기 | `apiMutate<T>(path,{method,body})` (204 void, FormData 비대상) |
| onError·낙관락 | `adminOnError(handlers)` / `isOptimisticLockConflict` |
| 쿼리키·무효화 | `adminKeys.list('sermons'\|'notices')`·`.detail(domain,id)` |
| 권한 게이트 | `RequirePermission permission="SERMON_WRITE"\|"NOTICE_WRITE"` / `useHasPermission` |
| 삭제 확인 | `DeleteConfirmDialog`(requirePassword=false) |
| errorCode 분기 | `handleApiError`(onFieldErrors·onReedit) |
| 마크다운 렌더 | `MarkdownContent`/`renderMarkdown`(media:{id} 치환) |
| 태그 옵션 | `getTags()` → `TagResponse[]` |
| 탭·드롭다운·칩·버튼·입력 | `Tabs`·`Popover`·`Badge`·`Button`(loading)·`Input`·`Checkbox` |
| 폼 표준 | RHF + `zodResolver` + `setError` + `notify`(ProfileEditForm 패턴) |

## 9. 테스트 (TDD: RED→GREEN→REFACTOR, 80%+)

frontend-test-conventions 준수(vitest `globals:false` 명시 import, jest-dom 없음, next/link mock, 장식 img `alt=""`+`container.querySelector`).
- API 래퍼: 정확 path·method·body(version 포함)·204 처리. (apiMutate mock)
- `MarkdownEditor`: 탭 전환, 미리보기 `MarkdownContent` 렌더, `onChange`.
- `TagMultiSelect`: `getTags` 옵션, 다중선택 `tagIds` in/out, 칩 제거.
- `Textarea`: `error`→보더·caption·aria.
- `SermonForm`/`NoticeForm`: zod 필수 검증, 제출 payload, PUT version 송신, `setError` 매핑, 낙관락 onReedit 재조회·version 갱신.
- 인라인 액션: 권한 보유/미보유 게이트, 삭제 다이얼로그 흐름, 공지 고정 PATCH.

## 10. DESIGN.md 등록

`<!-- admin:02 -->` 마커 아래 append(append-only, 다른 구획 불가침):
- `markdown-editor`: 작성/미리보기 탭 에디터. Tabs+Textarea+MarkdownContent. 토큰 공유.
- `tag-multiselect`: Popover+Checkbox 목록+Badge 칩. 기존 태그 선택.
- `admin-inline-action`: 공개 RSC 위 client island(목록 toolbar·상세 액션). RequirePermission 게이트.

## 11. 완료 기준

- [ ] `MarkdownEditor`·`TagMultiSelect`·`Textarea` 신규(인터페이스 확정, 03·05 소비 가능)
- [ ] `sermons.ts`·`notices.ts` 요청 타입(version)·CRUD 함수
- [ ] 설교 등록·수정(PUT)·삭제 인라인 액션 + 전용 라우트 폼
- [ ] 공지 등록·수정·삭제 + 고정 토글(PATCH)
- [ ] 낙관락 재조회·검증 setError·공개 반영 지연 토스트
- [ ] DESIGN.md `<!-- admin:02 -->` 3항목 등록
- [ ] 단위 테스트 80%+, `pnpm lint`·`npx tsc --noEmit`·`pnpm test` 통과
- [ ] hex·px 인라인 0·`typo.*`·UI 이모지 0·아이콘 lucide·JSX 조건부 삼항
