# 네이버·구글 검색엔진 최적화(SEO) 설계 (#117)

- 날짜: 2026-08-07
- 이슈: #117 🚀 [기능개선][SEO] 네이버·구글 검색엔진 최적화
- 브랜치: `20260807_#117_네이버_구글_검색엔진_최적화`

## 목표

1. **브랜드 검색** — "은샘교회" 검색 시 네이버·구글에서 공식 사이트가 정상 노출
2. **지역 키워드** — 예산·삽교 지역 검색어 노출 (코드=위치 신호 보강, 실질=플레이스 등록)
3. **콘텐츠 검색** — 공지·행사 개별 글이 검색에 수집·노출

## 현재 상태 (이미 갖춰진 것)

- `robots.ts`(비공개 차단 + sitemap 포인터), `sitemap.ts`(공개 정적 라우트 + 부서 상세)
- 루트 metadata: metadataBase·title 템플릿·OG(ko_KR)·트위터 카드·og-image·robots index
- `ChurchJsonLd`(schema.org Church), `manifest.ts`, 일부 페이지 metadata

## 1. 검색 노출 범위 정리 (전제)

설교는 회원 전용(SERMON_VIEW)으로 전환되어 검색 수집 대상이 아니다. 수집 경계를 다음과 같이 정리한다.

- **수집 대상(공개)**: 홈, `/about`(+ history·pastor·photos·location), `/worship`, `/notices`(목록·상세), `/bulletins`, `/events`(목록·상세), `/departments`(목록·상세)
- **수집 제외(회원 전용)**: `/sermons`, `/gallery`, `/challenges`, `/vehicle-runs`, `/mypage` — 비로그인에겐 로그인 안내만 보여 검색 가치가 없다

조치(이중 방어):

- `sitemap.ts`의 PUBLIC_PATHS에서 `/sermons`·`/gallery`·`/challenges` 제거
- `robots.ts` disallow에 `/sermons`·`/gallery`·`/challenges`·`/vehicle-runs` 추가 (mypage·auth는 기존 유지)
- 회원 전용 페이지 metadata에 `robots: { index: false }` 부여 — 외부 링크로 유입돼도 색인 제외

## 2. 소유확인 메타태그

- `layout.tsx` metadata에 `verification` 추가
  - 구글: `verification.google` ← env `GOOGLE_SITE_VERIFICATION`
  - 네이버: `verification.other["naver-site-verification"]` ← env `NAVER_SITE_VERIFICATION`
- env 미설정이면 해당 태그 미출력(조건부) — CI·로컬 빌드 영향 없음
- 값 발급·Vercel env 등록 절차는 운영 가이드(7장) 소관

## 3. 페이지별 metadata + canonical

### 3.1 누락 metadata 보강 (정적)

title(템플릿 조립) + description 추가. 콘텐츠 하드코딩 금지 원칙에 따라 교회명 등은 `church.ts` 상수 조합.

- `/notices`(공지 목록), `/bulletins`(주보), `/events`(행사 목록), `/worship`(예배안내), `/about/location`(오시는길), `/departments`(부서 목록), `/departments/[slug]`(부서 상세 — DEPARTMENTS 상수 기반 generateMetadata)

### 3.2 상세 페이지 동적 metadata

- `/notices/[id]`, `/events/[id]`에 `generateMetadata`
  - title = 글 제목, description = 본문 마크다운 스트립 후 앞 ~160자
  - OG title·description 동일 반영, 이미지는 전역 og-image 유지(글별 대표 이미지 추출은 범위 밖)
  - 페이지 RSC와 같은 fetch 재사용(Next fetch 중복 제거로 추가 요청 없음), 글 없으면 기존 notFound 관례
- 마크다운 스트립 헬퍼는 `src/lib/`에 순수 함수로 두고 단위 테스트

### 3.3 canonical

- 모든 **수집 대상** 페이지에 `alternates.canonical` 추가 (상대 경로 — metadataBase가 절대화)
- 목록 페이지의 필터·페이지 쿼리는 canonical에 포함하지 않는다(정본=쿼리 없는 목록)
- 루트에 전역 canonical을 두지 않는 기존 원칙 유지

## 4. sitemap 확장 (상세 URL 포함)

- `getNotices`·`getEvents`(기존 `src/lib/api/`)로 공지·행사 목록을 페이지 순회 수집해 상세 URL 포함
  - 상한: 도메인당 최대 500건(초과분은 최신순 우선) — 소형 사이트라 실질 도달 불가한 안전 상한
  - `lastModified` = 글 수정일(없으면 작성일)
- **fetch 실패 시 정적 엔트리만 반환** (try/catch) — CI는 백엔드 없이 빌드되므로 필수
- 재생성 주기: revalidate 1일 — 새 글이 다음날 sitemap에 반영. 구현 전 `node_modules/next/dist/docs`의 sitemap 문서로 revalidate 지원 방식 확인(이 Next는 breaking changes 전제)

## 5. JSON-LD 확장

### 5.1 Church 보강 (로컬 SEO)

- `church.ts`에 주소 세분화 상수 추가: 시/도(`충청남도`)·시/군/구(`예산군`)·나머지 상세주소 — JSON-LD `addressRegion`·`addressLocality`·`streetAddress`에 매핑
- 좌표 상수(`CHURCH_GEO`) 자리 추가 — 값 확보 시 `geo`(GeoCoordinates) 출력, null이면 미출력. 좌표 확인 절차는 운영 가이드에 포함

### 5.2 콘텐츠 스키마

- 공지 상세 = `Article`(headline·datePublished·dateModified·author=교회), 행사 상세 = `Event`(name·startDate·endDate·location=교회 주소)
- `ChurchJsonLd` 패턴을 따르는 소형 컴포넌트(`src/components/seo/`)로 각 상세 RSC에서 렌더 — 데이터는 페이지가 이미 가진 응답을 props로 주입(추가 fetch 없음)

## 6. RSS 피드

- `/rss.xml` route handler — 공지·행사 통합 최신 50건, RSS 2.0
- item: title·link(절대 URL)·pubDate·description(마크다운 스트립 요약, XML 이스케이프)
- 용도: 네이버 서치어드바이저 RSS 제출(웹문서 수집 보조)
- fetch 실패 시 빈 채널 반환(채널 메타만), 재생성 주기는 sitemap과 동일(1일)

## 7. 운영 가이드 문서

`docs/seo-operations.md` — 코드 밖 등록 작업의 단계별 절차(사용자 직접 수행):

1. 소유확인 코드 발급 → Vercel env(`GOOGLE_SITE_VERIFICATION`·`NAVER_SITE_VERIFICATION`) 등록 → 재배포
2. 구글 서치콘솔: 속성 추가 → 소유확인 → `sitemap.xml` 제출
3. 네이버 서치어드바이저: 사이트 등록 → 소유확인 → `sitemap.xml`·`rss.xml` 제출 → 수집 요청
4. 네이버 스마트플레이스·구글 비즈니스 프로필 등록(지역 키워드의 실질 승부처) — 좌표 확인해 `CHURCH_GEO` 채우기 연계
5. 확인 체크리스트: 색인 확인 방법(site: 검색·서치콘솔 색인 보고서), 반영까지 걸리는 기간 안내

## 8. 에러 처리

- sitemap·RSS: 백엔드 fetch 실패 → 폴백(4·6장 명시). 부분 실패(공지만 실패 등)도 성공한 쪽만 포함
- `generateMetadata`: 글 없음 → 기존 notFound 관례. fetch 예외는 목록 title 폴백이 아니라 페이지와 동일하게 전파(페이지 자체가 실패하는 상황이라 metadata만 살릴 이유 없음)

## 9. 테스트 (vitest, 기존 관례)

- `sitemap.test.ts` 확장: 상세 포함·fetch 실패 폴백·회원 영역 미포함
- `robots.test.ts` 확장: 회원 영역 disallow
- RSS: XML 구조·이스케이프·빈 채널 폴백 단위 테스트
- 마크다운 스트립·요약 헬퍼 단위 테스트
- 상세 generateMetadata: title·description·canonical 산출 검증(기존 페이지 테스트 관례 연장)

## 범위 밖 (명시)

- 글별 OG 대표 이미지 추출, 다음(Daum)·빙 등록, Core Web Vitals 성능 작업, 다국어(hreflang), 블로그·SNS 운영 전략
