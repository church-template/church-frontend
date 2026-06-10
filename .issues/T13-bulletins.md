# [T13] 주보 (목록 · PDF 열람)

**라벨:** `page`
**선행:** T6, T7
**참조:** 가이드 10장(주보)·6장, OpenAPI `/api/bulletins`

---

## 목적
주보 목록과 PDF 열람을 공개 서버 컴포넌트로 구현한다. 주보는 본문이 없고 PDF media FK만 가진다.

---

## 1. 목록 — `GET /api/bulletins` (공개)
- 정렬: `serviceDate,desc`.
- 카드 필드: `id`·`title`·`serviceDate`·`mediaId`·`author`. (본문 없음)
- `serviceDate`는 datetime/date → 표기는 datetime 토큰. 봉투 `{ content, page }` + Pagination(T6).

## 2. PDF 열람 (6장)
- 본문 없음 — PDF는 `mediaId` FK → **`GET /api/media/{mediaId}`(공개)로 열람.**
- 브라우저 기본 PDF 뷰어(새 탭) 또는 `<embed>`/`<iframe>` 임베드.

### 미디어 서빙 특성 (백엔드 답변 E)
- `Content-Type: application/pdf` + `Content-Disposition: inline` 정확히 내려옴. `X-Content-Type-Options: nosniff`.
- **Range(206)/캐시 헤더 없음** — 대용량이면 전체 바디 다운로드(일반 주보 PDF 열람엔 무방).

## 3. 데이터 경계
- 공개 = 서버 컴포넌트 fetch(15.1).

## 4. 완료 조건
- [ ] 목록 `/bulletins`: serviceDate 내림차순, 카드(title·serviceDate·author)
- [ ] 항목 클릭 → `/api/media/{mediaId}` PDF 인라인 열람
- [ ] author 마스킹 그대로 표기(7장)

## 5. 검수
- [ ] 목록이 예배일 내림차순.
- [ ] PDF가 inline으로 열린다(다운로드 강제 아님).
