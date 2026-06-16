# 부서 관리 UI 개편 — 마스터–디테일(클러스터) 설계

- **대상**: 어드민 04 부서 계층 관리 화면(`/mypage/manage/departments`)의 **표현 계층 재설계**
- **이슈**: #38 후속(같은 브랜치 `20260614_#38_부서_계층_관리`)
- **작성일**: 2026-06-16
- **확정 합의**: 마스터–디테일(C) · 데스크톱 2단 + 모바일 드릴인 · **검색 박스 제외**(v1 단순)

---

## 1. 배경 · 목적

현재 `DepartmentManager`는 전체 부서 트리를 **하나의 평면 들여쓰기 테이블**(`DataTable`)로 렌더한다. 부서가 많아지거나 계층이 깊어지면 한 화면에 길게 늘어져 스캔이 어렵다.

**개선**: 최상위 부서를 **클러스터**로 보고 **마스터–디테일** 레이아웃으로 바꾼다.
- **데스크톱(≥lg, 1024px)**: 2단 — 좌측 클러스터(최상위) 목록 / 우측 선택 클러스터의 하위 트리.
- **모바일(<lg)**: 드릴인 — 클러스터 목록 → 탭하면 상세, `‹뒤로`.

이로써 "많아져도 안 무너지게" + 원래 요구였던 "모바일에서 잘 보이게"를 함께 해결한다.

**핵심 제약**: 이번 변경은 **표현 계층만**이다. 데이터 레이어(`departments.admin.ts`)·트리 유틸(`treeUtils.ts`)·스키마(`schema.ts`)·폼 다이얼로그(`DepartmentFormDialog.tsx`)는 그대로 재사용한다(다이얼로그는 생성 시 상위 프리셋용 prop만 추가). `DataTable`은 더 이상 사용하지 않는다.

---

## 2. 범위 · 비목표

**범위 안**
- `DepartmentManager` 마스터–디테일로 재작성 + 신규 하위 컴포넌트(`ClusterList`·`ClusterDetail`).
- 클러스터 선택 상태, 데스크톱 2단 / 모바일 드릴인 반응형.
- 액션 배선: 새 최상위 부서 / 하위 부서 추가(상위 프리셋) / 수정 / 삭제.
- `DepartmentFormDialog`에 `defaultParentId?` 추가(생성 시 상위 프리셋).

**비목표 (Non-goals)**
- **이름 검색/점프 박스**(v1 제외, 추후 추가 가능).
- 조직도 다이어그램 / 드래그 정렬.
- 데이터·API·스키마·낙관락·다이얼로그 내부 로직 변경(프리셋 prop 외).
- 공개 부서 소개 페이지(상수 구동) — 무관.

---

## 3. 레이아웃 명세

```
[별개 데이터 안내 배너]            ← 상단 고정(현행 유지)
[제목 "부서 관리"]

데스크톱(≥lg) — 2단                 모바일(<lg) — 드릴인
┌───────────┬──────────────────┐   ① 목록            ② 상세(탭 후)
│ 최상위 부서 │ 학생부 · 김집사 수정·삭제 │   ┌──────────┐     ┌──────────┐
│ ▸학생부 3  │ ──────────────── │   │부서 관리   │     │‹부서 목록 │
│  청년부 0  │ 중등부·이전도 ＋하위 ✎🗑│   │학생부 3 › │ tap │학생부 ✎🗑 │
│  예배부 2  │  └1학년부 ＋하위 ✎🗑   │   │청년부 0 › │ ──▶ │중등부 ＋✎🗑│
│  남선교회 0 │ 고등부·박전도 ＋하위 ✎🗑│   │예배부 2 › │     │└1학년부…  │
│ ＋새 부서  │ ＋하위 부서 추가      │   │＋새 부서  │     │＋하위 부서 │
└───────────┴──────────────────┘   └──────────┘     └──────────┘
```

- **브레이크포인트**: `lg`(1024px) 기준. ≥lg = 2단 동시, <lg = 드릴인. (2단은 폭이 필요해 태블릿 이하는 드릴인.)
- 좌측 폭 데스크톱 약 1/3, 우측 2/3. 우측은 `min-w-0`로 넘침 방지.

---

## 4. 컴포넌트 · 데이터 흐름

```
DepartmentManager  ("use client")           ← 오케스트레이터
  useQuery(adminKeys.list("departments")) → departments(평배열)
  roots = buildDepartmentTree(departments)  ← 최상위 = 클러스터(DepartmentNode[])
  state: selectedRootId (기본 = roots[0]?.id), drilledIn(boolean, 모바일 전용)
  selected = roots.find(r => r.id === selectedRootId)
  ├─ ClusterList   roots · selectedRootId · onSelect · onCreateRoot
  └─ ClusterDetail selected · onBack(모바일) · onCreateChild(parentId) · onEdit(id) · onDelete(node)
  + DepartmentFormDialog ×2 (create/edit) · DeleteConfirmDialog   ← 현행 재사용
```

### 4.1 `ClusterList.tsx` (신규) — 좌측 레일 / 모바일 목록
- 입력: `roots: DepartmentNode[]`, `selectedRootId`, `onSelect(id)`, `onCreateRoot()`.
- 각 루트 행: 이름 + **하위 개수 배지**(`collectDescendantIds(root).size`) + 선택 강조(`bg-primary-soft text-primary`). 모바일은 `›` 표시.
- 하단 `＋ 새 부서(최상위)` → `onCreateRoot()`.
- 행 전체가 선택 버튼(클릭 영역 ≥44px). 데스크톱은 선택만, 모바일은 선택+드릴인.

### 4.2 `ClusterDetail.tsx` (신규) — 우측 패널 / 모바일 상세
- 입력: `selected: DepartmentNode | undefined`, `onBack()`, `onCreateChild(parentId)`, `onEdit(id)`, `onDelete(node)`.
- 모바일 전용 `‹ 부서 목록` 뒤로 버튼(`lg:hidden`).
- **헤더**: 클러스터(루트) 이름 + 담당 + `수정·삭제`(루트 자신 대상).
- **하위 트리**: `flattenTree(selected.children)`로 평탄화 → depth별 들여쓰기 행. 각 행: 이름 + 담당 + `＋하위`(해당 노드 자식 생성) · `수정` · `삭제`. (현행 indent 토큰 클래스 재사용.)
- **푸터**: `＋ 하위 부서 추가` → `onCreateChild(selected.id)`.
- 하위가 없으면 "하위 부서가 없습니다." + 푸터만.
- `selected`가 없으면(부서 0개) 빈 상태 안내.

### 4.3 `DepartmentManager.tsx` (재작성) — 반응형·선택·다이얼로그
- 선택은 **파생값**으로(effect 내 setState 금지 — `set-state-in-effect` lint 회피, [[admin-dialog-seed-usequery]] 교훈): `selected = roots.find(r => r.id === selectedRootId) ?? roots[0]`. `selectedRootId` state는 **사용자 클릭 시에만** 갱신. 미선택(null)이면 자동 첫 루트, 선택 클러스터가 삭제돼 find가 빈값이어도 자동 첫 루트로 폴백 — 모두 파생으로 해결.
- 반응형(Tailwind):
  - 좌측 컨테이너 `cn("lg:block", drilledIn ? "hidden" : "block")`
  - 우측 컨테이너 `cn("lg:block", drilledIn ? "block" : "hidden")`
  - 데스크톱은 `lg:block`이 둘 다 표시 → 2단. 모바일은 `drilledIn`으로 한쪽만.
  - 루트 선택 시 `setSelectedRootId(id); setDrilledIn(true)`(데스크톱은 무해). `onBack` → `setDrilledIn(false)`.
- 다이얼로그/삭제는 현행 상태(`createParentId`·`editId`·`deleteTarget`)로 제어.

---

## 5. 액션 배선

| 동작 | 트리거 | 처리 |
|---|---|---|
| 새 최상위 부서 | 좌측 `＋새 부서` | create 다이얼로그, `defaultParentId=null` |
| 클러스터에 하위 추가 | 우측 푸터 `＋하위 부서 추가` | create, `defaultParentId=selectedRootId` |
| 특정 노드에 하위 추가 | 노드 행 `＋하위` | create, `defaultParentId=node.id` |
| 수정 | 헤더/노드 `수정` | edit 다이얼로그(`editId`) |
| 삭제 | 헤더/노드 `삭제` | `DeleteConfirmDialog` → `deleteDepartment` |

- 생성/수정 성공 → `qc.invalidateQueries(adminKeys.list("departments"))`(현행). 새 루트 생성 시 선택을 새 루트로 옮길지는 선택(기본: 목록 갱신만, 사용자가 클릭).
- 삭제 성공 → 캐시 무효화 + 토스트. 삭제 대상이 선택 클러스터면 폴백 재선택.
- 409 `DEPARTMENT_HAS_CHILDREN`/낙관락은 현행 `handleApiError`가 처리.

---

## 6. 재사용 / 변경

**그대로 재사용(무변경)**: `departments.admin.ts` · `treeUtils.ts`(`flattenTree`·`collectDescendantIds`·`findNode`) · `schema.ts` · `DeleteConfirmDialog` · `adminOnError`·`notify`·`adminKeys`.

**소폭 변경**:
- `DepartmentFormDialog.tsx` — `defaultParentId?: number | null` prop 추가. create 모드의 `EMPTY`/`reset` 기본 `parentId`에 적용(미지정 시 기존대로 null). edit 모드·낙관락·useQuery 시드 로직은 불변.

**제거**: `DepartmentManager`에서 `DataTable` 사용 중단(컴포넌트 자체는 타 도메인에서 계속 사용).

**디자인 토큰**: 선택 강조 `bg-primary-soft`/`text-primary`, 헤어라인 `border-hairline`, 카드 `rounded-xl`, 텍스트 `typo.*`. hex·px 인라인 금지. 하위 개수 배지·뒤로/＋ 액션은 토큰·`lucide-react`(`ChevronRight`·`ChevronLeft`·`Plus`·`Pencil`·`Trash2`) 사용.

---

## 7. 반응형 세부

- 2단 `flex`; 좌 `lg:w-[320px]`급 고정폭 + 우 `flex-1 min-w-0`.
- `<lg`에서는 좌/우 중 하나만 `block`(나머지 `hidden`), 폭 100%.
- 터치 타깃: 루트 행·액션 버튼 높이 ≥44px.
- 다이얼로그는 현행(모바일 `max-h-[85vh]` 내부 스크롤) 그대로.

---

## 8. 파일 목록

**신규**: `src/components/admin/departments/ClusterList.tsx`(+test) · `ClusterDetail.tsx`(+test)
**재작성**: `src/components/admin/departments/DepartmentManager.tsx`(+ test 갱신)
**변경**: `src/components/admin/departments/DepartmentFormDialog.tsx`(+ `defaultParentId` 테스트 1건) · `.claude/rules/DESIGN.md`(`department-admin-manager` 마커를 마스터–디테일로 갱신 + `cluster-list`/`cluster-detail` 항목 추가)

---

## 9. 테스트 (TDD, 80%+)

jsdom은 CSS 브레이크포인트를 못 보므로 **로직** 중심:
| 파일 | 검증 |
|---|---|
| `ClusterList.test.tsx` | 루트 목록·하위개수 배지 렌더 · 선택 강조 · onSelect/onCreateRoot 콜백 |
| `ClusterDetail.test.tsx` | 헤더(루트)·하위 트리 들여쓰기 렌더 · `＋하위`(노드별 parentId)·수정·삭제·푸터 콜백 · 하위 0개 안내 |
| `DepartmentManager.test.tsx`(갱신) | 기본 첫 루트 선택 · 루트 선택 시 상세 전환 · 삭제 후 선택 폴백 · `＋새 부서` create(parent null) · `＋하위`/`＋하위 부서 추가` create(parent 프리셋) · 안내 배너 |
| `DepartmentFormDialog.test.tsx`(추가) | `defaultParentId` 지정 시 create 폼 상위 select 프리셋 |

전체 게이트: `pnpm test` · `npx tsc --noEmit` · `pnpm lint`(0 errors). 수동: `pnpm dev`로 데스크톱 2단·모바일 드릴인 폭 확인.

---

## 10. 구현 순서(writing-plans 입력)

1. `DepartmentFormDialog` `defaultParentId` 추가(+test) — 가장 작은 변경, 먼저.
2. `ClusterList`(+test)
3. `ClusterDetail`(+test)
4. `DepartmentManager` 재작성(+test 갱신)
5. `.claude/rules/DESIGN.md` 마커 갱신
6. 게이트(`pnpm test`·`tsc`·`lint`) + 수동 반응형 확인
