# [T16] 갤러리 (회원전용 게이트)

**라벨:** `page`, `auth-gated`
**선행:** T5(인증), T6(공통), T7(앱 셸)
**참조:** 가이드 2.3·10장(갤러리)·6장, 15.1, OpenAPI `/api/gallery/**`

---

## 목적
회원 전용 갤러리(앨범 목록/상세)를 권한 게이팅과 함께 구현한다. 비공개 경로 — `GALLERY_VIEW` 필요.

---

## 1. 게이팅 (2.3 — 가장 중요)
- `/api/gallery/**`는 **`GALLERY_VIEW` 필요**(회원 전용). 가입 직후 USER는 미보유 → 관리자가 MEMBER 부여 시 획득.
- **진입 시 토큰/`/members/me`에 `GALLERY_VIEW`가 없으면 API를 호출하지 말고** "교인 승인 후 이용 가능" 안내.
- 그대로 호출 시: 비로그인 = `401 INVALID_TOKEN`, 로그인+권한없음 = `403 ACCESS_DENIED`(T6 매핑으로 처리).

## 2. 앨범 목록 — `GET /api/gallery/albums` (회원전용)
- 정렬 `createdAt,desc`, 필터 `tagId`(단수).
- 카드 필드: `id`·`title`·`thumbnailMediaId`(첫 사진, 없으면 null)·`photoCount`·`createdAt`·`tags`·`author`.
- 썸네일: `thumbnailMediaId` → `GET /api/media/{id}`(공개 서빙). null이면 플레이스홀더.
- 봉투 `{ content, page }` + Pagination + TagFilter(T6).

## 3. 앨범 상세 — `GET /api/gallery/albums/{id}` (회원전용)
- 사진 그리드 + 앨범 `description`(raw 마크다운 → MarkdownContent T6).
- 사진은 mediaId → `/api/media/{id}` 서빙.

## 4. 데이터 경계 (15.1)
- **클라이언트 컴포넌트 + TanStack Query + `authFetch`(T5).** `queryFn`은 authFetch 경유.
- 권한 게이팅은 호출 전 `permissions`로 선판단(403 왕복 줄이기).
> 앨범/사진 생성·수정·삭제(연결 해제)는 어드민 영역 → 이번 배치 제외(조회만).

## 5. 완료 조건
- [ ] 게이팅: GALLERY_VIEW 없으면 호출 없이 안내(비로그인·USER 모두)
- [ ] 목록 `/gallery`: 앨범 카드(thumbnail·photoCount·tags·author), 정렬·tagId 필터, Pagination
- [ ] 상세 `/gallery/albums/{id}`: 사진 그리드 + description 마크다운
- [ ] TanStack Query + authFetch

## 6. 검수
- [ ] GALLERY_VIEW 없는 사용자에게 API 호출 없이 안내(비로그인·USER 모두).
- [ ] 권한 보유 회원은 목록/상세 정상 조회.
- [ ] 401 refresh 선처리, 403은 안내 메시지로 표시.
