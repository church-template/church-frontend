// src/app/(site)/sermons/[id]/page.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 셸 테스트 — 게이트·상세 동작은 MemberGate.test·SermonDetail.test가 커버, 여기선 id 검증·배선만 확인.
vi.mock("@/components/common/MemberGate", () => ({
  MemberGate: ({ permission, domainLabel, children }: { permission: string; domainLabel: string; children: ReactNode }) => (
    <div data-testid="gate" data-permission={permission} data-domain={domainLabel}>{children}</div>
  ),
}));
vi.mock("@/components/sermons/SermonDetail", () => ({
  SermonDetail: ({ id }: { id: number }) => <div data-testid="detail" data-id={id} />,
}));

import SermonDetailPage from "./page";

afterEach(() => vi.clearAllMocks());

describe("SermonDetailPage (셸)", () => {
  it("유효한 id면 뒤로가기 링크와 SERMON_VIEW 게이트 안의 상세를 렌더한다", async () => {
    render(await SermonDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByRole("link", { name: /설교 목록/ }).getAttribute("href")).toBe("/sermons");
    const gate = screen.getByTestId("gate");
    expect(gate.getAttribute("data-permission")).toBe("SERMON_VIEW");
    expect(gate.getAttribute("data-domain")).toBe("설교");
    expect(screen.getByTestId("detail").getAttribute("data-id")).toBe("7");
  });

  it("비숫자 id면 notFound", async () => {
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("id가 0·음수면 notFound", async () => {
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
