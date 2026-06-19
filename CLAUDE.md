@AGENTS.md

# CLAUDE.md

**교회 홈페이지 프론트엔드 (Church Frontend)**: 교회 홈페이지 템플릿의 프론트엔드
Next.js (App Router) + TypeScript / 공개=서버컴포넌트+ISR · 회원=TanStack Query+authFetch / Tailwind·Zustand·RHF+zod / 패키지 매니저 **pnpm**

> ⚠️ 이 Next.js는 일반 버전과 다르다(breaking changes). **코드 작성 전 `node_modules/next/dist/docs/`를 읽는다** — 상단 `@AGENTS.md` 참조.

---

## 금지 규칙

- **`git push`·커밋은 명시 요청 시에만** — 사용자가 요청할 때만 커밋/푸시한다 (자동 금지)
- **Co-Authored-By 태그 금지** — 커밋 메시지에 절대 추가하지 않는다
- **커밋 메시지에 이슈 태그 필수** — 모든 커밋 메시지 끝에 관련 이슈 번호 태그(`#57` 등)를 붙인다. 형식: `<type> : <설명> #<번호>`
- **파일 삭제 시 사용자 허락 필수** — 확인 없이 삭제하지 않는다
- **답변은 항상 한국어** — 코드/커맨드 제외 모두 한국어
- **모르면 모른다고** — 확실하지 않은 내용은 추측하지 않는다
- **주석은 한국어, WHY 중심** — 과하지 않게, 주변 코드 스타일에 맞춘다
- **콘텐츠 하드코딩 금지** — 사용자 노출 텍스트·이미지·영상은 API 또는 상수(`src/constants/church.ts`)에서 주입한다 (가이드 12장)
- **텍스트 스타일은 `typo.*` 상수 사용** — `src/constants/typography.ts`의 의미 상수(`typo.displayMega`·`typo.bodyMd` 등)로 적용한다. 컴포넌트에 폰트 크기/굵기/행간을 직접 쓰지 않는다. 새 위계가 필요하면 DESIGN.md → globals.css `@theme --text-*` → `typo`에 추가 후 사용
- **hex·px 인라인 금지** — 색·크기·간격은 DESIGN.md 토큰(globals.css `@theme` → Tailwind 유틸 `bg-primary`·`p-section`) 참조. arbitrary value(`bg-[#...]`) 금지. 예외: CrossHero/DeptHero 검증 로직 내부 수치(SVG 좌표·rgba)
- **UI 이모지 금지 · 아이콘은 `lucide-react`** — 사용자 노출 UI에 이모지(🎉·✅ 등)를 쓰지 않는다. 아이콘이 필요하면 `lucide-react`만 사용한다(다른 아이콘 세트·이미지 아이콘 임의 도입 금지, 가이드 15.1). 색은 `currentColor`(토큰 상속), 크기는 `size` prop
- **JSX 조건부 렌더링은 삼항으로** — `{cond && <X/>}` 금지, `{cond ? <X/> : null}` 사용 (falsy `0`·`""` 렌더링 방어). `cn()` 내부 className 조합의 `&&`는 허용
- **허용 라이브러리 외 추가 금지** — 가이드 15.1 확정 스택 밖 라이브러리 임의 도입 금지

---

## 필수 명령어

```bash
pnpm install        # 의존성 설치
pnpm dev            # 개발 서버 (Turbopack)
pnpm build          # 프로덕션 빌드 검증
pnpm lint           # ESLint
pnpm test           # 테스트 (러너 도입 후)
```

> 아직 `package.json` 미생성 상태 — 최초 셋업은 **T1** (`.issues/T01-project-setup.md`). create-next-app 전에 `node_modules/next/dist/docs/`를 확인한다(AGENTS.md, 닭-달걀이라 next 설치가 선행).

---

## 참고 문서

- [AGENTS.md](AGENTS.md) — **이 Next.js는 다르다**: 코드 작성 전 `node_modules/next/dist/docs/` 정독, deprecation 준수
- [docs/church-frontend-guide.md](docs/church-frontend-guide.md) — 프론트 **동작·연동 가이드(0~15장)**: 인증·인가·에러·렌더·미디어·동시수정·약관·메인/부서 히어로·확정 스택
- [docs/api-docs.json](docs/api-docs.json) — 백엔드 **OpenAPI, 스키마 단일 진실**(경로·요청/응답 필드·상태코드)
- [.claude/rules/DESIGN.md](.claude/rules/DESIGN.md) — **디자인 시스템**: 토큰(색·타이포·간격·라운드)·컴포넌트 규칙
- [.issues/](.issues/) — 작업 태스크 **T1~T16** (의존순서·공통규칙·백엔드 확정값은 `.issues/00-INDEX.md`)

---

## 핵심 원칙 요약

- **데이터 패칭 경계** — 공개(메인·설교·공지·일정·부서·주보)=서버 컴포넌트 `fetch`+ISR / 회원·어드민(갤러리·내 정보)=클라이언트 TanStack Query + `authFetch`. TanStack Query는 회원 영역 전용 (가이드 15.1)
- **인증·인가** — STATELESS. `authFetch`가 401 `INVALID_TOKEN`만 refresh(동시요청 공유 프로미스 큐잉, access만 갱신). 게이팅은 **`permissions` 문자열 기준**(직분·roles 아님). 라이브 권한은 토큰 말고 `GET /api/members/me` (가이드 1·2장)
- **에러 처리** — 분기는 **`errorCode`로만**(status/title 금지), Toast 출력 (가이드 4장)
- **콘텐츠 렌더** — 본문은 raw 마크다운, 프론트가 `marked`+`DOMPurify`로 변환·새니타이즈. `media:{id}` → `/api/media/{id}` 치환 (가이드 5장)
- **날짜·시간** — 서버는 offset 없는 LocalDateTime → `parseServerDate`로 **`+09:00` 부착 후 파싱(KST 가정)**. 일정 캘린더는 라이브러리 없이 `date-fns`로 직접 구현 (가이드 15.3, 백엔드 A)
- **상태 관리** — 클라 상태=Zustand(토큰·member 스냅샷), 폼=react-hook-form+zod, 서버상태(회원)=TanStack Query
- **컴포넌트** — 시각(Button·Card·Badge·Input)=DESIGN.md 정의대로 **직접 구현** / 동작(Modal·Toast·Popover·Sheet 등)=**shadcn 재스킨**(15.1 목록만, 접근성 동작 보존)

---

## 워크플로우 (Superpowers + ECC)

- **새 기능 설계·구현** → Superpowers (브레인스톰 → 계획 → 실행)
- **코드 리뷰·보안 감사** → ECC (`typescript-reviewer`, `security-reviewer`, `code-reviewer`)
- **버그 수정** → Superpowers(원인 분석) + TDD 수정
- **테스트** → `superpowers:test-driven-development`로 RED→GREEN→REFACTOR 순서 강제. 커버리지 80%+ 목표(unit·통합·E2E). 각 도메인 페이지는 해당 이슈의 검수 기준(14A.7 / 14B.9 / 15.3 / 15.4)을 게이트로 사용
