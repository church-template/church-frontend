# 부서 소개 페이지 설계 스펙 — T09 (14B DeptHero)

> **⚠️ 개정 (2026-06-12) — 공개 페이지는 "상수 구동"으로 전환.** 아래 §1~§7의 백엔드 fetch 전제는
> 폐기되었다. 최종 구조: 공개 **사역(부서) 소개**는 메인 페이지처럼 **프론트 상수(`src/constants/departments.ts`
> `DEPARTMENTS`)** 로만 구동한다(백엔드 불필요 → `/departments`=Static, `/departments/[slug]`=SSG로
> 정적 생성, 메인처럼 자립·스크롤 데모 가능). 백엔드 `GET /api/departments`(`src/lib/api/departments.ts`)는
> **교인 정보관리(어드민)** 용도로 **보존만** 하고 공개 페이지는 쓰지 않는다. 라우트 키는 `id`가 아닌 **`slug`**.
> nav IA: "교육부서"→**"사역"**(학생부·청년부·예배부·남선교회·여선교회), "소식"→**"교회소식"**.
> DeptHero(14B.4)·DepartmentCard·SubDepartments·DeptLeader는 **그대로 재사용**(타입만 `Department`로 교체).
> 컴포넌트 디자인 원칙(아래)은 유효하다. 데이터 출처·라우트·nav만 본 개정으로 갱신.
>
> 2026-06-12 브레인스토밍 확정본. 참조: spot.wooribank.com/pot/Dream — Playwright로 직접 관찰
> (랜딩 + 조직소개·비전·경영진 서브페이지). 사용자가 "Dream처럼 만들거야"로 디자인 방향 지목.
> 선행 T7(앱 셸)·T6(공통 유틸)·T8(CrossHero/HeroMedia) 완료 기준. 이슈: `.issues/T09-dept-page.md`.

부서 **목록 `/departments`**(그룹별 카드 섹션)와 **상세 `/departments/[id]`**(DeptHero 카드확장 + 본문)를
구현한다. DeptHero 참조 코드(14B.4)는 검증 로직이라 그대로 옮기고, 나머지는 Dream 디자인 언어를
**단일 액센트로 환원**(다색 → primary/surface 토큰 교차, 디스플레이 굵기 500)해 적용한다.

## 1. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| D1 | 라우트 = `src/app/departments/`(**그룹 밖**) | (site) layout이 SiteShell(라이트 셸)을 강제 → 풀블리드 히어로의 상세와 충돌. `departments/`에 `layout.tsx` 두지 않고 **각 page가 셸을 직접 합성**. SiteShell 주석("부서(T9)는 투명 헤더 직접 합성")과 정합 |
| D2 | 상세 헤더 = `<SiteHeader variant="transparent" solid />` **고정** | transparent+solid = `fixed` + 라이트 스킨. DeptHero 시작 화면이 **라이트**(흰 배경+ink 헤드라인)라 on-dark 투명은 가독성 위험 + 14B 검수 항목 아님 → IO 전환(HeroHeaderSync) 불필요, **메인 코드 무수정**(surgical). on-dark 몰입 전환은 범위 밖(§7) |
| D3 | 상세 본문 = 히어로→인도자→본문→하위부서 | 별도 스테이트먼트 밴드 **제외**(DeptHero 캡션이 이미 그 비트). 리더는 그라데이션 카드 아닌 **가벼운 메타 라인**(1인이라). description=raw 마크다운→`MarkdownContent`(T6). 하위부서=카드 그리드+`Reveal` |
| D4 | 목록 = **그룹별 카드 섹션** (조직도 다이어그램 ✗) | 목적은 탐색 → 카드가 48px 터치·모바일 1-up·"사진이 주인공"에 유리. 커넥터 SVG 커스텀 복잡도 0. 트리가 얕다(1~2단) 가정 |
| D5 | 히어로 미디어·캡션 = **프론트 상수**(백엔드 H) | 부서 API에 대표이미지·캡션 없음 → `DEPT_CONTENT: Record<id,{media,caption}>` + 미매핑 폴백. 정적 에셋 `/dept/{id}.jpg`(a안). 콘텐츠 하드코딩 금지(12장) |
| D6 | `HeroMedia` 공유 | `src/hero/types.ts`(T8)에 이미 "CrossHero·DeptHero 공유" 정의됨 → 신규 생성 X. DeptHero는 `./types`에서 import |
| D7 | 데이터 경계 = 서버 컴포넌트 fetch + ISR | `getDepartments()`(목록)·`getDepartment(id)`(상세) revalidate 60, `await connection()`(CI 빌드, [[next16-connection-vs-force-dynamic]]). 상세는 둘을 **병렬** fetch(목록=자식 계산용). detail 404 → `notFound()` |
| D8 | 카드 비주얼 = `sermon-card` 계열 재사용 | 부서 카드 = 16:9 썸네일(부서 히어로 이미지/poster) + 이름 + 인도자. 목록 카드 이미지 = 상세 히어로 이미지 → **목록↔상세 시각 연속성** |

## 2. 파일 구조

```
신규
├─ src/app/departments/page.tsx               # (server) 목록 — SiteShell + 서브헤더 + DepartmentTree
├─ src/app/departments/page.test.tsx
├─ src/app/departments/[id]/page.tsx          # (server) 상세 — transparent+solid 헤더 + DeptHero + 본문 + CtaBand + SiteFooter
├─ src/app/departments/[id]/page.test.tsx
├─ src/hero/DeptHero.tsx                       # (client) 14B.4 검증 코드 — 로직 변경 금지
├─ src/hero/DeptHero.module.css               #          하드코딩 수치(#fff·rgba·px·1200)는 검증 코드 예외(CLAUDE.md)
├─ src/hero/DeptHero.test.tsx
├─ src/lib/api/departments.ts                 # getDepartments / getDepartment / buildDepartmentTree
├─ src/lib/api/departments.test.ts
├─ src/constants/departments.ts               # DEPT_CONTENT(id→{media,caption[]}) · DEPT_FALLBACK · DEPT_PAGE(목록 카피)
├─ src/components/departments/DepartmentCard.tsx      # (server) 부서 카드(썸네일+이름+인도자) — 목록·하위부서 공용
├─ src/components/departments/DepartmentTree.tsx      # (server) 그룹별 카드 섹션(루트→자식 그리드)
├─ src/components/departments/DeptLeader.tsx          # (server) "인도 · {leader}" 메타 라인
├─ src/components/departments/SubDepartments.tsx      # (server) 하위부서 그리드 + Reveal 등장
└─ (각 테스트 파일)

변경
├─ src/lib/api/types.ts          # DepartmentCard, DepartmentDetail, DepartmentNode 추가
├─ src/constants/navigation.ts   # (선택) 트리 라우트 생기면 DEPT_LINKS 보강은 후속(스펙 M1 유지)
└─ .claude/rules/DESIGN.md       # components 절에 dept-hero · department-card · dept-tree 항목 추가(구현 노트 4)
```

## 3. 데이터 계층

### 타입 (`src/lib/api/types.ts`) — 기존 `SermonCardResponse` 식 `...Response` 접미사 컨벤션 준수(컴포넌트 `DepartmentCard`와 이름 충돌도 회피)
```ts
export interface DepartmentCardResponse {   // GET /api/departments (비페이징 평배열, 정렬 sortOrder,id)
  id: number; name: string; leader: string; parentId: number | null; sortOrder: number;
}
export interface DepartmentDetailResponse extends DepartmentCardResponse {   // GET /api/departments/{id}
  description: string; createdAt: string; updatedAt: string; version: number;
}
export interface DepartmentNode extends DepartmentCardResponse { children: DepartmentNode[]; }
```

### fetch·트리 (`src/lib/api/departments.ts`) — `main.ts` 패턴 동형
- `getDepartments(): Promise<DepartmentCardResponse[]>` — `apiUrl("/api/departments")`, revalidate 60, `!ok`→throw(루트 error.tsx 위임), `?? []` 방어.
- `getDepartment(id): Promise<DepartmentDetailResponse | null>` — revalidate 60, **404→null**(상세 미존재), 그 외 `!ok`→throw.
- `buildDepartmentTree(list): DepartmentNode[]` — `parentId`로 자식 매핑, `bySortOrder` 정렬, **부모 없는 parentId(고아)는 루트로 승격**(방어). 순수 함수(불변).
- `bySortOrder = (a, b) => a.sortOrder - b.sortOrder || a.id - b.id` — 정렬 비교자 export. 트리 조립·상세 자식 정렬에서 공용.

## 4. 컴포넌트 명세

### DeptHero (`src/hero/`) — 14B.4 그대로
- 이슈 14B.4 참조 코드 1:1 이식. props `{ title: string; caption: ReactNode; media: HeroMedia }`.
- import 경로만 조정: `HeroMedia`는 `./types`(데모의 `./hero/types` 아님 — 본 레포는 형제 위치).
- clip-path 확장 + placeholder 측정 + rAF 스로틀 + reduced-motion 정적 폴백 — **금지(14B.7) 준수**.

### DeptLeader
- `{ name: string }` → `인도 · {name}` 한 줄. `typo.datetime`(또는 bodySm) + `text-muted`. name 빈 문자열이면 호출부에서 렌더 생략.

### DepartmentCard (목록·하위부서 공용)
- `{ dept: DepartmentCardResponse }` → `<Link href={`/departments/${dept.id}`}>`. 16:9 썸네일(=`DEPT_CONTENT[dept.id]`의 image src 또는 video poster, 없으면 `DEPT_FALLBACK`) + 이름(`typo.titleMd`) + 인도자(`typo.datetime`·muted). `sermon-card` 호버(soft drop + 썸네일 1.03 줌) 재사용. 이미지 raw `<img>`는 sermon-card와 동일 처리.

### DepartmentTree (목록)
- `{ roots: DepartmentNode[] }`. 루트별:
  - 자식 있음 → `<section>`: 헤딩 = `<Link href=/departments/{root.id}>{root.name}</Link>`(`typo.titleLg`), 그 아래 `root.children` → 그리드 `lg:grid-cols-3 sm:grid-cols-2`(모바일 1-up)의 `DepartmentCard`.
  - 자식 없음(리프 루트) → 말미 단일 그리드에 `DepartmentCard`로 모아 배치(단독 섹션 난립 방지).
- 모든 부서가 카드 또는 헤딩 링크로 상세 도달 가능.

### SubDepartments (상세 하위부서)
- `{ items: DepartmentCardResponse[] }` → `<section>` 헤딩 "하위 부서"(`typo.titleLg`) + `DepartmentCard` 그리드, 카드마다 `Reveal delay={i*120}`(IO 1회 fade+slide-up, reduced-motion 즉시표시 — T08 공용 `Reveal` 재사용).

## 5. 페이지 합성

### 목록 `/departments/page.tsx` (server)
```
await connection(); const list = await getDepartments(); const roots = buildDepartmentTree(list);
<SiteShell>                                  // 라이트 헤더 + CtaBand + Footer
  <Container py-section>
    <eyebrow>{DEPT_PAGE.eyebrow}</eyebrow>    // "교육부서" · 중앙 · typo.caption · text-primary
    <h1>{DEPT_PAGE.title}</h1>                // "교육부서 안내" · 중앙 · typo.displayMd
    <DepartmentTree roots={roots} />
  </Container>
</SiteShell>
```
- 빈 목록(초기 구축) → "등록된 부서가 없습니다" 플레이스홀더(레이아웃 점프 방지, 13.2).

### 상세 `/departments/[id]/page.tsx` (server)
```
await connection();
const { id } = await params;                 // Next 동적 params는 await(코드 작성 전 node_modules/next/dist/docs 확인 — AGENTS.md)
const n = Number(id); if (!Number.isInteger(n)) notFound();
const [list, detail] = await Promise.all([getDepartments(), getDepartment(n)]);
if (!detail) notFound();
const content = DEPT_CONTENT[detail.id] ?? DEPT_FALLBACK;
const caption = content.caption.map((l,i) => <span key={i} className="block">{l}</span>);
const children = list.filter(d => d.parentId === detail.id).sort(bySortOrder);

<SiteHeader variant="transparent" solid />   // fixed 라이트, IO 전환 없음(D2)
<main>
  <DeptHero title={detail.name} caption={caption} media={content.media} />
  <Container py-section>
    <DeptLeader name={detail.leader} />        // leader 있을 때만
    {detail.description ? <MarkdownContent source={detail.description} /> : null}
  </Container>
  {children.length ? <SubDepartments items={children} /> : null}
</main>
<CtaBand /> <SiteFooter />
```

### 상수 (`src/constants/departments.ts`)
```ts
interface DeptContent { media: HeroMedia; caption: string[]; }   // caption 줄 단위 배열
export const DEPT_CONTENT: Record<number, DeptContent> = { /* 1: { media:{type:'image',src:'/dept/1.jpg',alt:'청년부'}, caption:['믿음으로 자라는 다음세대'] } */ };
export const DEPT_FALLBACK: DeptContent = { media: { type:'image', src:'/dept/default.jpg', alt:'' }, caption: ['함께 자라가는 공동체'] };
export const DEPT_PAGE = { eyebrow: '교육부서', title: '교육부서 안내' };
```

## 6. 테스트 (TDD RED→GREEN, 80%+)

| 대상 | 검증 |
|---|---|
| departments.ts | getDepartments/getDepartment fetch(mock·revalidate·404→null·!ok throw) / `buildDepartmentTree`(parentId 중첩·sortOrder 정렬·고아 승격·불변) |
| DeptHero | reduced-motion 정적 폴백 / `media.type` image·video 분기 / 영상 onError→poster 폴백(videoFailed) / title·caption 렌더 |
| DepartmentCard | 링크 href·썸네일(content/fallback)·이름·인도자 매핑 |
| DepartmentTree | 루트별 섹션·자식 그리드·리프 루트 단일 그리드·모든 부서 도달 |
| SubDepartments | items 그리드·Reveal 래핑·delay |
| 목록 page | 트리 렌더·빈 목록 플레이스홀더 |
| 상세 page | hero title=name·DeptLeader·description 마크다운·children·`notFound`(미존재/비정수 id) |

## 7. 범위 밖
- 부서 CRUD·루트화(`PUT parentId=null`)·`409 DEPARTMENT_HAS_CHILDREN` — **어드민 영역**(조회·트리 표시까지).
- 상세 헤더 on-dark 투명 몰입 전환(카드 풀스크린 진행도 동기화) — 가독성·복잡도 리스크, 14B 검수 밖 → 후속(D2).
- 형제부서 이전/다음 네비(브레인스토밍에서 미선택).
- `media:{id}` 동적 미디어 주입 — 정적 에셋 a안. 단 DeptHero는 `media.src`로 `/api/media/{id}`도 동일 동작(14B.9 검수 항목).
- 3단+ 깊은 트리 — 얕은 1~2단 가정. 실제 데이터가 더 깊으면 DepartmentTree 섹션 중첩 한 단 추가(다이어그램 전환 불필요).
- 부서별 실사진 에셋 제작 — `/dept/{id}.jpg` 경로 관례만 정의, 에셋은 배포 시 교체.
