# [T10] 설교 (목록 · 검색 · 상세)

**라벨:** `page`
**선행:** T6, T7
**참조:** 가이드 10장(설교)·3·5·7장, OpenAPI `/api/sermons`

---

## 목적
설교 목록(검색/필터/페이지네이션)과 상세(마크다운 본문)를 공개 서버 컴포넌트로 구현한다.

---

## 1. 목록 — `GET /api/sermons` (공개)
- 정렬: `preachedAt,desc` (기본).
- 필터 파라미터: `preacher`·`series`(완전일치)·`from`/`to`(설교일 범위, `yyyy-MM-dd`, 상한 포함)·`q`·`tagId`(단수)·`page`·`size`·`sort`.
- 카드 필드: `id`·`title`·`preacher`·`series`·`scripture`·`preachedAt`·`viewCount`·`tags`·`author`. (본문·version 없음)
- 목록 봉투 `{ content, page }`(T6) + Pagination + TagFilter(T6).
- `preachedAt`은 **date(시간 없음)** → 날짜만 표기. datetime 토큰(tnum).

### 검색 q (백엔드 답변 D)
- `q`는 **title · preacher · series · scripture** 매칭(OR). **본문(content) 미포함.**
- 검색 입력 placeholder/안내문구를 **"제목·설교자·시리즈·성경구절"**로. (OpenAPI의 "제목/내용" 설명은 코드와 불일치 = 오기)
- q는 다른 필터와 AND, 대소문자 무시.

## 2. 상세 — `GET /api/sermons/{id}` (공개)
- 상세 추가 필드: `content`(raw 마크다운)·`version`·`videoUrl`·`audioUrl`(외부 링크).
- 본문은 **MarkdownContent(T6)** — `media:{id}` 치환 + DOMPurify.
- `author`(7장): 서버가 마스킹 적용("(탈퇴한 사용자)"·"(알 수 없음)") → **그대로 표기**, 기준은 마지막 편집자.
- videoUrl/audioUrl 있으면 임베드/링크.

### 캐시 (백엔드 답변 C)
- **상세는 `cache: 'no-store'`** (상세 GET마다 `viewCount +1`, 중복방지 없음 → 정확 카운트). 목록은 캐시 가능.

## 3. 데이터 경계
- 공개 = **서버 컴포넌트 fetch**(15.1), TanStack Query 미사용.

## 4. 완료 조건
- [ ] 목록 `/sermons`: 정렬/필터(preacher·series·from·to·q·tagId)/Pagination/TagFilter
- [ ] 검색 안내문구 "제목·설교자·시리즈·성경구절"
- [ ] 상세 `/sermons/{id}`: no-store, content 마크다운, author, video/audio
- [ ] preachedAt 날짜 표기(datetime 토큰)

## 5. 검수
- [ ] 목록 필터/정렬/페이지가 URL 쿼리와 동기화.
- [ ] 상세 진입 시 매번 백엔드 호출(no-store).
- [ ] 본문 마크다운·`media:{id}` 이미지 렌더 + 새니타이즈.
- [ ] author 마스킹을 서버 값 그대로 표기.
