# 나머지 부서 상세 보강 섹션 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 청년부·예배부·남선교회·여선교회 상세 페이지에 학생부(#78)와 동일한 보강 섹션 콘텐츠를 채워, 모든 부서 상세가 일관된 서사(소개 → 활동 사진 → 주요 활동 → 특별 프로그램 → 알림 → 초대)로 렌더되게 한다.

**Architecture:** 섹션 컴포넌트·조립 순서·밴드 리듬·텍스트 스케일은 #78·#80에서 이미 구현·확정됨. 이 작업은 **콘텐츠 주입만** 한다 — `src/constants/departments.ts`의 4개 부서 객체에 보강 필드(모두 옵션)를 추가하고, 각 부서 활동 사진 placeholder 에셋을 준비한다. 페이지 조립부(`src/app/departments/[slug]/page.tsx`)는 옵션 필드가 있으면 자동으로 해당 섹션을 렌더하므로 페이지 코드 변경은 없다.

**Tech Stack:** Next.js(App Router) 서버 컴포넌트, TypeScript, 프론트 상수 구동(정적 생성). 콘텐츠는 상수에서만 주입(하드코딩 금지, 가이드 12장).

## Global Constraints

- 테스트 코드 추가하지 않음(사용자 지시) — 검증은 `npx tsc --noEmit` + `pnpm lint` + `pnpm build` + 육안.
- `icon` 값은 `book` · `users` · `sparkles` 3종만 허용(`DeptFeatures`의 `ICONS` 매핑 한정). 다른 문자열은 `BookOpen` 폴백이라 의미가 어긋남.
- 콘텐츠 하드코딩 금지 — 모든 사용자 노출 텍스트는 `src/constants/departments.ts` 상수에서 주입. 컴포넌트에 문구를 직접 쓰지 않는다.
- 히어로 미디어·활동 사진은 placeholder(배포 시 교체). 활동 사진은 `public/dept/{slug}/{1..4}.jpg` 관례(학생부와 동일).
- 섹션 구성 규격: features 3개, info 4개, activities 4개, programs 4개, gallery 4장(학생부와 동일 수량 — 그리드 정렬 일관).
- info의 담당자·모임 시간·연락처·장소는 placeholder 기본값(교회 확정 전) — 연락처는 학생부와 동일한 대표번호 `041-337-2298` 재사용, 시간·장소는 편집 가능한 기본값.
- 커밋 이슈 태그: 이 작업의 이슈 번호는 `#82`(이슈 문서: `.issues/20260703_기능개선_나머지_부서_상세_보강_섹션_적용.md`). 모든 커밋 메시지 끝에 `#82`. 형식: `<type> : <설명> #82`.
- 커밋 규칙: `git push` 금지 · Co-Authored-By 금지 · GPG 서명 금지 · `git add .`/`-A` 금지(경로 명시).

---

## File Structure

- `src/constants/departments.ts` — 4개 부서(`youth`·`praise`·`men`·`women`) 객체에 보강 필드 추가. 유일한 소스 파일 수정 지점. 기존 `student` 객체(59~102행)가 참조 템플릿.
- `public/dept/youth/{1..4}.jpg`, `public/dept/praise/{1..4}.jpg`, `public/dept/men/{1..4}.jpg`, `public/dept/women/{1..4}.jpg` — 활동 사진 placeholder(학생부 placeholder 복사). 신규 생성.
- 변경 없음(재사용만): `src/app/departments/[slug]/page.tsx`, `src/components/departments/*`(DeptFeatures·DeptInfo·DeptActivities·DeptPrograms·DeptGallery·DeptInvite), `src/app/globals.css`.

각 Task는 부서 하나를 완결한다(콘텐츠 + 사진 + 검증 + 커밋). 부서 간 의존 없음 — 순서 무관하게 독립 실행·리뷰 가능.

---

### Task 1: 청년부(youth) 보강 섹션

**Files:**
- Modify: `src/constants/departments.ts` (youth 객체, 현재 103~110행)
- Create: `public/dept/youth/1.jpg`, `public/dept/youth/2.jpg`, `public/dept/youth/3.jpg`, `public/dept/youth/4.jpg`

**Interfaces:**
- Consumes: `Department` 타입의 옵션 필드 `intro`·`features`·`info`·`activities`·`programs`·`gallery`·`invite`(departments.ts 36~42행). `DeptFeature{icon,title,desc}`·`DeptInfoItem{label,value}`·`DeptProgram{name,desc}`·`DeptPhoto{src,alt}`.
- Produces: 없음(콘텐츠 데이터 — 하위 소비 없음). `/departments/youth` 상세가 6개 보강 섹션을 렌더.

- [ ] **Step 1: 활동 사진 placeholder 폴더 생성·복사**

Run:
```bash
mkdir -p public/dept/youth
cp public/dept/student/1.jpg public/dept/youth/1.jpg
cp public/dept/student/2.jpg public/dept/youth/2.jpg
cp public/dept/student/3.jpg public/dept/youth/3.jpg
cp public/dept/student/4.jpg public/dept/youth/4.jpg
```
Expected: `public/dept/youth/`에 1~4.jpg 4개 생성.

- [ ] **Step 2: youth 객체에 보강 필드 추가**

`src/constants/departments.ts`에서 youth 객체를 아래로 교체(기존 `caption: ["청년의 때에", "주를 만나다"],` 뒤에 보강 필드를 추가):

```ts
  {
    slug: "youth",
    name: "청년부",
    description:
      "대학생과 직장인 청년이 **예배와 교제**로 신앙의 뿌리를 내리는 공동체입니다.\n\n각자의 자리에서 그리스도의 제자로 살아가며, 진솔한 나눔과 깊이 있는 말씀으로 함께 성장합니다.",
    media: img("youth", "청년부"),
    caption: ["청년의 때에", "주를 만나다"],
    intro: {
      heading: "청년부 소개",
      lead: "대학생과 직장인 청년들이 삶의 자리에서 그리스도의 제자로 살아가도록 돕는 사역입니다. 진솔한 나눔과 깊이 있는 말씀 안에서 함께 신앙의 뿌리를 내려가세요.",
    },
    features: [
      { icon: "book", title: "말씀 훈련", desc: "청년의 눈높이에 맞춘 깊이 있는 성경 공부" },
      { icon: "users", title: "소그룹 교제", desc: "진솔한 나눔으로 서로를 세우는 공동체" },
      { icon: "sparkles", title: "비전과 소명", desc: "삶의 자리에서 부르심을 발견하는 시간" },
    ],
    info: [
      { label: "담당자", value: "청년부 담당 교역자" },
      { label: "모임 시간", value: "매주 토요일 오전 11시 (학생·청년예배)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 청년부실" },
    ],
    activities: [
      "토요일 청년 예배 및 말씀 나눔",
      "주중 소그룹 모임",
      "청년 수련회·비전 캠프",
      "지역 섬김과 봉사 활동",
    ],
    programs: [
      { name: "청년 수련회", desc: "일상을 떠나 예배와 교제에 집중하는 시간" },
      { name: "비전 캠프", desc: "삶의 방향과 소명을 함께 찾는 시간" },
      { name: "제자 훈련", desc: "말씀 안에서 그리스도의 제자로 세워지는 과정" },
      { name: "청년 찬양의 밤", desc: "찬양으로 마음을 모아 하나님께 드리는 예배" },
    ],
    gallery: [
      { src: "/dept/youth/1.jpg", alt: "청년부 활동 사진 1" },
      { src: "/dept/youth/2.jpg", alt: "청년부 활동 사진 2" },
      { src: "/dept/youth/3.jpg", alt: "청년부 활동 사진 3" },
      { src: "/dept/youth/4.jpg", alt: "청년부 활동 사진 4" },
    ],
    invite: {
      heading: "청년부에서 함께해요",
      body: "이제 막 신앙을 시작한 청년도, 오랜 믿음의 청년도 환영합니다. 같은 시대를 살아가는 또래들과 예배하고 교제하며, 삶의 자리에서 주님을 만나가세요. 언제든지 편안하게 찾아오세요.",
    },
  },
```

- [ ] **Step 3: 타입·린트 검증**

Run: `npx tsc --noEmit && pnpm lint`
Expected: tsc "No errors found", lint 0 errors(기존 경고 2건 외 신규 없음).

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: Compiled successfully, `/departments/[slug]`에 `/departments/youth` 정적 생성.

- [ ] **Step 5: 커밋**

```bash
git add src/constants/departments.ts public/dept/youth
git commit -m "feat : 청년부 상세 보강 섹션 콘텐츠·활동사진 추가 #82"
```

---

### Task 2: 예배부(praise) 보강 섹션

**Files:**
- Modify: `src/constants/departments.ts` (praise 객체, 현재 111~118행)
- Create: `public/dept/praise/1.jpg`~`4.jpg`

**Interfaces:**
- Consumes: Task 1과 동일한 `Department` 옵션 필드·서브타입.
- Produces: `/departments/praise` 상세가 6개 보강 섹션 렌더.

- [ ] **Step 1: 활동 사진 placeholder 폴더 생성·복사**

Run:
```bash
mkdir -p public/dept/praise
cp public/dept/student/1.jpg public/dept/praise/1.jpg
cp public/dept/student/2.jpg public/dept/praise/2.jpg
cp public/dept/student/3.jpg public/dept/praise/3.jpg
cp public/dept/student/4.jpg public/dept/praise/4.jpg
```
Expected: `public/dept/praise/`에 1~4.jpg 생성.

- [ ] **Step 2: praise 객체에 보강 필드 추가**

`src/constants/departments.ts`에서 praise 객체를 아래로 교체:

```ts
  {
    slug: "praise",
    name: "예배부",
    description:
      "찬양과 경배로 **예배를 섬기는** 사역팀 'Seed-씨앗'입니다.\n\n리드보컬과 악기, 음향·방송이 한 마음으로 성도들의 마음을 모아 하나님께 영광을 돌립니다.",
    media: img("praise", "예배부"),
    caption: ["온 맘 다해", "주를 찬양하라"],
    intro: {
      heading: "예배부 소개",
      lead: "찬양과 경배로 예배를 섬기는 사역팀 'Seed-씨앗'입니다. 리드보컬·악기·음향·방송이 한마음으로 성도들의 마음을 모아 하나님께 영광을 올려드립니다.",
    },
    features: [
      { icon: "sparkles", title: "찬양 인도", desc: "리드보컬과 싱어가 예배의 흐름을 이끕니다" },
      { icon: "users", title: "연주팀", desc: "건반·기타·베이스·드럼이 함께 만드는 찬양" },
      { icon: "book", title: "음향·방송", desc: "보이지 않는 곳에서 예배를 든든히 섬깁니다" },
    ],
    info: [
      { label: "담당자", value: "예배부 찬양 인도자" },
      { label: "모임 시간", value: "매주 주일 오전 9시 30분 (예배 전 연습)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 본당·음향실" },
    ],
    activities: [
      "주일 예배 찬양 인도",
      "정기 찬양 연습",
      "특별 예배·절기 찬양 준비",
      "음향·영상 방송 섬김",
    ],
    programs: [
      { name: "찬양의 밤", desc: "온 성도가 함께 드리는 찬양 예배" },
      { name: "절기 특별 찬양", desc: "부활절·성탄절 등 절기를 위한 찬양 준비" },
      { name: "워십 워크숍", desc: "찬양과 연주 실력을 함께 다듬는 시간" },
      { name: "신입 팀원 훈련", desc: "새로 섬기는 지체를 위한 기초 훈련" },
    ],
    gallery: [
      { src: "/dept/praise/1.jpg", alt: "예배부 활동 사진 1" },
      { src: "/dept/praise/2.jpg", alt: "예배부 활동 사진 2" },
      { src: "/dept/praise/3.jpg", alt: "예배부 활동 사진 3" },
      { src: "/dept/praise/4.jpg", alt: "예배부 활동 사진 4" },
    ],
    invite: {
      heading: "예배부에서 함께 섬겨요",
      body: "찬양과 연주, 음향과 방송으로 예배를 섬기고 싶은 분들을 기다립니다. 재능보다 중요한 것은 예배자의 마음입니다. 함께 온 맘 다해 주님을 찬양하며 섬김의 자리로 나아가세요.",
    },
  },
```

- [ ] **Step 3: 타입·린트 검증**

Run: `npx tsc --noEmit && pnpm lint`
Expected: tsc "No errors found", lint 신규 오류 없음.

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: Compiled successfully, `/departments/praise` 생성.

- [ ] **Step 5: 커밋**

```bash
git add src/constants/departments.ts public/dept/praise
git commit -m "feat : 예배부 상세 보강 섹션 콘텐츠·활동사진 추가 #82"
```

---

### Task 3: 남선교회(men) 보강 섹션

**Files:**
- Modify: `src/constants/departments.ts` (men 객체, 현재 119~126행)
- Create: `public/dept/men/1.jpg`~`4.jpg`

**Interfaces:**
- Consumes: Task 1과 동일.
- Produces: `/departments/men` 상세가 6개 보강 섹션 렌더.

- [ ] **Step 1: 활동 사진 placeholder 폴더 생성·복사**

Run:
```bash
mkdir -p public/dept/men
cp public/dept/student/1.jpg public/dept/men/1.jpg
cp public/dept/student/2.jpg public/dept/men/2.jpg
cp public/dept/student/3.jpg public/dept/men/3.jpg
cp public/dept/student/4.jpg public/dept/men/4.jpg
```
Expected: `public/dept/men/`에 1~4.jpg 생성.

- [ ] **Step 2: men 객체에 보강 필드 추가**

`src/constants/departments.ts`에서 men 객체를 아래로 교체:

```ts
  {
    slug: "men",
    name: "남선교회",
    description:
      "남성 성도들이 **섬김과 봉사**로 교회를 세워가는 공동체입니다.\n\n예배와 선교, 교회 시설 섬김과 형제 교제로 가정과 교회의 영적 리더로 함께 성장합니다.",
    media: img("men", "남선교회"),
    caption: ["섬김으로 세우는", "믿음의 공동체"],
    intro: {
      heading: "남선교회 소개",
      lead: "남성 성도들이 섬김과 봉사로 교회를 세워가는 공동체입니다. 예배와 선교, 교회 시설을 섬기며 형제의 교제 안에서 가정과 교회의 영적 리더로 함께 성장합니다.",
    },
    features: [
      { icon: "users", title: "형제 교제", desc: "믿음의 형제들과 함께하는 든든한 동역" },
      { icon: "book", title: "말씀과 기도", desc: "가정과 교회를 세우는 영적 리더로 훈련" },
      { icon: "sparkles", title: "섬김과 봉사", desc: "교회 시설과 지역을 위한 손길" },
    ],
    info: [
      { label: "담당자", value: "남선교회 회장" },
      { label: "모임 시간", value: "매월 첫째 주일 오후 (월례회)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 교육관" },
    ],
    activities: [
      "월례회 및 친교 모임",
      "교회 시설 관리·봉사",
      "선교와 전도 활동",
      "부부·가정 세미나 참여",
    ],
    programs: [
      { name: "남선교회 수련회", desc: "형제들이 함께 믿음을 다지는 시간" },
      { name: "봉사의 날", desc: "교회와 이웃을 위해 손을 모으는 섬김" },
      { name: "아버지 학교", desc: "가정의 영적 리더로 세워지는 과정" },
      { name: "전도 축제", desc: "이웃에게 복음을 전하는 특별한 날" },
    ],
    gallery: [
      { src: "/dept/men/1.jpg", alt: "남선교회 활동 사진 1" },
      { src: "/dept/men/2.jpg", alt: "남선교회 활동 사진 2" },
      { src: "/dept/men/3.jpg", alt: "남선교회 활동 사진 3" },
      { src: "/dept/men/4.jpg", alt: "남선교회 활동 사진 4" },
    ],
    invite: {
      heading: "남선교회와 함께 세워가요",
      body: "믿음의 형제들과 함께 예배하고 섬기며 성장하고 싶은 남성 성도를 환영합니다. 섬김의 자리에서 서로를 격려하며 가정과 교회를 함께 세워가세요. 언제든지 편안하게 함께해 주세요.",
    },
  },
```

- [ ] **Step 3: 타입·린트 검증**

Run: `npx tsc --noEmit && pnpm lint`
Expected: tsc "No errors found", lint 신규 오류 없음.

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: Compiled successfully, `/departments/men` 생성.

- [ ] **Step 5: 커밋**

```bash
git add src/constants/departments.ts public/dept/men
git commit -m "feat : 남선교회 상세 보강 섹션 콘텐츠·활동사진 추가 #82"
```

---

### Task 4: 여선교회(women) 보강 섹션

**Files:**
- Modify: `src/constants/departments.ts` (women 객체, 현재 127~134행)
- Create: `public/dept/women/1.jpg`~`4.jpg`

**Interfaces:**
- Consumes: Task 1과 동일.
- Produces: `/departments/women` 상세가 6개 보강 섹션 렌더.

- [ ] **Step 1: 활동 사진 placeholder 폴더 생성·복사**

Run:
```bash
mkdir -p public/dept/women
cp public/dept/student/1.jpg public/dept/women/1.jpg
cp public/dept/student/2.jpg public/dept/women/2.jpg
cp public/dept/student/3.jpg public/dept/women/3.jpg
cp public/dept/student/4.jpg public/dept/women/4.jpg
```
Expected: `public/dept/women/`에 1~4.jpg 생성.

- [ ] **Step 2: women 객체에 보강 필드 추가**

`src/constants/departments.ts`에서 women 객체를 아래로 교체:

```ts
  {
    slug: "women",
    name: "여선교회",
    description:
      "여성 성도들이 **기도와 나눔**으로 함께하는 공동체입니다.\n\n영성 훈련과 사랑의 봉사, 따뜻한 자매애로 가정과 교회를 섬기며 아름답게 성장합니다.",
    media: img("women", "여선교회"),
    caption: ["기도로 함께하는", "동역의 자리"],
    intro: {
      heading: "여선교회 소개",
      lead: "여성 성도들이 기도와 나눔으로 함께하는 공동체입니다. 영성 훈련과 사랑의 봉사, 따뜻한 자매애 안에서 가정과 교회를 섬기며 아름답게 성장합니다.",
    },
    features: [
      { icon: "book", title: "기도와 말씀", desc: "말씀과 기도로 자라가는 영성 훈련" },
      { icon: "users", title: "자매 교제", desc: "따뜻한 나눔으로 서로를 품는 공동체" },
      { icon: "sparkles", title: "사랑의 봉사", desc: "가정과 교회, 이웃을 향한 섬김의 손길" },
    ],
    info: [
      { label: "담당자", value: "여선교회 회장" },
      { label: "모임 시간", value: "매월 둘째 주일 오후 (월례회)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 교육관" },
    ],
    activities: [
      "월례회 및 기도 모임",
      "구역·소그룹 나눔",
      "교회 행사 섬김과 봉사",
      "이웃 사랑 나눔 활동",
    ],
    programs: [
      { name: "여선교회 수련회", desc: "기도와 말씀으로 영성을 새롭게 하는 시간" },
      { name: "중보기도 모임", desc: "가정과 교회를 위해 함께 기도하는 자리" },
      { name: "사랑의 바자회", desc: "나눔으로 이웃을 섬기는 섬김의 장" },
      { name: "어머니 학교", desc: "믿음의 어머니로 세워지는 과정" },
    ],
    gallery: [
      { src: "/dept/women/1.jpg", alt: "여선교회 활동 사진 1" },
      { src: "/dept/women/2.jpg", alt: "여선교회 활동 사진 2" },
      { src: "/dept/women/3.jpg", alt: "여선교회 활동 사진 3" },
      { src: "/dept/women/4.jpg", alt: "여선교회 활동 사진 4" },
    ],
    invite: {
      heading: "여선교회와 함께해요",
      body: "기도와 나눔으로 함께할 여성 성도를 환영합니다. 따뜻한 자매애 안에서 서로를 격려하며, 가정과 교회를 섬기는 아름다운 동역의 자리로 초대합니다. 언제든 편안하게 함께해 주세요.",
    },
  },
```

- [ ] **Step 3: 타입·린트 검증**

Run: `npx tsc --noEmit && pnpm lint`
Expected: tsc "No errors found", lint 신규 오류 없음.

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: Compiled successfully, `/departments/women` 생성.

- [ ] **Step 5: 커밋**

```bash
git add src/constants/departments.ts public/dept/women
git commit -m "feat : 여선교회 상세 보강 섹션 콘텐츠·활동사진 추가 #82"
```

---

### Task 5: 전체 검증 (4개 부서 일괄 확인)

**Files:** 없음(검증 전용).

- [ ] **Step 1: 기존 상수 테스트 회귀 확인**

Run: `pnpm test src/constants/departments.test.ts`
Expected: PASS(보강 콘텐츠는 slug·이름 미변경이라 기존 테스트 영향 없음).

- [ ] **Step 2: 전체 빌드 재확인**

Run: `pnpm build`
Expected: Compiled successfully, `/departments/[slug]`에 student·youth·praise·men·women 5개 경로 정적 생성.

- [ ] **Step 3: 육안 확인(선택)**

Run: `pnpm dev` 후 브라우저에서 `/departments/youth`·`/departments/praise`·`/departments/men`·`/departments/women` 확인.
Expected: 각 부서가 소개 → 활동 사진(회색 밴드) → 주요 활동 → 특별 프로그램 → 알림(흰 밴드) → 초대 순으로 렌더. 밴드 흰/회색 교차 유지. 학생부와 동일한 시각 리듬·텍스트 스케일.

---

## 범위 밖 · 후속

- 실제 활동 사진·담당자·모임 시간·연락처·장소 확정: 본 계획은 placeholder(사진은 학생부 placeholder 복사, info는 편집 가능한 기본값). 교회 확정 값으로 교체는 후속(상수 편집만).
- 하위 부서(children): 현재 은샘교회 부서 구조상 없음 — 추가 필요 시 어드민 CRUD 또는 상수 확장(범위 밖).
- 어드민 백엔드 `department`(교인 정보관리)와는 무관 — 이 작업은 공개 소개 상수 전용.
