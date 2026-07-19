import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/gallery" }));

import { MemberGate } from "./MemberGate";
import { useAuthStore } from "@/lib/auth/authStore";

const Child = () => <div>MEMBER CONTENT</div>;

function renderGate(props: Partial<{ permission: string; domainLabel: string; skeleton: ReactNode }> = {}) {
  return render(
    <MemberGate
      permission={props.permission ?? "GALLERY_VIEW"}
      domainLabel={props.domainLabel ?? "갤러리"}
      skeleton={props.skeleton}
    >
      <Child />
    </MemberGate>,
  );
}

beforeEach(() => {
  useMeMock.mockReset();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
});

describe("MemberGate", () => {
  it("비로그인이면 isPending이어도 로그인 안내를 보이고 children을 막는다", async () => {
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    renderGate();
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("갤러리는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
    expect(screen.queryByText("MEMBER CONTENT")).toBeNull();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fgallery");
  });

  it("로그인+로딩이면 children도 안내도 없다(기본 스켈레톤)", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    renderGate();
    await waitFor(() => expect(screen.queryByText("MEMBER CONTENT")).toBeNull());
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
    expect(screen.queryByText("교인 승인 후 이용 가능합니다")).toBeNull();
    expect(screen.getByTestId("member-gate-skeleton")).toBeDefined();
  });

  it("커스텀 스켈레톤을 주면 기본 대신 그것을 렌더한다", () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    renderGate({ skeleton: <p>CUSTOM SKELETON</p> });
    expect(screen.getByText("CUSTOM SKELETON")).toBeDefined();
    expect(screen.queryByTestId("member-gate-skeleton")).toBeNull();
  });

  it("에러면 다시 시도 안내", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() });
    renderGate();
    expect(await screen.findByText("정보를 불러오지 못했습니다")).toBeDefined();
  });

  it("권한 없으면 도메인 라벨이 든 교인 승인 안내, children 차단", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: [] }, isPending: false, isError: false, refetch: vi.fn() });
    renderGate({ permission: "SERMON_VIEW", domainLabel: "설교" });
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("설교 열람은 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요.")).toBeDefined();
    expect(screen.queryByText("MEMBER CONTENT")).toBeNull();
  });

  it("지정 권한 보유면 children 렌더", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: ["SERMON_VIEW"] }, isPending: false, isError: false, refetch: vi.fn() });
    renderGate({ permission: "SERMON_VIEW", domainLabel: "설교" });
    expect(await screen.findByText("MEMBER CONTENT")).toBeDefined();
  });
});
