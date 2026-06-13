# 인증 UI 리디자인 (스플릿 레이아웃 · 가입 위저드) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증 3화면을 풀스크린 스플릿(좌측 교회 사진 + 우측 폼)으로 바꾸고, 회원가입을 5단계 토스식 위저드로 재작성한다 — 기능·검증·플로우 로직은 무변경.

**Architecture:** `(auth)` 라우트 그룹 신설(URL 불변, SiteShell 미사용)에 `AuthSplitLayout`을 깐다. `AuthCard`는 배치 책임을 레이아웃에 넘기고 subtitle을 얻는다. SignupForm은 단일 RHF 폼 + `step` state + 스텝별 `trigger()` 위저드로 재작성하고, 서버 에러 시 해당 필드의 스텝으로 자동 복귀한다.

**Tech Stack:** 기존 그대로 — Next 16(App Router) · react-hook-form + zod · 기존 UI 컴포넌트(Input·Button·Checkbox·Card·TermsDialog) · vitest + RTL

**Spec:** `docs/superpowers/specs/2026-06-13-auth-ui-redesign-design.md`

**전제:**
- 브랜치 `20260610_#15_인증_UI_로그인_가입_재동의` 그대로 작업 (T14 기본 구현 위에 누적).
- 커밋 메시지 `<type>: <설명> #15`. **Co-Authored-By 절대 금지.**
- 테스트 컨벤션: `globals:false`(명시 import) · colocate · jest-dom 미사용 · zustand 실 스토어 · `next/navigation`은 `vi.hoisted` mock · `next/link`는 mock 불필요(기존 LoginForm.test가 무-mock으로 통과 중).
- 금지: hex/px 인라인(토큰 유틸; 단 `w-[45%]`·`max-h-[60vh]` 같은 레이아웃 비율/뷰포트 제약은 기존 허용 선례), UI 이모지, JSX `{cond && }`(삼항 사용), 허용 외 라이브러리.
- `<img>`는 기존 패턴(SermonCard 등): `eslint-disable-next-line @next/next/no-img-element` + WHY 주석.

---

## File Structure

```
신규:   src/app/(auth)/layout.tsx                    — AuthSplitLayout 마운트
        src/components/auth/AuthSplitLayout.tsx      — 풀스크린 스플릿 셸 (+test)
이동:   src/app/(site)/login/page.tsx                → src/app/(auth)/login/page.tsx (내용 무변경)
        src/app/(site)/signup/page.tsx               → src/app/(auth)/signup/page.tsx
        src/app/(site)/agreements/page.tsx           → src/app/(auth)/agreements/page.tsx
수정:   .claude/rules/DESIGN.md                      — auth-split·wizard-progress 항목
        src/components/auth/AuthCard.tsx (+test)     — Container 제거·subtitle 추가
        src/components/auth/LoginForm.tsx            — subtitle 전달 (1줄성)
        src/components/auth/AgreementsForm.tsx       — 인트로 p → subtitle 이관
재작성: src/components/auth/SignupForm.tsx (+test)   — 5스텝 위저드 (파일명 유지)
무변경: LoginForm 로직·AgreementsForm 로직·schemas·nextParam·authApi·agreementsApi·Checkbox·TermsDialog·dialog·Input·Button·Card
```

---

### Task 1: 스펙 문서 커밋 + DESIGN.md 항목 추가

**Files:**
- Modify: `.claude/rules/DESIGN.md` (### 연출 섹션 끝)
- Commit: `docs/superpowers/specs/2026-06-13-auth-ui-redesign-design.md` (이미 작성됨, 미커밋 상태)

- [ ] **Step 1: DESIGN.md `### 연출` 섹션 끝(`### 폼` 직전)에 항목 2개 추가**

`- **`dept-tree`**: ...` 항목 다음, `### 폼` 제목 앞에 정확히 아래 블록을 삽입:

```markdown
- **`auth-split`**: 인증(로그인·가입·재동의) 전용 풀스크린 스플릿. 좌측 ≈45% 사진 패널
  (`{colors.cover-dark}` 반투명 덮개 + on-dark 로고·슬로건, 콘텐츠는 church.ts 상수 주입) /
  우측 `{colors.surface-soft}` 폼 패널에 카드 중앙 배치. 모바일(<768px)은 사진 숨김·우측 단독.
  좌측 패널은 풀블리드 미디어 예외(라운드 없음). 헤더·푸터 미사용 — 좌상단 로고가 홈 링크.
- **`wizard-progress`**: 가입 위저드 단계 도트. 진행 단계까지 `{colors.primary}` 채움, 미진행
  `{colors.hairline}`, `{rounded.full}`. 장식 요소라 `aria-hidden` + sr-only 단계 텍스트 병행.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/DESIGN.md docs/superpowers/specs/2026-06-13-auth-ui-redesign-design.md
git commit -m "docs: 인증 리디자인 스펙·DESIGN.md auth-split/wizard-progress 항목 #15"
```

---

### Task 2: AuthSplitLayout (TDD)

**Files:**
- Create: `src/components/auth/AuthSplitLayout.tsx`
- Test: `src/components/auth/AuthSplitLayout.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/auth/AuthSplitLayout.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { CHURCH_NAME, HERO_CAPTION } from "@/constants/church";

describe("AuthSplitLayout", () => {
  it("로고(홈 링크)·슬로건을 상수로 렌더하고 children을 우측 패널에 담는다", () => {
    render(
      <AuthSplitLayout>
        <p>폼 영역</p>
      </AuthSplitLayout>,
    );
    // 로고는 데스크톱(사진 패널)·모바일(우측 상단) 두 곳 — 모두 홈 링크
    const logos = screen.getAllByRole("link", { name: CHURCH_NAME });
    expect(logos.length).toBe(2);
    expect(logos.every((l) => l.getAttribute("href") === "/")).toBe(true);
    for (const line of HERO_CAPTION) {
      expect(screen.getByText(line)).toBeDefined();
    }
    expect(screen.getByText("폼 영역")).toBeDefined();
  });

  it("사진 패널은 모바일에서 숨겨진다(hidden + md:flex)", () => {
    const { container } = render(
      <AuthSplitLayout>
        <p>폼</p>
      </AuthSplitLayout>,
    );
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("hidden");
    expect(aside?.className).toContain("md:flex");
  });

  it("모바일 로고는 데스크톱에서 숨겨진다(md:hidden)", () => {
    const { container } = render(
      <AuthSplitLayout>
        <p>폼</p>
      </AuthSplitLayout>,
    );
    const mobileLogo = container.querySelector("main a");
    expect(mobileLogo?.className).toContain("md:hidden");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/auth/AuthSplitLayout.test.tsx`
Expected: FAIL — `Cannot find module './AuthSplitLayout'`

- [ ] **Step 3: 구현**

```tsx
// src/components/auth/AuthSplitLayout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { CHURCH_NAME, HERO, HERO_CAPTION } from "@/constants/church";

// 히어로 미디어에서 정지 이미지 추출 — video면 poster, image면 src (둘 다 없으면 덮개만).
const posterSrc = HERO.type === "video" ? (HERO.poster ?? "") : HERO.src;

// 인증 전용 풀스크린 스플릿(DESIGN auth-split). 헤더·푸터 없음 — 좌상단 로고가 홈 링크.
// 좌측 사진 패널은 풀블리드 미디어 예외(라운드 없음), 텍스트는 on-dark 토큰만(구현 노트 3).
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* w-[45%]: 레이아웃 비율 — 대응 토큰 없는 분할 비라 arbitrary 허용(스펙 §3.2) */}
      <aside className="relative hidden w-[45%] flex-col justify-between p-xl md:flex">
        {posterSrc !== "" ? (
          // eslint-disable-next-line @next/next/no-img-element -- 장식 배경(alt 없음), next/image 최적화 불필요
          <img
            src={posterSrc}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-cover-dark/60" />
        <Link href="/" className={cn(typo.titleMd, "relative w-fit text-on-dark")}>
          {CHURCH_NAME}
        </Link>
        <div className="relative flex flex-col gap-xs">
          {HERO_CAPTION.map((line) => (
            <p key={line} className={cn(typo.titleLg, "text-on-dark")}>
              {line}
            </p>
          ))}
        </div>
      </aside>
      {/* 우측 폼 패널 — 모바일 단독 풀폭. 위저드 긴 스텝 대비 세로 스크롤 허용(스펙 §3.2) */}
      <main className="flex min-h-dvh flex-1 flex-col overflow-y-auto bg-surface-soft px-lg py-xl">
        <Link href="/" className={cn(typo.titleMd, "w-fit text-ink md:hidden")}>
          {CHURCH_NAME}
        </Link>
        <div className="flex flex-1 items-center justify-center py-lg">{children}</div>
      </main>
    </div>
  );
}
```

**주의 — `HERO.poster` 타입**: `HeroMedia`는 판별 유니온(`{type:"video"; src; poster?}` | `{type:"image"; src; alt?}`)이라 `HERO.poster` 직접 접근은 타입 에러다. 컴포넌트 상단(모듈 스코프)에 다음을 두고 `posterSrc`를 사용한다:

```tsx
// 히어로 미디어에서 정지 이미지 추출 — video면 poster, image면 src (둘 다 없으면 덮개만).
const posterSrc = HERO.type === "video" ? (HERO.poster ?? "") : HERO.src;
```

`<img src={posterSrc} …>`로 사용하고, `posterSrc`가 빈 문자열이면 img를 렌더하지 않는 삼항 처리: `{posterSrc !== "" ? <img … /> : null}`.

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/auth/AuthSplitLayout.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AuthSplitLayout.tsx src/components/auth/AuthSplitLayout.test.tsx
git commit -m "feat: AuthSplitLayout 풀스크린 스플릿 셸 #15"
```

---

### Task 3: AuthCard 개편 (Container 제거 · subtitle)

**Files:**
- Modify: `src/components/auth/AuthCard.tsx` (전체 교체)
- Modify: `src/components/auth/AuthCard.test.tsx` (전체 교체)

- [ ] **Step 1: 테스트 교체 (RED)**

```tsx
// src/components/auth/AuthCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthCard } from "./AuthCard";

describe("AuthCard", () => {
  it("h1 제목과 children을 렌더한다", () => {
    render(
      <AuthCard title="로그인">
        <p>내용</p>
      </AuthCard>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "로그인" })).toBeDefined();
    expect(screen.getByText("내용")).toBeDefined();
  });

  it("subtitle이 있으면 제목 아래 렌더한다", () => {
    render(
      <AuthCard title="로그인" subtitle="홈페이지에 로그인하세요">
        <p>내용</p>
      </AuthCard>,
    );
    expect(screen.getByText("홈페이지에 로그인하세요")).toBeDefined();
  });

  it("subtitle이 없으면 부제 단락을 렌더하지 않는다", () => {
    render(
      <AuthCard title="로그인">
        <p>내용</p>
      </AuthCard>,
    );
    expect(screen.queryByText("홈페이지에 로그인하세요")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/auth/AuthCard.test.tsx`
Expected: FAIL — subtitle 테스트 (AuthCard에 subtitle prop 없음 → 렌더 안 됨)

- [ ] **Step 3: 구현 교체**

```tsx
// src/components/auth/AuthCard.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Card } from "@/components/ui/Card";

// 인증 3페이지 공용 폼 카드 — 배치(중앙 정렬·여백)는 AuthSplitLayout 우측 패널이 책임진다.
// 폭은 모달 토큰(32rem) 재사용: max-w-md 등 t-shirt 유틸은 spacing 토큰과 충돌해 금지.
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card bordered className="w-full max-w-[var(--container-modal)] p-xl">
      <h1 className={cn(typo.displaySm, "text-ink")}>{title}</h1>
      {subtitle ? <p className={cn(typo.bodySm, "mt-xxs text-muted")}>{subtitle}</p> : null}
      <div className="mt-lg">{children}</div>
    </Card>
  );
}
```

- [ ] **Step 4: 통과 + 소비자 회귀 확인**

Run: `pnpm test src/components/auth/`
Expected: AuthCard 3개 + LoginForm·SignupForm·AgreementsForm·TermsDialog·AuthSplitLayout·schemas 기존 테스트 전부 PASS (Container 제거는 배치만 바꿔 동작 단언에 영향 없음)

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AuthCard.tsx src/components/auth/AuthCard.test.tsx
git commit -m "refactor: AuthCard 배치 책임 분리·subtitle 추가 #15"
```

---

### Task 4: (auth) 라우트 그룹 — 페이지 이동 + 레이아웃 + 빌드 검증

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Move: `src/app/(site)/{login,signup,agreements}/page.tsx` → `src/app/(auth)/…` (내용 무변경)

- [ ] **Step 1: 레이아웃 작성**

```tsx
// src/app/(auth)/layout.tsx
import type { ReactNode } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

// 인증 전용 셸 — SiteShell(헤더·푸터) 대신 풀스크린 스플릿(스펙 §3.1). route group이라 URL 불변.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthSplitLayout>{children}</AuthSplitLayout>;
}
```

- [ ] **Step 2: 페이지 3개 이동 (내용 무변경)**

```bash
mkdir -p "src/app/(auth)"
git mv "src/app/(site)/login" "src/app/(auth)/login"
git mv "src/app/(site)/signup" "src/app/(auth)/signup"
git mv "src/app/(site)/agreements" "src/app/(auth)/agreements"
```

- [ ] **Step 3: 빌드 검증**

Run: `pnpm build`
Expected: 성공. 라우트 목록에 `/login` `/signup` `/agreements` 여전히 존재(○ Static). route group 충돌 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)" "src/app/(site)"
git commit -m "feat: (auth) 라우트 그룹 — 인증 3페이지 스플릿 셸 적용 #15"
```

---

### Task 5: LoginForm·AgreementsForm subtitle 적용

**Files:**
- Modify: `src/components/auth/LoginForm.tsx` (AuthCard 호출부 + import 1줄)
- Modify: `src/components/auth/AgreementsForm.tsx` (AuthCard 호출부, 인트로 p 제거)

- [ ] **Step 1: LoginForm — import에 CHURCH_NAME 추가, AuthCard 호출 변경**

import 블록에 추가:

```tsx
import { CHURCH_NAME } from "@/constants/church";
```

`<AuthCard title="로그인">` →

```tsx
    <AuthCard title="로그인" subtitle={`${CHURCH_NAME} 홈페이지에 로그인하세요`}>
```

- [ ] **Step 2: AgreementsForm — 인트로 단락을 subtitle로 이관**

`<AuthCard title="약관 동의">` →

```tsx
    <AuthCard title="약관 동의" subtitle="서비스 이용을 위해 두 약관 모두 동의해야 계속할 수 있습니다.">
```

그리고 바로 아래의 기존 인트로 단락 전체를 삭제:

```tsx
      <p className={cn(typo.bodySm, "text-body")}>
        서비스 이용을 위해 약관 동의가 필요합니다. 두 항목 모두 동의해야 계속할 수 있습니다.
      </p>
```

(삭제 후 `cn`·`typo` import가 다른 곳에서 안 쓰이면 제거 — isPending/isError 단락에서 쓰므로 실제로는 유지될 것)

- [ ] **Step 3: 회귀 확인**

Run: `pnpm test src/components/auth/LoginForm.test.tsx src/components/auth/AgreementsForm.test.tsx`
Expected: 전부 PASS (기존 테스트는 해당 문구를 단언하지 않음)

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/LoginForm.tsx src/components/auth/AgreementsForm.tsx
git commit -m "feat: 로그인·재동의 카드에 subtitle 적용 #15"
```

---

### Task 6: SignupForm 위저드 재작성 (TDD)

**Files:**
- Modify: `src/components/auth/SignupForm.tsx` (전체 교체)
- Modify: `src/components/auth/SignupForm.test.tsx` (전체 교체)

- [ ] **Step 1: 테스트 전체 교체 (RED)**

```tsx
// src/components/auth/SignupForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { loginMock, signupMock, replace, spRef } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  signupMock: vi.fn(),
  replace: vi.fn(),
  spRef: { current: new URLSearchParams() },
}));
vi.mock("@/lib/auth/authApi", () => ({ login: loginMock, signup: signupMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => spRef.current,
}));

import { SignupForm } from "./SignupForm";
import { ApiError } from "@/lib/auth/apiError";
import { useAuthStore } from "@/lib/auth/authStore";

const signupRes = { uuid: "u1", name: "홍길동", phone: "01012345678", roles: ["USER"] };
const loginRes = {
  tokens: { accessToken: "a1", refreshToken: "r1" },
  member: { uuid: "u1", name: "홍길동", phone: "01012345678", position: "성도", roles: ["USER"] },
  requiresAgreement: false,
};

const next = () => fireEvent.click(screen.getByRole("button", { name: "다음" }));
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

// 1~4스텝을 통과해 약관 스텝까지 진행(이메일은 빈 값으로 통과 — 선택 입력)
async function completeToTerms() {
  fill("전화번호", "010-1234-5678");
  next();
  await screen.findByLabelText("이름");
  fill("이름", "홍길동");
  next();
  await screen.findByLabelText("비밀번호");
  fill("비밀번호", "password1");
  fill("비밀번호 확인", "password1");
  next();
  await screen.findByLabelText("이메일 (선택)");
  next();
  await screen.findByLabelText("이용약관 동의 (필수)");
}
const submitSignup = () => fireEvent.click(screen.getByRole("button", { name: "가입하기" }));

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
  spRef.current = new URLSearchParams();
});
afterEach(() => vi.clearAllMocks());

describe("SignupForm (위저드)", () => {
  it("첫 스텝은 전화번호 질문만 보인다", () => {
    render(<SignupForm />);
    expect(screen.getByRole("heading", { name: "전화번호를 알려주세요" })).toBeDefined();
    expect(screen.getByLabelText("전화번호")).toBeDefined();
    expect(screen.queryByLabelText("이름")).toBeNull();
    expect(screen.queryByLabelText("비밀번호")).toBeNull();
  });

  it("검증 실패 시 다음 스텝으로 진행하지 않는다", async () => {
    render(<SignupForm />);
    fill("전화번호", "123");
    next();
    await waitFor(() =>
      expect(screen.getByText("전화번호 자릿수를 확인해 주세요.")).toBeDefined(),
    );
    expect(screen.queryByLabelText("이름")).toBeNull();
    expect(signupMock).not.toHaveBeenCalled();
  });

  it("이전 버튼으로 돌아가도 입력값이 보존된다", async () => {
    render(<SignupForm />);
    fill("전화번호", "010-1234-5678");
    next();
    await screen.findByLabelText("이름");
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    const phone = (await screen.findByLabelText("전화번호")) as HTMLInputElement;
    expect(phone.value).toBe("010-1234-5678");
  });

  it("이메일 스텝의 건너뛰기는 이메일 없이 약관 스텝으로 간다", async () => {
    render(<SignupForm />);
    fill("전화번호", "010-1234-5678");
    next();
    await screen.findByLabelText("이름");
    fill("이름", "홍길동");
    next();
    await screen.findByLabelText("비밀번호");
    fill("비밀번호", "password1");
    fill("비밀번호 확인", "password1");
    next();
    await screen.findByLabelText("이메일 (선택)");
    fill("이메일 (선택)", "잘못된값"); // 건너뛰기는 입력을 비우고 진행해야 함
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    await screen.findByLabelText("이용약관 동의 (필수)");
  });

  it("검수2: 약관 미동의 시 제출이 차단된다(signup 미호출)", async () => {
    render(<SignupForm />);
    await completeToTerms();
    submitSignup();
    await waitFor(() => expect(screen.getByText("이용약관에 동의해 주세요.")).toBeDefined());
    expect(screen.getByText("개인정보처리방침에 동의해 주세요.")).toBeDefined();
    expect(signupMock).not.toHaveBeenCalled();
  });

  it("검수3: 가입 성공(201, 토큰 없음) 후 같은 자격으로 자동 로그인한다", async () => {
    signupMock.mockResolvedValue(signupRes);
    loginMock.mockResolvedValue(loginRes);
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("010-1234-5678", "password1"));
    expect(signupMock).toHaveBeenCalledWith({
      name: "홍길동",
      phone: "010-1234-5678",
      password: "password1",
      email: undefined, // 빈 문자열은 undefined로 변환
      termsAgreed: true,
      privacyAgreed: true,
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("자동 로그인 후 next 내부 경로로 복귀한다", async () => {
    spRef.current = new URLSearchParams("next=/gallery");
    signupMock.mockResolvedValue(signupRes);
    loginMock.mockResolvedValue(loginRes);
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/gallery"));
  });

  it("자동 로그인 실패 시 /login으로 폴백한다", async () => {
    signupMock.mockResolvedValue(signupRes);
    loginMock.mockRejectedValue(new ApiError(401, "AUTHENTICATION_FAILED", undefined));
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("phone 중복(409)은 전화번호 스텝으로 복귀해 필드 에러를 보여준다", async () => {
    signupMock.mockRejectedValue(new ApiError(409, "DUPLICATE_RESOURCE", "이미 존재"));
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(screen.getByText("이미 가입된 전화번호입니다.")).toBeDefined());
    // 스텝 복귀: 전화번호 입력이 다시 보이고 값 보존
    expect((screen.getByLabelText("전화번호") as HTMLInputElement).value).toBe("010-1234-5678");
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("서버 errors[]는 해당 필드 스텝으로 복귀해 매핑된다(400)", async () => {
    signupMock.mockRejectedValue(
      new ApiError(400, "INVALID_INPUT_VALUE", "입력값 오류", undefined, undefined, [
        { field: "password", reason: "비밀번호 형식이 올바르지 않습니다" },
      ]),
    );
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() =>
      expect(screen.getByText("비밀번호 형식이 올바르지 않습니다")).toBeDefined(),
    );
    expect(screen.getByLabelText("비밀번호")).toBeDefined(); // step 2 복귀
  });

  it("이미 로그인 상태면 홈으로 보낸다(역가드)", () => {
    useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: loginRes.member });
    render(<SignupForm />);
    expect(replace).toHaveBeenCalledWith("/");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/auth/SignupForm.test.tsx`
Expected: FAIL — 기존 SignupForm은 위저드가 아니라 "다음" 버튼·스텝 질문이 없음

- [ ] **Step 3: 구현 전체 교체**

```tsx
// src/components/auth/SignupForm.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { login, signup } from "@/lib/auth/authApi";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { useAuthStore } from "@/lib/auth/authStore";
import { afterLoginDestination, sanitizeNext } from "@/lib/auth/nextParam";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/constants/terms";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "./AuthCard";
import { TermsDialog } from "./TermsDialog";
import { signupSchema, type SignupFormValues } from "./schemas";

// 위저드 스텝 — 한 화면 = 한 질문(스펙 §5.1). fields는 "다음" 시 trigger 검증 대상.
const STEPS: { question: string; fields: FieldPath<SignupFormValues>[] }[] = [
  { question: "전화번호를 알려주세요", fields: ["phone"] },
  { question: "이름을 알려주세요", fields: ["name"] },
  { question: "비밀번호를 만들어주세요", fields: ["password", "passwordConfirm"] },
  { question: "이메일이 있으신가요? (선택)", fields: ["email"] },
  { question: "약관에 동의해주세요", fields: ["termsAgreed", "privacyAgreed"] },
];

// 서버 errors[].field 화이트리스트 + 필드가 속한 스텝(서버 에러 시 해당 스텝으로 복귀 — 스펙 §5.2).
// passwordConfirm은 클라 전용이라 서버가 모름.
const FIELD_STEP = {
  phone: 0,
  name: 1,
  password: 2,
  email: 3,
  termsAgreed: 4,
  privacyAgreed: 4,
} as const;
type SignupField = keyof typeof FIELD_STEP;
function isSignupField(field: string): field is SignupField {
  return field in FIELD_STEP;
}

export function SignupForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [step, setStep] = useState(0);

  // 역가드: 마운트 1회만 — 가입 자동 로그인 직후 member 변화로 next를 잃지 않도록(스펙 4.4).
  useEffect(() => {
    if (useAuthStore.getState().member) router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    setFocus,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
      passwordConfirm: "",
      email: "",
      termsAgreed: false,
      privacyAgreed: false,
    },
  });

  // 스텝 전환 시 첫 입력으로 포커스(키보드·스크린리더 흐름). 체크박스 스텝은 질문 낭독 우선이라 제외.
  useEffect(() => {
    const first = STEPS[step].fields[0];
    if (first === "termsAgreed") return;
    setFocus(first);
  }, [step, setFocus]);

  // 서버 에러를 필드에 매핑하고 가장 이른 에러 스텝으로 복귀(스펙 §5.2).
  const applyServerFieldErrors = (fields: { field: SignupField; message: string }[]) => {
    let earliest = STEPS.length - 1;
    for (const f of fields) {
      setError(f.field, { message: f.message });
      earliest = Math.min(earliest, FIELD_STEP[f.field]);
    }
    setStep(earliest);
  };

  const submitAll = handleSubmit(async (values) => {
    try {
      await signup({
        name: values.name,
        phone: values.phone, // 하이픈 포함 그대로 — 서버가 정규화(가이드 11장)
        password: values.password,
        email: values.email === "" ? undefined : values.email,
        termsAgreed: values.termsAgreed,
        privacyAgreed: values.privacyAgreed,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        handleApiError(e, {
          onFieldErrors: (fieldErrors) => {
            const known: { field: SignupField; message: string }[] = [];
            for (const fe of fieldErrors) {
              if (isSignupField(fe.field)) known.push({ field: fe.field, message: fe.reason });
              else notify.error(fe.reason);
            }
            if (known.length > 0) applyServerFieldErrors(known);
          },
          onDuplicate: () =>
            applyServerFieldErrors([{ field: "phone", message: "이미 가입된 전화번호입니다." }]),
        });
      } else {
        notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
      return;
    }

    // 가입 201(토큰 없음) → 같은 자격으로 자동 로그인(스펙 4.2). 실패해도 가입은 유효 — 로그인 폴백.
    try {
      const res = await login(values.phone, values.password);
      notify.success("가입을 환영합니다.");
      router.replace(afterLoginDestination(res.requiresAgreement, next));
    } catch {
      notify.error("가입은 완료되었습니다. 로그인해 주세요.");
      router.replace(next ? `/login?next=${encodeURIComponent(sanitizeNext(next))}` : "/login");
    }
  });

  const isLast = step === STEPS.length - 1;

  // Enter·다음 버튼 공용: 마지막 스텝 전엔 현재 스텝만 검증 후 진행(스펙 §5.1).
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isLast) {
      void submitAll(e);
      return;
    }
    e.preventDefault();
    const current = step;
    void trigger(STEPS[current].fields).then((ok) => {
      // 더블클릭으로 trigger가 두 번 resolve돼도 한 스텝만 진행(고령 사용자 더블클릭 방어)
      if (ok) setStep((s) => (s === current ? s + 1 : s));
    });
  };

  // 건너뛰기: 잘못 입력하다 만 이메일이 최종 제출을 막지 않도록 비우고 진행.
  const skipEmail = () => {
    setValue("email", "");
    setStep((s) => s + 1);
  };

  return (
    <AuthCard title="회원가입">
      {/* 진행 도트(DESIGN wizard-progress) — 장식이라 aria-hidden, 단계는 sr-only로 제공(스펙 §5.3) */}
      <div className="flex items-center gap-xs" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s.question}
            className={cn("h-1.5 w-6 rounded-full", i <= step ? "bg-primary" : "bg-hairline")}
          />
        ))}
      </div>
      <p className="sr-only" role="status">
        {STEPS.length}단계 중 {step + 1}단계
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-lg flex flex-col gap-md">
        <h2 className={cn(typo.titleLg, "text-ink")}>{STEPS[step].question}</h2>

        {step === 0 ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="signup-phone" className={cn(typo.bodySm, "text-ink")}>
              전화번호
            </label>
            <Input
              id="signup-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="010-1234-5678"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="signup-name" className={cn(typo.bodySm, "text-ink")}>
              이름
            </label>
            <Input
              id="signup-name"
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <div className="flex flex-col gap-xxs">
              <label htmlFor="signup-password" className={cn(typo.bodySm, "text-ink")}>
                비밀번호
              </label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                error={errors.password?.message}
                {...register("password")}
              />
            </div>
            <div className="flex flex-col gap-xxs">
              <label htmlFor="signup-password-confirm" className={cn(typo.bodySm, "text-ink")}>
                비밀번호 확인
              </label>
              <Input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                error={errors.passwordConfirm?.message}
                {...register("passwordConfirm")}
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="signup-email" className={cn(typo.bodySm, "text-ink")}>
              이메일 (선택)
            </label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-xs">
            <div className="flex items-start justify-between gap-sm">
              <Checkbox
                label="이용약관 동의 (필수)"
                error={errors.termsAgreed?.message}
                {...register("termsAgreed")}
              />
              <TermsDialog doc={TERMS_OF_SERVICE} />
            </div>
            <div className="flex items-start justify-between gap-sm">
              <Checkbox
                label="개인정보처리방침 동의 (필수)"
                error={errors.privacyAgreed?.message}
                {...register("privacyAgreed")}
              />
              <TermsDialog doc={PRIVACY_POLICY} />
            </div>
          </div>
        ) : null}

        <Button type="submit" loading={isSubmitting}>
          {isLast ? "가입하기" : "다음"}
        </Button>
        {step === 3 ? (
          <Button variant="tertiary" type="button" onClick={skipEmail}>
            건너뛰기
          </Button>
        ) : null}
        {step > 0 ? (
          <Button variant="tertiary" type="button" onClick={() => setStep((s) => s - 1)}>
            이전
          </Button>
        ) : null}
      </form>

      <p className={cn(typo.bodySm, "mt-lg text-body")}>
        이미 계정이 있으신가요?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(sanitizeNext(next))}` : "/login"}
          className="text-primary hover:text-primary-active"
        >
          로그인
        </Link>
      </p>
    </AuthCard>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/auth/SignupForm.test.tsx`
Expected: PASS (11 tests)

- [ ] **Step 5: lint·tsc 확인**

Run: `pnpm lint && npx tsc --noEmit`
Expected: 에러·경고 0

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/SignupForm.tsx src/components/auth/SignupForm.test.tsx
git commit -m "feat: 회원가입 5단계 위저드(스텝 검증·서버 에러 스텝 복귀) #15"
```

---

### Task 7: 통합 검증 게이트

**Files:** 없음 (검증만; 실패 시 수정 후 `fix:` 커밋)

- [ ] **Step 1: 전체 테스트** — Run: `pnpm test` / Expected: 전부 PASS
- [ ] **Step 2: 린트** — Run: `pnpm lint` / Expected: 0 errors, 0 warnings
- [ ] **Step 3: 타입체크** — Run: `npx tsc --noEmit` / Expected: 에러 0
- [ ] **Step 4: 프로덕션 빌드** — Run: `pnpm build` / Expected: 성공, `/login` `/signup` `/agreements` 라우트 존재
- [ ] **Step 5: 스펙 §6 매핑 확인**

| 검증 항목 | 커버 |
|---|---|
| 스텝 진행·차단·값 보존·건너뛰기 | SignupForm.test (위저드 4케이스) |
| 검수2 약관 차단 / 검수3 자동 로그인·페이로드 | SignupForm.test |
| 409→step0·errors[]→스텝 복귀 | SignupForm.test |
| 로고·캡션 상수·모바일 숨김 | AuthSplitLayout.test |
| subtitle | AuthCard.test |
| 로그인·재동의 무수정 통과(회귀 신호) | 기존 LoginForm·AgreementsForm.test |

---

## 범위 외 (이 계획에서 하지 않는 것)

- 비밀번호 찾기(백엔드 API 없음), 마이페이지(T15), 갤러리(T16)
- LoginForm·AgreementsForm 내부 로직 변경
- schemas·nextParam·authApi·agreementsApi·Checkbox·TermsDialog 수정
