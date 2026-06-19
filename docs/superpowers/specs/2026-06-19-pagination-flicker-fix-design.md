# 목록 페이지네이션 깜빡임·스크롤 점프 제거 설계

- 날짜: 2026-06-19
- 관련 이슈: `.issues/20260619_기능개선_목록_페이지네이션_깜빡임_제거.md`
- 범위 등급: 최소(A+C) — 사용자 확정

## 1. 배경과 문제

회원 영역의 클라이언트 목록(TanStack Query 기반)에서 페이지를 넘기면 보이는 목록만 바뀌면 되는데 전체가 다시 그려지는 것처럼 깜빡인다. 코드 확인 결과 원인은 세 겹이다.

| # | 원인 | 증상 |
|---|---|---|
| A | 목록 쿼리 3개 모두 `placeholderData`(keepPreviousData) 미설정 | 페이지 변경 시 `queryKey`가 바뀌어 `isPending=true` → DataTable/그리드가 스켈레톤으로 전부 사라졌다가 새 행으로 다시 채워짐("전체 리로드" 체감의 1순위) |
| B | `<Link>` 라우터 네비게이션으로 페이지 이동 | 라우트 세그먼트 RSC 재요청(서버 왕복). 데이터는 어차피 클라에서 따로 패칭하므로 순수 낭비 |
| C | `<Link>` 기본 동작의 상단 스크롤 점프 | 페이지 클릭 시 화면이 위로 튐 → 새로고침 느낌 |

이번 작업은 사용자 확정에 따라 A와 C만 해결한다. B(서버 왕복 제거, history API 얕은 라우팅)와 목록 island 분리(렌더 격리)는 의도적으로 범위에서 제외한다.

## 2. 대상과 비대상

대상 — 회원 영역 클라이언트 목록 3곳:
- `src/components/admin/members/MemberManager.tsx` (회원 관리)
- `src/components/admin/media/MediaLibrary.tsx` (미디어 라이브러리)
- `src/components/gallery/AlbumList.tsx` + `src/components/gallery/queries.ts` (갤러리 앨범)

공유 컴포넌트:
- `src/components/common/Pagination.tsx` (스크롤 동작 옵션화)

비대상 — 변경하지 않음:
- 공개 ISR 페이지: `sermons` · `notices` · `bulletins`. 서버 컴포넌트 + ISR이므로 `<Link>`+RSC+ISR가 올바른 패턴이다. Pagination의 기본 동작을 보존해 영향이 가지 않게 한다.
- 전역 `QueryClient` 기본옵션(`src/app/providers.tsx`)에 `keepPreviousData`를 걸지 않는다 — 상세 쿼리(`useAlbum` · `getMember` · `me` 등)까지 영향을 받으므로 목록 쿼리에만 개별 적용한다.

## 3. 핵심 메커니즘

### 3.1 깜빡임 제거 (A) — `placeholderData: keepPreviousData`

TanStack Query v5.101 기준. `keepPreviousData`를 `@tanstack/react-query`에서 import해 목록 쿼리 3개에 `placeholderData: keepPreviousData`를 추가한다.

효과:
- 페이지 전환 중 `isPending`이 `false`로 유지되어 스켈레톤이 뜨지 않고 이전 행이 그대로 보인다.
- 새 데이터 도착 시 행만 교체된다.
- 새 페이지 데이터를 가져오는 동안 `isPlaceholderData === true`.

부수 효과(허용 가능):
- Pagination 활성 하이라이트는 `data.page.number`(서버가 돌려준 현재 페이지) 기준이므로, 패칭 동안에는 화면에 보이는 이전 행과 동일한 이전 페이지가 하이라이트된다. 즉 "보이는 행 = 하이라이트된 페이지"로 일관되며, 데이터 도착 시 행과 하이라이트가 함께 다음 페이지로 전환된다. URL은 클릭 즉시 갱신된다.

### 3.2 스크롤 점프 제거 (C) — Pagination `scroll` prop

`Pagination`에 `scroll?: boolean` prop을 추가하되 기본값을 `true`로 두어 공개 ISR 페이지의 현재 동작을 보존한다. `PaginationControls`가 숫자 `<Link>`와 `<Arrow>`(내부 `<Link>`)에 `scroll`을 전달한다. 대상 목록 3곳만 `<Pagination page={…} scroll={false} />`로 호출한다.

### 3.3 로딩 피드백 — 미세 디밍

`keepPreviousData`만 적용하면 새 데이터 도착 전까지 이전 행이 그대로 보여 클릭이 먹었는지 잠깐 헷갈릴 수 있다. 목록 컨테이너에 `isPlaceholderData`일 때 흐림과 `aria-busy`를 건다.

- 클래스: `cn(isPlaceholderData && "opacity-60 transition-opacity")` — `cn()` 내부 `&&`는 프로젝트 규칙상 허용. 색·간격이 아닌 표준 Tailwind 유틸만 사용(arbitrary value 없음).
- 속성: `aria-busy={isPlaceholderData}`.
- 적용 위치: MemberManager·MediaLibrary는 `<DataTable>`을 감싸는 div, AlbumList는 앨범 그리드 div.

## 4. 파일별 변경

### 4.1 `src/components/common/Pagination.tsx`
- `Pagination`·`PaginationControls`·`Arrow` 시그니처에 `scroll: boolean` 추가(`Pagination`은 `scroll = true` 기본값).
- 숫자 `<Link>`와 `Arrow`의 활성 `<Link>`에 `scroll={scroll}` 전달.
- 공개 export 시그니처 변경은 prop 추가(선택적)이므로 기존 호출부와 호환.

### 4.2 `src/components/admin/members/MemberManager.tsx`
- `import { useQuery, keepPreviousData } from "@tanstack/react-query"`.
- `useQuery({ …, placeholderData: keepPreviousData })`.
- `<DataTable>`을 디밍 wrapper div로 감싸고 `members.isPlaceholderData` 사용.
- `<Pagination page={members.data.page} scroll={false} />`.

### 4.3 `src/components/admin/media/MediaLibrary.tsx`
- 위와 동일 패턴(keepPreviousData + 디밍 wrapper + `scroll={false}`).

### 4.4 `src/components/gallery/queries.ts`
- `useAlbums`에 `placeholderData: keepPreviousData` 추가(import 포함).

### 4.5 `src/components/gallery/AlbumList.tsx`
- 앨범 그리드 div에 `albums.isPlaceholderData` 기반 디밍 + `aria-busy`.
- `<Pagination page={albums.data.page} scroll={false} />`.

## 5. 검증

- `Pagination.test.tsx`: `scroll` prop 전달 동작 단위 테스트 추가. next/link mock이 `scroll` 값을 노출(data 속성 등)하도록 보강해, `scroll={false}` 호출 시 숫자 링크·이전/다음 화살표 링크에 전달되는지, prop 미지정 시 기본값(true)인지 회귀 확인. 프로젝트 테스트 관례 준수(vitest globals:false 명시 import, jest-dom 없이 getAttribute/toBeDefined, next/link mock).
- 동작 확인: 페이지 전환 시 스켈레톤이 뜨지 않고 이전 행이 유지되는지, 스크롤 점프가 없는지 실행 화면(`pnpm dev` 또는 Playwright)으로 확인. keepPreviousData는 쿼리 옵션 한 줄이라 단위 테스트로 격리하기 어려우므로 실행 검증을 1차 게이트로 둔다.
- `pnpm lint` + `npx tsc --noEmit` 통과(별개 단계 — lint는 타입체크를 하지 않음).

## 6. 성공 기준

- 회원 관리·미디어 라이브러리·갤러리 앨범에서 페이지를 넘길 때 목록이 스켈레톤으로 비워졌다 채워지지 않고, 이전 행이 유지되다 새 행으로 교체된다.
- 페이지 버튼 클릭 시 화면이 상단으로 스크롤 점프하지 않는다.
- 로딩 중 목록에 미세 디밍과 `aria-busy`가 적용된다.
- 공개 ISR 페이지(설교·공지·주보)의 페이지네이션 동작은 변경 전과 동일하다.
- URL 구동 페이지네이션(딥링크·뒤로가기)은 그대로 동작한다.
- lint·타입체크·기존 테스트 모두 통과.
