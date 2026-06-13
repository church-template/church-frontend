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

  it("사진 패널(좌측)은 모바일에서 숨겨진다(hidden + md:flex)", () => {
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

  it("풀블리드 사진 레이어는 별도 레이어로 분리되고(데스크톱 전용) 정착 사진을 담는다", () => {
    const { container } = render(
      <AuthSplitLayout>
        <p>폼</p>
      </AuthSplitLayout>,
    );
    // 클립 연출 훅: 사진은 aside 밖 풀블리드 레이어에 위치(viewport 전체 → 좌측 절반으로 수축)
    const media = container.querySelector(".auth-hero-media");
    expect(media).not.toBeNull();
    expect(media?.className).toContain("hidden");
    expect(media?.className).toContain("md:block");
    expect(media?.querySelector("img")).not.toBeNull();
    // 사진은 aside 안에 있지 않다(연출을 위해 풀블리드로 이동)
    expect(container.querySelector("aside img")).toBeNull();
  });

  it("폼 카드 래퍼에 페이드인 훅(auth-hero-form)이 있고 children을 감싼다", () => {
    render(
      <AuthSplitLayout>
        <p>폼 카드</p>
      </AuthSplitLayout>,
    );
    expect(screen.getByText("폼 카드").closest(".auth-hero-form")).not.toBeNull();
  });

  it("배경(surface-soft)은 root가 담당한다 — 갈라지는 사진이 비치도록 폼 패널은 투명", () => {
    const { container } = render(
      <AuthSplitLayout>
        <p>폼</p>
      </AuthSplitLayout>,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("bg-surface-soft");
    expect(container.querySelector("main")?.className ?? "").not.toContain("bg-surface-soft");
  });
});
