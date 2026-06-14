# 어드민 트랙(02~07) 병렬 실행 전략

> 출처: 에픽 `.issues/admin/00-epic.md`(GitHub #34), 01 기반 설계 `docs/superpowers/specs/2026-06-14-admin-foundation-design.md`.
> 신뢰 소스: 도메인별 이슈 `.issues/admin/02~07`, `docs/api-docs.json`, `.claude/rules/DESIGN.md`.
> 이 문서는 6개 도메인이 공유하는 **조율(coordination) 기준**이다. 각 도메인은 자기 이슈를 별도 brainstorm→plan→implement로 진행하되, 아래 의존·단일생산자·충돌회피 규칙을 따른다.

## 목적

01-core(권한 게이트·쓰기 헬퍼·뮤테이션 규약·삭제 다이얼로그·관리 허브 스캐폴드)는 완료·머지됨(#34). 백엔드 어드민 API는 02~07 전부 `api-docs.json`에 존재(실측 확인, 차단 0). 남은 작업은 6개 운영 도메인 연동이며, 이를 **git worktree 기반 병렬**로 진행하되 도메인 간 빌드 의존과 공유 파일 충돌을 안전하게 관리한다.

## 전제 (실측 검증 완료)

- 01-core 공유 토대 존재·재사용: `apiMutate`·`adminOnError`·`isOptimisticLockConflict`·`adminKeys`·`RequirePermission`·`useHasPermission`/`useHasAnyPermission`·`DeleteConfirmDialog`·`ManageHub`·`/mypage/manage` 스캐폴드.
- `manageDomains.ts`(11개 도메인 매핑)·`handleApiError.ts`(errorCode 6종: OPTIMISTIC_LOCK_CONFLICT·MEDIA_IN_USE·DUPLICATE_RESOURCE·ROLE_IN_USE·DEPARTMENT_HAS_CHILDREN·FILE_SIZE_EXCEEDED)는 **이미 완비 → 02~07은 읽기만, 수정 불요**. 따라서 충돌원 아님.
- 백엔드: 02~07 모든 도메인 `backendReady=true`. (단 04 어드민 부서 read는 admin 전용 GET이 없어 공개 `GET /api/departments` 평배열을 받아 `parentId`로 프론트 트리 조립.)

## 의존 그래프 (생산자 → 소비자)

01에서 이연된 공유 컴포넌트의 **단일 생산자**가 빌드 의존을 만든다.

| 도메인 | GitHub | 생산(BUILD) | 소비(의존 도메인) |
|---|---|---|---|
| **02** 콘텐츠(설교·공지) | #36 | `markdown-editor`·`tag-multiselect`·**인라인 액션 패턴** | — (01만) |
| **04** 부서 | #38 | — | — (01만, 완전 격리) |
| **03** 일정 | #37 | `datetime-picker` | 02(tag-multiselect·인라인패턴) |
| **05** 미디어(갤러리·주보·미디어) | #39 | `admin-data-table`·`media-uploader` | 02(인라인패턴·tag-multiselect) |
| **06** 분류(태그·직분) | #40 | — | 05(admin-data-table) |
| **07** 거버넌스(회원·역할·권한) | #41 | — | 05/06(admin-data-table), 01(DeleteConfirmDialog requirePassword) |

의존 엣지: `03→02`, `05→02`, `06→05`, `07→05`, `07→06`.

## 단일 생산자 규칙 (철칙 1)

공유 컴포넌트는 **한 도메인만** 최초 BUILD·머지하고, 나머지는 머지 후 **소비만** 한다(동시 신규 생성 = 동일 경로 충돌·중복 구현, 최대 재작업원).

- `src/components/admin/MarkdownEditor.tsx` · `TagMultiSelect.tsx` · 인라인 액션 패턴 → **02 단독 생산**
- `src/components/admin/DataTable.tsx` · `MediaUploader.tsx` → **05 단독 생산**
- `src/components/admin/DateTimePicker.tsx` → 03 자체 생산(소비자 없음)

> 03·05는 02 머지 전 착수 금지(인터페이스 미확정 재작업 방지). 06·07은 05의 DataTable 머지 후 소비.

## 도메인-로컬 타입 규칙 (철칙 2)

어드민 쓰기 요청 타입은 공유 `src/lib/api/types.ts`가 **아니라** 도메인-로컬로 둔다. 수정 요청 타입에는 낙관락 `version: number` 포함(가이드 8장). `types.ts`는 공개 GET 응답 타입만. (이 규칙은 `types.ts` 헤더 주석에도 명시.)

> **RSC 번들 경계 (02 실측 학습)**: 공개 GET 모듈(`sermons.ts`·`notices.ts` 등)은 서버 컴포넌트가 import한다. 어드민 쓰기 함수는 `apiMutate`→`authFetch`→`authStore`(`useSyncExternalStore`, 클라이언트 전용) 체인을 끌어오므로, 같은 모듈에 두면 Turbopack이 이를 **서버 번들에 포함시켜 빌드 실패**한다. 따라서 어드민 쓰기 **함수·요청 타입은 `src/lib/api/{도메인}.admin.ts`로 분리**하고(공개 GET 모듈에서 `export type`만 재노출 가능), 클라이언트 컴포넌트는 `*.admin.ts`에서 직접 import한다. 03(events)·05(gallery·bulletins)처럼 공개 GET을 RSC가 쓰는 도메인은 반드시 이 분리를 따른다. 운영 전용 화면만 있는 04·06·07은 RSC 프리필이 없으면 분리 불요.

## 공유 파일 충돌 핫스팟

| 파일 | 건드리는 도메인 | 전략 |
|---|---|---|
| `.claude/rules/DESIGN.md` | 02~07 전부 | **최대 핫스팟.** wave0에서 `### 어드민 공용` 구획 + 도메인별 주석 마커를 선배치. 각 도메인은 **자기 구획 주석 아래에만** append. 통합 막판 DESIGN.md는 항목 추가뿐이라 수동 해소 용이. |
| `src/lib/api/types.ts` | 02·03·05 | 철칙 2(도메인-로컬 타입)로 회피. 공유 응답 필드(version 등)만 불가피 시 추가. |
| `src/components/admin/DataTable.tsx` | 05·06·07 | 철칙 1: 05 단독 생산. 06·07은 머지 후 소비. |
| `manageDomains.ts`·`handleApiError.ts`·`mypage/manage` layout/page | 없음 | 01-core가 이미 완비 → 수정 금지(읽기만). 충돌원 아님. |

## 웨이브 계획

| Wave | 도메인 | 근거 |
|---|---|---|
| **0** 선행 | 공유 스캐폴드(#35 베이스) | DESIGN.md `### 어드민 공용` 구획 마커 + types.ts 컨벤션 주석 + 본 전략 문서. main 머지 후 wave1이 분기. |
| **1** | **02**(#36) · **04**(#38) | 의존 0. 02=공유 컴포넌트 생산자(03·05 선행조건). 04=파일 0중첩 완전 격리. 안전 동시. |
| **2** | **03**(#37) · **05**(#39) · **06**(#40) | 02 머지 후. 05가 DataTable 생산 → 06이 소비(웨이브 내 미니 순서: 05 DataTable 머지 후 06 결합). |
| **3** | **07**(#41) | 05/06 DataTable + 01 DeleteConfirmDialog 소비. 가장 민감(권한 위계 가드·임시비번 1회표시·약관 일괄 리셋) → 단독 격리 + security-reviewer. |

## worktree 운영

- **베이스**: `#35`(`20260614_#35_어드민_공용_인프라_권한_게이트_관리_화면_토대`) 브랜치에 wave0 스캐폴드 커밋. 02·04는 #35에서 분기.
- **브랜치 네이밍**(정식 컨벤션, 커밋 툴이 #번호 자동 추출): `20260614_#36_콘텐츠_등록_수정_삭제` · `20260614_#37_일정_등록_수정_삭제` · `20260614_#38_부서_계층_관리` · `20260614_#39_갤러리_주보_미디어_라이브러리_관리` · `20260614_#40_분류_운영_항목_관리` · `20260614_#41_회원_역할_권한_거버넌스`. 베이스 = `20260614_#35_어드민_공용_인프라_권한_게이트_관리_화면_토대`.
- **위치**: 리포 루트의 `.worktrees/`(gitignore 등록). 예: `.worktrees/36-content`, `.worktrees/38-departments`. 각 worktree에서 Next/pnpm를 실행하므로 부모 리포 빌드와 격리된다.
- **node_modules**: worktree마다 별도. 각 worktree에서 `pnpm install` 필요(pnpm은 worktree 간 자동 공유 안 함).
- **동시 worktree 수**: 2개 기본(안전), 최대 3개. 6병렬은 비권장(생산자→소비자 의존이 막고 DESIGN.md 동시편집 비용이 이득 상쇄).
- **통합 순서**: (0) #35 스캐폴드 → main / (1) #36·#38 → main / (2) #36 머지 후 wave2 분기, #39(DataTable) → main 먼저, 이어 #37·#40 / (3) #41 마지막. 각 머지 후 다음 worktree는 `git rebase main`으로 최신 공유 자산 수령.

## 리스크

- **DataTable 이중 생산**: 05·06 동시 신규 생성 시 충돌. 05 단독 생산 못박기.
- **인터페이스 선확정 미준수**: 02 머지 전 03·05 착수 시 재작업. wave 게이트 준수.
- **DESIGN.md 6중 편집**: 구획 마커 + append-only로 완화. 통합 막판 몰림 주의.
- **types.ts 공유 확장 유혹**: 철칙 2 강제.
- **07 민감도**: 권한 위계 가드·임시비번·약관 리셋은 보안 치명 → 단독 웨이브 + security-reviewer.
- **낙관락 version 누락**: 도메인 요청 타입에 version 필수.
- **04 트리 데이터 소스**: admin 전용 GET 없음 → 공개 `GET /api/departments` 평배열 parentId 조립.

## 도메인별 진입 모델

- **공개 인라인 액션**(공개 서버 컴포넌트 위 client island): 02(설교·공지 목록/상세), 03(일정 캘린더/상세), 05 일부(갤러리 상세·주보 목록).
- **운영 전용 화면**(`/mypage/manage/*`): 04(부서), 05 일부(미디어 라이브러리), 06(태그·직분), 07(회원·역할).
- 권한 게이팅 단일 기준: `useMe()` 라이브 `permissions`(토큰 스냅샷 아님). 게이트는 UX 최적화, 서버가 2단 방어.
