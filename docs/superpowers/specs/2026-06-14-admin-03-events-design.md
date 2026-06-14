# 어드민 03 — 일정 등록·수정·삭제 설계

> 출처 이슈: `.issues/admin/03-events.md`(GitHub #37). 에픽 #34. 브랜치 `20260614_#37_일정_등록_수정_삭제`.
> 상위 조율: `docs/superpowers/specs/2026-06-14-admin-track-parallelization.md`(웨이브·단일생산자·`.admin.ts` 분리). 선행: 02(#36, main 머지 완료) — `MarkdownEditor`·`TagMultiSelect`·인라인 액션 패턴 소비.
> 신뢰 소스: `docs/api-docs.json` · `docs/church-frontend-guide.md`(8·13·15장) · `.claude/rules/DESIGN.md`.

## 1. 목적·범위

권한 보유 운영자가 **공개 캘린더·상세에서 일정을 등록·수정·삭제**한다. 진입 = toolbar "새 일정" + 상세/모달 수정·삭제 → **팝업 Dialog 폼**. 03은 어드민 트랙 공유 자산 `DateTimePicker`의 **단일 생산자**(date-fns 없이 네이티브). 02의 `MarkdownEditor`·`TagMultiSelect`·인라인 액션 패턴·`.admin.ts` 분리 규칙을 소비한다.

## 2. 진입·아키텍처 원칙

- 공개 일정 페이지는 RSC(목록·상세 `revalidate:60` ISR, 조회수 부수효과 없음). 캘린더는 단일 client island `EventCalendar`, 상세는 **딥링크 라우트 `/events/[id]`(RSC) + 캘린더 클릭 모달 `EventDetailModal`(client)** 이중 구조. 권한 보유 시 액션은 client island로 주입(페이지 캐시 경계 보존).
- 어드민 쓰기 = 클라이언트 + `useMutation` + `apiMutate`. 게이팅 = `useMe()` 라이브 `EVENT_WRITE`. `.admin.ts` 분리(공개 GET 모듈 `events.ts`를 RSC가 import하므로 쓰기 함수는 `events.admin.ts`로).
- 날짜: 서버는 offset 없는 LocalDateTime(KST 가정). 읽기는 `parseServerDate`(+09:00 부착). **쓰기는 네이티브 `datetime-local` naive 값을 그대로**(offset 부착 금지 — naive↔naive 대칭). date-fns 미설치·미사용(`calendar.ts`도 Date.UTC+Intl), 라이브러리 추가 금지.

## 3. 모듈 구조 (신규)

**03 단독 생산 (`src/components/admin/`, 소비자 없음 — 03 자체용)**
| 파일 | 내용 |
|---|---|
| `DateTimePicker.tsx` | 네이티브 `<input type="datetime-local">`(allDay 시 `type="date"`) 래퍼. `Input` variant.text 토큰·error 배선 상속. props `value: string`(datetime-local 형식)·`onChange`·`allDay?`·`id?`·`error?` |

**날짜 직렬화 (`src/lib/date.ts` 확장)**
| 함수 | 동작 |
|---|---|
| `toServerDateTime(local, allDay?)` | `"2026-06-14T10:00"`→`"2026-06-14T10:00:00"`. allDay/`date`는 `"2026-06-14"`→`"2026-06-14T00:00:00"`. offset 없이 |
| `toLocalInput(serverIso, allDay?)` | 서버 문자열 앞 16자(datetime) 또는 10자(date) 슬라이스 → 입력 프리필. `parseServerDate` 거치지 않음(TZ 안전) |

round-trip 단위 테스트로 정합 검증(`toServerDateTime` 후 `parseServerDate` KST 일치).

**API 도메인-로컬 (`src/lib/api/events.admin.ts` 신규)**
- `EventCreateRequest`(필수 `title`·`startAt` / 선택 `description`·`location`·`endAt`·`allDay`·`tagIds`) · `EventUpdateRequest`(= Create + `version`) · `createEvent`(POST)/`updateEvent`(PUT)/`deleteEvent`(DELETE), `apiMutate` 래핑. **`endAfterStart` 제외**(서버 파생 검증값 추정), **`patchEvent` 생략**(인라인 부분수정 용처 없음 — YAGNI). 상단에 "서버 컴포넌트 import 금지" 주석.

**폼·스키마·액션 (`src/components/events/`)**
| 파일 | 내용 |
|---|---|
| `EventFormDialog.tsx` | 팝업 Dialog 폼(client). RHF+zod. title(Input)·시작/종료(DateTimePicker)·종일(Checkbox)·장소(Input)·본문(MarkdownEditor)·태그(TagMultiSelect). controlled `open`/`onOpenChange`, `mode`/`initial?` |
| `schemas.ts` | zod: `title`·`startAt` 필수, `endAt` 있으면 `> startAt`(refine), `allDay` |
| `EventAdminActions.tsx` | `EventListAction`(toolbar "새 일정"→생성 Dialog) · `EventDetailActions({event})`(수정→편집 Dialog 프리필 / 삭제→`DeleteConfirmDialog`). Dialog open 상태 보유 |

**주입 (3곳)**
- `src/app/(site)/events/page.tsx` — h1을 flex 래퍼로 감싸 `EventListAction`
- `src/app/(site)/events/[id]/page.tsx` — `EventDetailView` 근처 `EventDetailActions`(event=RSC fetch 상세)
- `src/components/events/EventDetailModal.tsx` — `EventDetailActions`(event=모달 fetch 상세, version 포함)

**DESIGN.md** — `admin:03` 마커 아래 `datetime-picker`·`event-form-modal` append

## 4. API 도메인-로컬 타입 (api-docs.json 실측)

```ts
// src/lib/api/events.admin.ts (신규)
interface EventCreateRequest {
  title: string;            // 필수, ≤200
  startAt: string;          // 필수, LocalDateTime(offset 없음)
  description?: string;     // 마크다운, ≤50000
  location?: string;        // ≤200
  endAt?: string;           // LocalDateTime, 없으면 점 이벤트
  allDay?: boolean;
  tagIds?: number[];
}
interface EventUpdateRequest extends EventCreateRequest { version: number; } // PUT, required: startAt·title·version
```
응답 `EventDetailResponse`(id·title·description?·location?·startAt·endAt?·allDay·createdAt·updatedAt·version·tags — `types.ts`에 이미 존재). 엔드포인트: POST `/api/admin/events`, PUT·DELETE `/api/admin/events/{id}`(모두 `EVENT_WRITE`).

## 5. 데이터 흐름

| 액션 | 호출 | 성공 처리 |
|---|---|---|
| 등록 | POST `/api/admin/events` | `router.refresh()`(캘린더 ISR 재요청) + 토스트(공개 반영 최대 1분 안내) + Dialog 닫기 |
| 수정 | **PUT** `/{id}`(전체 필드+version, `toServerDateTime` 직렬화) | `router.refresh()` + Dialog 닫기 |
| 삭제 | DELETE `/{id}` → 204 | `DeleteConfirmDialog` 확인 → 토스트 + 닫기(모달이면 `router.refresh`, 딥링크 라우트면 `/events` 이동) |

- **낙관락 409 OPTIMISTIC_LOCK_CONFLICT**: `adminOnError`의 `onReedit` 안내 토스트(자동 머지 안 함). 응답 version은 post-increment.
- **검증 400 INVALID_INPUT_VALUE**: `onFieldErrors` → RHF `setError`. 종료>시작은 클라 zod refine으로 1차 차단.
- 분기는 `errorCode`로만.

## 6. 결정 사항 (확정)

- 폼 = Dialog 팝업. 수정/삭제 액션 = 캘린더 모달 + 딥링크 라우트 둘 다. 셀 클릭 등록은 이연(toolbar "새 일정"만).
- 종일 체크 시 시각 숨김(`date` 입력) + `T00:00:00` 직렬화.
- 본문 description = `MarkdownEditor`(상세가 `MarkdownContent`로 렌더하므로 일관).
- 편집 = PUT(전체 송신). PATCH 미사용.
- `EventCardResponse`엔 version 없음 → 모달/라우트 액션은 `EventDetailResponse.version` 사용.

## 7. 알려진 트레이드오프 / 백엔드 확인 권장

- **`endAfterStart`**: Create/Update 스키마의 bool 필드. description·required 없음 → 서버 파생 검증 게터로 추정, 요청에서 제외. zod refine으로 클라 검증(서버도 종료>시작 검증). 백엔드 동작 확인 시 보완.
- **`datetime-local` 초 생략**: 값이 분 단위라 `:00` 보강해 전송. 백엔드 LocalDateTime 파서가 초 생략을 허용하면 그대로도 가능 — 보강이 안전.
- **EventDetailModal 액션화**: 모달이 `EventDetailResponse`(version 포함)를 이미 fetch하므로 그대로 전달. 모달이 `useMe`/`RequirePermission` 의존 client로 확장됨(기존도 client).

## 8. 재사용 맵 (재구현 금지)

| 필요 | 재사용(기존) |
|---|---|
| 어드민 JSON 쓰기 | `apiMutate<T>(path,{method,body})`(204 void) |
| onError·낙관락 | `adminOnError(handlers)` / `isOptimisticLockConflict` |
| 권한 게이트 | `RequirePermission permission="EVENT_WRITE"` |
| 삭제 확인 | `DeleteConfirmDialog`(requirePassword=false) |
| errorCode 분기 | `handleApiError`(onFieldErrors·onReedit) |
| 본문 에디터·태그 | `MarkdownEditor`·`TagMultiSelect`(02 생산, 수정 금지) |
| 팝업·입력·토글·버튼 | `Dialog`(+Header/Footer/Title)·`Input`·`Checkbox`·`Button`/`buttonVariants` |
| 날짜 읽기·표시 | `parseServerDate`·`formatDate`/`formatClockTime`(date.ts) |
| 캘린더 코어 | `calendar.ts`(Date.UTC+Intl, 재사용 가능) |
| 폼 표준 | RHF + `zodResolver` + `setError` + `notify` |

## 9. 테스트 (TDD: RED→GREEN→REFACTOR, 80%+)

frontend-test-conventions 준수(vitest `globals:false`, jest-dom 없음, `fireEvent`, Radix Dialog 열기는 트리거 click/제어 open).
- 날짜 util: `toServerDateTime`/`toLocalInput` round-trip, allDay(date) 분기.
- `DateTimePicker`: allDay에 따라 `type` 전환, value in/out.
- events.admin API: POST/PUT/DELETE 정확 path·body(version)·직렬화.
- zod: title·startAt 필수, endAt>startAt refine.
- `EventFormDialog`: 등록 payload, 수정 version 포함, 검증 메시지, 종일 토글 시 시각 숨김.
- `EventAdminActions`: 권한 보유/미보유 게이트, 삭제 다이얼로그 흐름, Dialog open 전이.

## 10. DESIGN.md 등록

`admin:03` 마커 아래 append(자기 구획만):
- `datetime-picker`: 네이티브 `datetime-local`/`date` 래퍼(라이브러리 없이). allDay 시 date. `Input` 토큰 상속.
- `event-form-modal`: 일정 등록·수정 팝업 Dialog 폼. DateTimePicker·MarkdownEditor·TagMultiSelect·Checkbox(종일) 조합.

## 11. 완료 기준

- [ ] `DateTimePicker` 신규(allDay 모드) + `toServerDateTime`/`toLocalInput`(round-trip 테스트)
- [ ] `events.admin.ts`(요청 타입·version·create/update/delete)
- [ ] `EventFormDialog` 팝업(등록·수정·종일·종료>시작 검증·낙관락·지연 토스트)
- [ ] 인라인 액션: toolbar 등록 + 상세/모달 수정·삭제
- [ ] DESIGN.md `admin:03` 2항목 등록
- [ ] 단위 테스트 80%+, `pnpm lint`·`npx tsc --noEmit`·`pnpm test`·`pnpm build` 통과
- [ ] hex·px 인라인 0·`typo.*`·UI 이모지 0·아이콘 lucide·JSX 조건부 삼항
