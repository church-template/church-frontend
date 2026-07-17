# TagMultiSelect 인라인 칩 토글 전환

- **날짜**: 2026-07-17
- **상태**: 설계 확정 (사용자 승인)
- **관련**: DESIGN.md `tag-multiselect`, 어드민 태그 입력 4곳 (설교·공지·일정·갤러리)

## 문제

태그 선택 UI가 Radix Popover(포탈) 기반이라 두 가지 문제가 있다.

1. **모달 안에서 안 보임**: 일정(`EventFormDialog`)·갤러리(`AlbumFormDialog`)는 Dialog 폼인데,
   Popover는 `z-popover`(40)로 Dialog의 `z-overlay`(50)보다 낮아 **드롭다운이 모달 뒤에 깔려
   조작이 불가능**하다. 모바일은 모달이 화면을 덮어 완전히 가려진다.
2. **페이지 폼에서도 어색함**: 설교·공지는 전체 페이지 폼이라 동작은 하지만, 트리거 버튼이
   폼 하단에 있으면 팝오버가 위로 뜨며 뷰포트 상단에 잘린다(재현 스크린샷 확인).

4곳 모두 동일한 `src/components/admin/TagMultiSelect.tsx` 하나를 쓰므로 이 컴포넌트만 고치면
전 도메인이 통일된다.

## 결정

**플로팅 UI를 제거하고 인라인 칩 토글로 전환한다.** 태그 전체를 폼 안에 항상 펼쳐 두고
탭/클릭으로 선택↔해제한다. 포탈이 없으므로 z-index·위치 계산 문제가 원천 제거되고,
페이지 폼·모달·모바일·데스크톱 어디서나 렌더링이 동일하다.

검토 후 기각한 대안:

- **인라인 접이식 목록**(버튼 유지 + 인라인 패널 확장): 동작은 안전하지만 칩 토글 대비
  클릭 한 단계가 더 필요하고 상태(열림/닫힘)가 남는다.
- **z-index만 수정**(popover z 40→50): 최소 diff지만 화면 가장자리에서 위로 뜀·잘림 등
  플로팅 UI 자체의 어색함이 그대로 남는다.

## 컴포넌트 설계

### 파일

| 파일 | 변경 |
|---|---|
| `src/components/admin/TagMultiSelect.tsx` | Popover·트리거 버튼·하단 선택 Badge 목록 제거, 인라인 칩 목록으로 재작성 |
| `src/components/admin/TagMultiSelect.test.tsx` | 칩 토글 동작 기준으로 테스트 갱신 |
| `.claude/rules/DESIGN.md` | `tag-multiselect` 항목 문구 갱신 |

**props 불변**: `{ value: number[]; onChange: (value: number[]) => void }` 그대로 —
소비처 4곳(`SermonForm`·`NoticeForm`·`EventFormDialog`·`AlbumFormDialog`)은 수정하지 않는다.

### 렌더 구조

```tsx
<div className="flex flex-wrap gap-xs">
  {tags.map((t) => (
    <button
      key={t.id}
      type="button"                      // 폼 안이므로 submit 방지 필수
      aria-pressed={value.includes(t.id)}
      onClick={() => toggle(t.id)}
      className={/* 선택/비선택 칩 스타일 */}
    >
      {value.includes(t.id) ? <Check size={16} aria-hidden /> : null}
      {t.name}
    </button>
  ))}
</div>
```

- `toggle(id)` 로직은 기존 그대로(불변 배열 생성: 포함이면 filter 제거, 아니면 spread 추가).
- 선택 표시는 색 + lucide `Check`(16, `currentColor`) 병행 — 색만으로 구분하지 않는다.
- 별도의 "선택된 태그 Badge 목록"은 제거한다(칩 자체가 선택 상태를 보여줌).

### 스타일 (토큰만, hex·px 인라인 금지)

| 요소 | 값 |
|---|---|
| 칩 모양 | `rounded-sm`(8px, 배지 규칙) + `typo.bodySm` |
| 칩 패딩 | spacing 토큰(`px-sm py-xs` 계열) — 어드민 화면이므로 48px 터치 타깃 강제는 없으나 여유 있게 |
| 선택 칩 | `bg-primary` + on-primary 텍스트 |
| 비선택 칩 | `bg-surface-strong` + body 텍스트 |
| 전환 | Button과 동일 `transition duration-150 ease-out` (상호작용 요소 선례) |

### 상태 처리 (기존 문구 유지)

- 로딩: "불러오는 중…" (`typo.bodySm` + muted)
- 에러: "태그를 불러오지 못했습니다." (`typo.bodySm` + error)
- 빈 목록: "등록된 태그가 없습니다." (`typo.bodySm` + muted)
- 데이터: `useQuery({ queryKey: ["tags"], queryFn: getTags })` 그대로.

### 스케일 전제

태그 수는 수십 개 규모(교회 사이트)를 전제한다. 태그가 늘어 폼이 길어져도 Dialog가 이미
`max-h-[85vh] overflow-y-auto`라 모달 내부 스크롤로 흡수된다. max-height 접기 등 추가 장치는
넣지 않는다 — 실제로 태그가 수백 개가 되면 그때 접이식(기각 대안 1)으로 승격한다.

## z-index 토큰 판단

이 변경 후 Popover 계열(popover·select·dropdown-menu)의 소비처는
쇼케이스(`BehaviorShowcase`)와 일정 캘린더 날짜 팝오버(`EventDayPopover`)뿐이며 둘 다 모달
밖에서 열린다. 따라서 **`--z-popover`(40) < `--z-overlay`(50) 스케일은 변경하지 않는다.**
향후 모달 안에서 Popover/Select를 다시 쓰게 되면 이 잠복 문제가 재발하므로, 그때 popover z를
overlay와 동급(50)으로 올려 DOM 순서로 겹침을 해소하는 방안을 검토한다(shadcn 기본 방식).

## 테스트 계획

`TagMultiSelect.test.tsx` 갱신 (프로젝트 테스트 관례: vitest 명시 import, jest-dom 없음,
`getAttribute` 검증):

1. 태그 목록이 **열기 단계 없이 즉시** 칩으로 렌더된다.
2. 비선택 칩 클릭 → `onChange`가 기존 배열 + 해당 id로 호출된다.
3. 선택 칩 클릭 → `onChange`가 해당 id 제거된 배열로 호출된다.
4. 선택 칩은 `aria-pressed="true"`, 비선택 칩은 `"false"`.
5. 로딩·에러·빈 목록 문구 렌더.

## DESIGN.md 갱신 문구

`tag-multiselect` 항목을 다음 취지로 교체:

> **`tag-multiselect`**: 기존 태그 다중선택. 인라인 칩 토글 — 태그 전체를 폼 안에 항상 펼쳐
> 렌더(`aria-pressed` 버튼), 선택=primary 채움+lucide `Check`, 비선택=surface-strong.
> 플로팅(Popover) 미사용 — 모달(Dialog) 안에서도 레이어 문제 없음. 옵션은 `getTags`.
> 신규 생성 없음(06 소관).
