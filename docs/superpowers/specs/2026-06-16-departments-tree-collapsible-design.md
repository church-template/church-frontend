# 부서 관리 UI — 접이식 단일 트리(재개편) 설계

- **대상**: 어드민 04 부서 계층 관리 화면(`/mypage/manage/departments`) 표현 계층
- **이슈**: #38 후속(같은 브랜치)
- **작성일**: 2026-06-16
- **확정 합의**: 직전 마스터–디테일(2단)을 **접이식 단일 트리**로 교체 + 행은 **좁은 컬럼·정렬 액션(R1)** — 비주얼 컴패니언으로 확정.

---

## 1. 배경 · 목적

직전에 만든 **마스터–디테일(2단)** 은 하나로 연결된 부서 트리를 좌(루트)·우(선택 가지)로 쪼개 "클러스터" 개념을 강제하고, 루트를 클릭해야 하위가 보이는 선택 간접성 때문에 **직관적이지 않다**는 피드백을 받았다. 또한 행을 풀폭 `justify-between`으로 벌려 이름(좌)과 액션(우) 사이가 텅 비어 스캔이 어려웠다.

**개선**: 트리를 깨지 않는 **접이식 단일 트리**로 되돌리고, 행은 **읽기 폭으로 캡한 좁은 컬럼**에 액션을 가까이·가지런히 둔다.
- 전체 계층을 한 트리로 보되, 자식 있는 노드만 `▸/▾`로 접고 펼침 + 전체 펼치기/접기.
- 행은 `max-w`(≈`--container-modal`)로 캡 → 가운데 빈 갭 제거, 액션 우측 정렬·근접.
- 모바일은 **같은 트리 풀폭**(드릴인·선택 간접성 없음), 액션은 아이콘.

**핵심 제약**: 표현 계층만 교체. 데이터(`departments.admin.ts`)·스키마(`schema.ts`)·`DepartmentFormDialog`(`defaultParentId` 포함)·`DeleteConfirmDialog`는 그대로. `treeUtils`에 가시성 평탄화 유틸 2개 추가. **마스터–디테일 컴포넌트(`ClusterList`·`ClusterDetail`)는 제거.**

---

## 2. 범위 · 비목표

**범위 안**
- 신규 `DepartmentTree`(접이식 트리, 캡 컬럼, R1 행) + `DepartmentManager` 재작성.
- 접힘 상태(Set) · 전체 펼치기/접기 · 노드별 ＋하위·수정·삭제 · ＋새 부서.
- `treeUtils`에 `flattenVisible`·`collectCollapsibleIds` 추가.

**비목표 (Non-goals)**
- 마스터–디테일·클러스터(제거 대상).
- 검색·드래그 정렬·접힘 상태 영속화(세션 useState로 충분).
- 데이터·API·스키마·다이얼로그 내부 로직 변경.

---

## 3. 레이아웃 명세

```
[별개 데이터 안내 배너]                              ← Container 폭(현행)
┌ 캡 컬럼(max-w ≈ --container-modal) ──────────────┐
│ 부서 관리        [전체 펼치기][전체 접기][＋새 부서] │ ← 툴바(flex-wrap)
│ ▾ 학생부            · 김집사      ＋하위 수정 삭제 │
│    ▾ 중등부         · 이전도      ＋하위 수정 삭제 │
│       1학년부       · 김교사      ＋하위 수정 삭제 │
│    ▸ 고등부(접힘)   · 박전도      ＋하위 수정 삭제 │
│ ▸ 청년부            · 최목사      ＋하위 수정 삭제 │
│   예배부            · —          ＋하위 수정 삭제 │
└──────────────────────────────────────────────┘
```

- **캡 컬럼**: 툴바+트리를 `max-w-[var(--container-modal)]`(512px)로 묶어 좌측 정렬. 가운데 빈 갭 제거(R1).
- **행 구조**: `[chevron/indent + 이름 · 담당 : flex-1 min-w-0 truncate] [액션 : shrink-0 whitespace-nowrap]`. 이름이 길면 truncate, 액션은 항상 우측 정렬 유지.
- **chevron**: 자식 있는 노드만 `▾`(펼침)/`▸`(접힘) 버튼. **잎 노드는 chevron과 동일 폭의 빈 스페이서**로 이름 시작점을 정렬(들쭉날쭉 방지).
- **들여쓰기**: depth별 spacing 토큰(`pl-*`), 3단↑ 캡(기존 패턴).
- **액션**: 모든 노드 `＋하위`(parentId=node.id)·`수정`·`삭제`. lucide 아이콘 + `lg:` 이상에서 텍스트 라벨 노출(모바일 아이콘-only). 고령 사용자 배려로 데스크톱은 텍스트 병기.
- **툴바**: `전체 펼치기`/`전체 접기`(tertiary) + `＋새 부서`(primary, parentId=null). `flex flex-wrap`.

---

## 4. 컴포넌트 · 데이터 흐름

```
DepartmentManager  ("use client")
  useQuery(adminKeys.list("departments")) → departments
  roots = buildDepartmentTree(departments)
  state: collapsed(Set<number>, 기본 빈=전체 펼침) · createParentId(undefined|null|number) · editId · deleteTarget
  toolbar: 전체 펼치기 → setCollapsed(new Set()) / 전체 접기 → setCollapsed(collectCollapsibleIds(roots)) / ＋새 부서 → setCreateParentId(null)
  └─ DepartmentTree roots · collapsed · onToggle(id) · onCreateChild · onEdit · onDelete
  + DepartmentFormDialog ×2(create/edit) · DeleteConfirmDialog   ← 현행 재사용
```

### 4.1 `DepartmentTree.tsx` (신규) — 접이식 트리(표현)
- 입력: `roots`, `collapsed: Set<number>`, `onToggle(id)`, `onCreateChild(parentId)`, `onEdit(id)`, `onDelete(node)`.
- `flattenVisible(roots, collapsed)`로 가시 행 계산 → R1 행 렌더.
- 각 행: `hasChildren`면 chevron 버튼(클릭 `onToggle(node.id)`), 들여쓰기, 이름·담당, `NodeActions`(＋하위·수정·삭제, 아이콘+lg텍스트).
- `roots` 비면 "등록된 부서가 없습니다."
- 캡 컬럼 `max-w-[var(--container-modal)]`.

### 4.2 `DepartmentManager.tsx` (재작성) — 오케스트레이션
- 안내 배너 + 툴바 + `DepartmentTree` + 다이얼로그.
- 접힘 상태·다이얼로그·삭제 mutation 보유. 선택 상태 **없음**(마스터–디테일 제거 → 단순화).
- 삭제 성공 → `qc.invalidateQueries(adminKeys.list("departments"))` + 토스트. 409/낙관락은 현행 `handleApiError`.

### 4.3 `treeUtils.ts` (추가)
```ts
export interface VisibleRow { node: DepartmentNode; depth: number; hasChildren: boolean }
// 접힌 노드의 하위는 건너뛰는 가시 평탄화(preorder).
export function flattenVisible(nodes: DepartmentNode[], collapsed: Set<number>, depth = 0): VisibleRow[];
// 자식 있는 모든 노드 id(전체 접기용).
export function collectCollapsibleIds(nodes: DepartmentNode[]): Set<number>;
```
(기존 `flattenTree`·`collectDescendantIds`·`findNode`는 유지 — `collectDescendantIds`는 더 이상 매니저에서 미사용이나 다이얼로그 순환방지에서 계속 사용.)

---

## 5. 액션 배선

| 동작 | 트리거 | 처리 |
|---|---|---|
| 접기/펼치기 | 노드 chevron | `onToggle(node.id)` → collapsed 토글 |
| 전체 펼치기/접기 | 툴바 | `setCollapsed(new Set())` / `setCollapsed(collectCollapsibleIds(roots))` |
| 새 최상위 부서 | 툴바 `＋새 부서` | create, `defaultParentId=null` |
| 하위 추가 | 노드 `＋하위` | create, `defaultParentId=node.id` |
| 수정 | 노드 `수정` | edit(`editId`) |
| 삭제 | 노드 `삭제` | `DeleteConfirmDialog` → `deleteDepartment` |

---

## 6. 재사용 / 제거 / 변경

**재사용(무변경)**: `departments.admin.ts` · `schema.ts` · `DepartmentFormDialog.tsx`(`defaultParentId`) · `DeleteConfirmDialog` · `adminOnError`·`notify`·`adminKeys`·`buildDepartmentTree` · page.tsx · `treeUtils`의 `collectDescendantIds`·`findNode`.

**제거**: `ClusterList.tsx`(+test) · `ClusterDetail.tsx`(+test).

**변경**: `treeUtils.ts`(+`flattenVisible`·`collectCollapsibleIds`, +test) · `DepartmentManager.tsx`(재작성, +test) · `.claude/rules/DESIGN.md`(`cluster-list`/`cluster-detail` 마커 제거, `department-tree` 마커 추가, manager 마커 갱신).

**토큰**: 캡 폭 `max-w-[var(--container-modal)]`(메모리 [[tailwind-max-w-tshirt-collision]] 준수 — t-shirt 폭 금지). chevron·들여쓰기·헤어라인·`typo.*`·`bg-primary`/`text-primary` 토큰. hex·px 인라인 금지.

---

## 7. 반응형

- 단일 컬럼이라 데스크톱·모바일 구조 동일(2단·드릴인 없음).
- 액션: 아이콘 항상 + 텍스트 `hidden lg:inline`(모바일 아이콘-only).
- 터치 타깃 ≥48px(`min-h-12`). chevron 버튼도 충분한 히트 영역.

---

## 8. 파일 목록

**신규**: `DepartmentTree.tsx`(+test)
**제거**: `ClusterList.tsx`·`ClusterList.test.tsx`·`ClusterDetail.tsx`·`ClusterDetail.test.tsx`
**변경**: `treeUtils.ts`(+test 추가) · `DepartmentManager.tsx`(+test 재작성) · `.claude/rules/DESIGN.md`

---

## 9. 테스트 (TDD, 80%+)

| 파일 | 검증 |
|---|---|
| `treeUtils.test.ts`(추가) | `flattenVisible` — 접힌 노드 하위 제외·depth·hasChildren · `collectCollapsibleIds` — 자식 있는 id만 |
| `DepartmentTree.test.tsx` | 가시 행 렌더 · chevron 토글(onToggle) · 잎 노드 chevron 없음 · 노드 ＋하위(parentId)·수정·삭제 콜백 · empty |
| `DepartmentManager.test.tsx`(재작성) | 전체 접기 → 루트만 보임 · 전체 펼치기 복귀 · ＋새 부서 create(parent null) · 노드 ＋하위 create(프리셋) · 삭제 확인→deleteDepartment · 안내 배너 |

전체 게이트: `pnpm test` · `npx tsc --noEmit` · `pnpm lint`(0 errors). 수동: dev 서버로 캡 컬럼·접힘·모바일 폭 확인.

---

## 10. 구현 순서(writing-plans 입력)

1. `treeUtils` `flattenVisible`·`collectCollapsibleIds`(+test)
2. `DepartmentTree.tsx`(+test)
3. `DepartmentManager.tsx` 재작성(+test) — 접힘 상태·툴바·다이얼로그
4. `ClusterList`·`ClusterDetail`(+test) 제거(사용자 허락 후 파일 삭제)
5. `.claude/rules/DESIGN.md` 마커 갱신
6. 게이트 + 수동 확인
