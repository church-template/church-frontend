# [T11] 공지 (목록 · 상세)

**라벨:** `page`
**선행:** T6, T7
**참조:** 가이드 10장(공지)·3·5·7장, OpenAPI `/api/notices`

---

## 목적
공지 목록과 상세(마크다운)를 공개 서버 컴포넌트로 구현한다.

---

## 1. 목록 — `GET /api/notices` (공개)
- 정렬: `isPinned,desc` + `createdAt,desc` (고정글 우선).
- 필터: `q`·`tagId`(단수)·`page`·`size`·`sort`.
- 카드 필드: `id`·`title`·`isPinned`·`viewCount`·`createdAt`·`tags`·`author`. (본문·version 없음)
- 봉투 `{ content, page }` + Pagination + TagFilter(T6). `isPinned`이면 고정 배지(`badge-pill-primary`).
- `createdAt`은 datetime → `parseServerDate`(+09:00, T6).

### 검색 q (백엔드 답변 D)
- `q`는 **제목(title)만** 매칭(코드가 사실, 가이드 10장). 대소문자 무시.
- 검색 안내문구를 **"제목"**으로(내용 검색 기대 UI 만들지 않음).

## 2. 상세 — `GET /api/notices/{id}` (공개)
- 추가 필드: `content`(raw 마크다운)·`version`.
- 본문 MarkdownContent(T6). `author` 마스킹 그대로 표기(7장).

### 캐시 (백엔드 답변 C)
- **상세는 `cache: 'no-store'`** (viewCount +1, 중복방지 없음). 목록은 캐시 가능.

## 3. 데이터 경계
- 공개 = 서버 컴포넌트 fetch(15.1).

## 4. 완료 조건
- [ ] 목록 `/notices`: 정렬(고정 우선)/필터(q·tagId)/Pagination/TagFilter, isPinned 배지
- [ ] 검색 안내문구 "제목"
- [ ] 상세 `/notices/{id}`: no-store, content 마크다운, author

## 5. 검수
- [ ] 고정글이 항상 상단(서버 정렬 신뢰, 재정렬 금지).
- [ ] 상세 진입 시 매번 백엔드 호출(no-store).
- [ ] 검색이 제목만 매칭.
