// src/app/(site)/sermons/[id]/edit/page.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
// 셸 테스트 — 게이트·권한·시드 동작은 MemberGate.test·SermonForm.test가 커버, 여기선 id 검증·배선만 확인.
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/admin/RequirePermission", () => ({
  RequirePermission: ({ permission, children }: { permission: string; children: ReactNode }) => (
    <div data-testid="require" data-permission={permission}>{children}</div>
  ),
}));
vi.mock("@/components/admin/EditGate", () => ({
  EditAccessDenied: () => <div data-testid="access-denied" />,
}));
vi.mock("@/components/sermons/SermonEditLoader", () => ({
  SermonEditLoader: ({ id }: { id: number }) => <div data-testid="edit-loader" data-id={id} />,
}));

import SermonEditPage from "./page";

afterEach(() => vi.clearAllMocks());

describe("SermonEditPage (셸)", () => {
  it("유효한 id면 SERMON_VIEW 게이트 + SERMON_WRITE 권한 안의 시드 로더를 렌더한다", async () => {
    render(await SermonEditPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByTestId("gate").getAttribute("data-permission")).toBe("SERMON_VIEW");
    expect(screen.getByTestId("require").getAttribute("data-permission")).toBe("SERMON_WRITE");
    expect(screen.getByTestId("edit-loader").getAttribute("data-id")).toBe("7");
  });

  it("비숫자 id면 notFound", async () => {
    await expect(
      SermonEditPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("id가 0·음수면 notFound", async () => {
    await expect(
      SermonEditPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      SermonEditPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
