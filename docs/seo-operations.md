# SEO 운영 가이드 (#117)

코드 밖에서 관리자가 직접 해야 하는 검색 등록·운영 절차. 기술 작업(메타·sitemap·RSS)은
코드에 반영되어 있고(스펙: `docs/superpowers/specs/2026-08-07-naver-google-seo-design.md`),
이 문서는 그 결과물을 검색엔진에 제출·등록하는 순서다.

## 0. 사전 확인

- 배포 도메인이 `https://www.eunsaem.com` 인지 확인
- 아래 세 URL이 정상 응답하는지 브라우저로 확인:
  - `https://www.eunsaem.com/robots.txt`
  - `https://www.eunsaem.com/sitemap.xml`
  - `https://www.eunsaem.com/rss.xml`

## 1. 소유확인 코드 발급·설정 (공통 선행)

1. 구글 서치콘솔(https://search.google.com/search-console) 접속 → 속성 추가 → **URL 접두어** 방식으로 `https://www.eunsaem.com` 입력
2. 확인 방법에서 **HTML 태그** 선택 → `content="..."` 안의 값만 복사
3. 네이버 서치어드바이저(https://searchadvisor.naver.com) 접속 → 웹마스터 도구 → 사이트 등록 → `https://www.eunsaem.com` 입력
4. 소유확인 방법에서 **HTML 태그** 선택 → `content="..."` 안의 값만 복사
5. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에 등록:
   - `GOOGLE_SITE_VERIFICATION` = (2에서 복사한 값)
   - `NAVER_SITE_VERIFICATION` = (4에서 복사한 값)
6. **재배포** (env는 빌드 시 주입되므로 재배포해야 태그가 나온다)
7. 각 콘솔로 돌아가 "소유확인" 버튼 클릭

## 2. 구글 서치콘솔

1. 좌측 **Sitemaps** 메뉴 → `https://www.eunsaem.com/sitemap.xml` 제출
2. 색인 생성 → 페이지 보고서에서 수집 현황 확인 (반영까지 수일~수주)

## 3. 네이버 서치어드바이저

1. 요청 → **사이트맵 제출**: `https://www.eunsaem.com/sitemap.xml`
2. 요청 → **RSS 제출**: `https://www.eunsaem.com/rss.xml`
3. 요청 → **웹 페이지 수집**: 홈·소개·예배안내·오시는길 등 주요 URL을 수동 수집 요청 (초기 1회)
4. 검증 → **robots.txt 검증**으로 차단 오류가 없는지 확인

## 4. 지역 검색 (실질 승부처)

"예산 교회"류 지역 검색은 네이버 플레이스·구글 지도가 상단을 차지하므로, 코드보다 여기 등록이 결정적이다.

1. **네이버 스마트플레이스**(https://smartplace.naver.com) 신규 등록:
   - 업체명(은샘교회)·업종(종교시설)·주소(충청남도 예산군 삽교읍 수암산로 260)·전화·홈페이지 URL
2. **구글 비즈니스 프로필**(https://business.google.com) 등록:
   - 동일 정보 + 예배 시간을 영업시간으로 입력
3. 등록 과정에서 확인한 **좌표(위도·경도)를 개발자에게 전달**:
   - `src/constants/church.ts`의 `CHURCH_GEO`에 반영하면 구조화 데이터(geo)가 함께 출력된다

## 5. 확인 체크리스트

- 구글: `site:eunsaem.com` 검색으로 수집 페이지 확인 + 서치콘솔 색인 보고서
- 네이버: `site:eunsaem.com` + 서치어드바이저 수집 현황
- "은샘교회" 검색 시 공식 사이트 노출 확인 (반영은 수일~수주, 신규 도메인은 더 걸릴 수 있음)
- 새 공지·행사가 **다음날** `sitemap.xml`·`rss.xml`에 나타나는지 확인 (재생성 주기 1일)
- 배포 직후 `rss.xml`·`sitemap.xml`에 상세 글이 비어 보이면 하루 내 재생성을 기다리거나 재배포
