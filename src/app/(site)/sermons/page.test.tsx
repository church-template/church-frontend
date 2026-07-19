// src/app/(site)/sermons/page.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// 셸 테스트 — 게이트·목록 동작은 MemberGate.test·SermonList.test가 커버, 여기선 배선만 확인.
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/sermons/SermonList", () => ({ SermonList: () => <div data-testid="list" /> }));
vi.mock("@/components/sermons/SermonAdminActions", () => ({ SermonListAction: () => null }));

import SermonsPage from "./page";

describe("SermonsPage (셸)", () => {
  it("제목과 SERMON_VIEW 게이트 안의 목록을 렌더한다", () => {
    render(<SermonsPage />);
    expect(screen.getByRole("heading", { name: "설교" })).toBeDefined();
    const gate = screen.getByTestId("gate");
    expect(gate.getAttribute("data-permission")).toBe("SERMON_VIEW");
    expect(gate.getAttribute("data-domain")).toBe("설교");
    expect(screen.getByTestId("list")).toBeDefined();
  });
});
