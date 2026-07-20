# 마크다운 에디터 서식 툴바·도움말 설계

- 날짜: 2026-07-20
- 이슈: #106
- 대상: `src/components/admin/MarkdownEditor.tsx` 및 그 사용처 6곳(공지·설교·일정·앨범·챌린지·부서 폼)

## 배경·목표

본문 작성이 마크다운 문법 기반이라, 마크다운을 모르는 관리자는 서식(제목·굵게·목록 등)을
적용하지 못하고 이미지 삽입도 `media:{id}` 코드를 손으로 입력해야 한다. 화면 어디에도
사용법 안내가 없다. 목표: 마크다운을 몰라도 클릭만으로 서식을 적용하고, 필요하면
사용법을 화면 안에서 바로 볼 수 있게 한다.

## 결정 사항 (브레인스토밍 합의)

- 상호작용 방식은 눈에 항상 보이는 서식 툴바 + 치트시트 Dialog. 대상이 "마크다운을
  모르는 관리자"라 발견성이 최우선 — 노션식 슬래시 메뉴는 발견성이 낮고(textarea 커서
  좌표 계산 등 구현 복잡도도 큼) 채택하지 않는다. 추후 추가는 가능(배제 아님).
- WYSIWYG 라이브러리(TipTap 등)는 허용 라이브러리 외 추가 금지 규칙(가이드 15.1)으로 배제.
  textarea + 마크다운 저장 파이프라인은 그대로 유지한다.
- 서식 범위는 렌더 파이프라인이 허용하는 전부(제목·굵게·기울임·취소선·목록·번호목록·
  인용·구분선·표·링크·이미지·유튜브).
- 입력창에 `**` 같은 마크다운 기호가 보이는 것은 허용(사용자 확인). 결과 확인은
  미리보기 탭이 담당한다.

## 구성 요소

사용처 6개 폼은 무변경 — 모든 확장은 `MarkdownEditor` 내부에서 끝난다.
어드민 화면 관례를 따른다: 가독성 우선 단순 변형, 토큰 공유(`typo.*`, hex·px 인라인 금지),
아이콘은 lucide-react(`currentColor`).

### MarkdownToolbar (신규, `src/components/admin/MarkdownToolbar.tsx`)

작성 탭 안, Textarea 바로 위의 버튼줄. 미리보기 탭에서는 보이지 않는다.
아이콘 버튼(`aria-label` + `title` 툴팁), 좁은 폭에서는 줄바꿈(flex-wrap). 그룹 구성:

| 그룹 | 버튼(lucide) | 동작 |
|---|---|---|
| 제목 | `Heading1` `Heading2` `Heading3` | 줄 앞 `#`/`##`/`###` 토글, 제목끼리는 교체 |
| 인라인 | `Bold` `Italic` `Strikethrough` | 선택 영역 `**…**`/`*…*`/`~~…~~` 감싸기·해제 |
| 블록 | `List` `ListOrdered` `Quote` `Minus` `Table` | 줄 접두 `- `/`1. `/`> ` 토글, `---`·표 템플릿 삽입 |
| 삽입 | `Link` `ImagePlus` `Youtube` | 아래 "삽입 Dialog" 참조 |
| 도움말 | `CircleHelp` | MarkdownHelpDialog 열기 |

### 삽입 Dialog

마크다운 템플릿을 그대로 꽂으면 결국 문법을 알아야 하므로, 입력을 받아 완성형으로 삽입한다.

- 링크: "표시할 문구 + 주소" 입력 → `[문구](주소)` 삽입. 문구가 비면 주소로 대체.
- 유튜브: "주소" 입력 → 단독 문단으로 주소만 삽입(기존 임베드 파이프라인
  `splitYouTubeSegments`가 자동으로 영상 처리). `parseYouTubeId` 검증 실패 시
  인라인 에러 "유튜브 주소가 아닙니다".
- 이미지: 기존 `MediaPicker`(image·multi) 재사용 → 선택한 각 미디어를 `media:{id}`
  단독 문단으로 삽입. 관리자가 코드를 알 필요가 없어진다.
- 주소 공통 검증: `https://`(또는 `http://`) 시작 단순 체크(zod 불요). 취소 시 무동작.
- 중첩 Dialog(폼 Dialog 안에서 열리는 MediaPicker 등)는 Radix 포털 스택 순서로 위에
  뜬다 — 문제 발견 시 구현 단계에서 대응.

### MarkdownHelpDialog (신규, `src/components/admin/MarkdownHelpDialog.tsx`)

"?" 버튼으로 여는 치트시트 Dialog. "이렇게 쓰면 → 이렇게 보입니다" 2열 표 —
왼쪽은 문법 원문(코드 표시), 오른쪽은 `MarkdownContent`로 실제 렌더한 결과.
서식 외 규칙도 안내한다: "빈 줄로 문단을 나눕니다", "유튜브 주소는 한 줄에 혼자",
"이미지는 이미지 버튼으로 넣습니다". 치트시트 내용은 컴포넌트 내 상수(어드민 UI 도움말
텍스트 — 교회별 콘텐츠 아님).

### MarkdownEditor 수정

- 작성 탭에 MarkdownToolbar 장착, Textarea ref 배선(삽입 위치·선택 영역 접근).
- 기존 props(`value`/`onChange`/`id`/`error`/`placeholder`/`rows`)와 탭 구조는 유지.

### DESIGN.md

`markdown-editor` 항목(어드민 공용 02 구획)에 툴바·도움말·삽입 Dialog를 반영한다.

## 삽입 로직 (신규, `src/lib/markdownEditing.ts`)

DOM 없이 문자열만 다루는 순수 함수 — 테스트 용이성이 분리 이유.

- 시그니처: `(text, selStart, selEnd, action) → { text, selStart, selEnd }`
- 인라인(굵게·기울임·취소선): 선택 영역 감싸기, 이미 감싸져 있으면 해제(토글).
  선택 없으면 자리표시 문구(굵게 `굵은 글씨`·기울임 `기울인 글씨`·취소선 `지운 글씨`)
  삽입 후 문구 부분만 선택 상태로 반환 —
  바로 덮어쓰면 된다.
- 줄 단위(제목·목록·인용): 선택이 걸친 모든 줄 앞에 접두 삽입, 이미 있으면 제거(토글).
  제목끼리는 교체(`##` 상태에서 H3 누르면 `###`).
- 블록(구분선·표·이미지·유튜브): 커서 위치 기준 앞뒤 빈 줄을 보장한 뒤 단독 문단으로
  삽입(유튜브 임베드·문단 규칙이 빈 줄 2개에 의존).
- 표 템플릿: 헤더(`| 항목 | 값 |`) + 구분행 + 빈 행 1개.
- 반환된 선택 영역으로 툴바가 포커스·커서를 복원한다(삽입물 끝 또는 자리표시 선택).

## 에러 처리

- URL·유튜브 검증은 위 "삽입 Dialog" 참조. 검증 실패는 Dialog 안 인라인 에러로 표시
  (Toast 아님 — 입력 수정 유도).
- MediaPicker 실패·취소는 기존 동작 그대로(삽입 없음).

## 알려진 한계

- WYSIWYG 아님 — 입력창에 기호가 보인다(승인됨).
- 툴바 삽입이 브라우저 실행취소(Ctrl+Z) 히스토리와 완전히 매끄럽지 않을 수 있다
  (React controlled textarea 한계). 구현 시 네이티브 삽입(`execCommand("insertText")`)
  을 우선 시도하고, 불가하면 상태 교체를 수용한다.

## 테스트 (RED→GREEN)

프로젝트 관례: vitest 명시 import, jest-dom 없음, mock은 엘리먼트 반환.

1. `markdownEditing` 유닛: 액션별 삽입·토글·해제, 다중 줄 접두, 제목 교체,
   선택 없음 자리표시, 블록 빈 줄 보장 — 핵심 커버리지.
2. `MarkdownToolbar` 컴포넌트: 버튼 클릭 → `onChange` 값 검증, 링크·유튜브 Dialog
   검증 에러, 도움말 Dialog 열림. MediaPicker는 mock.
3. `MarkdownEditor` 기존 테스트 유지 + 작성 탭 툴바 렌더 확인.
