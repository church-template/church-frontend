import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/gallery" }));

import { GalleryGate } from "./GalleryGate";
import { useAuthStore } from "@/lib/auth/authStore";

const Child = () => <div>GALLERY CONTENT</div>;

beforeEach(() => {
  useMeMock.mockReset();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
});

describe("GalleryGate", () => {
  it("비로그인이면 isPending이어도 로그인 안내를 보이고 children을 막는다", async () => {
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<GalleryGate><Child /></GalleryGate>);
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("GALLERY CONTENT")).toBeNull();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fgallery");
  });

  it("로그인+로딩이면 children도 안내도 없다(스켈레톤)", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<GalleryGate><Child /></GalleryGate>);
    await waitFor(() => expect(screen.queryByText("GALLERY CONTENT")).toBeNull());
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
    expect(screen.queryByText("교인 승인 후 이용 가능합니다")).toBeNull();
    expect(screen.getByTestId("gallery-skeleton")).toBeDefined();
  });

  it("에러면 다시 시도 안내", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() });
    render(<GalleryGate><Child /></GalleryGate>);
    expect(await screen.findByText("정보를 불러오지 못했습니다")).toBeDefined();
  });

  it("권한 없으면 교인 승인 안내, children 차단", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: [] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<GalleryGate><Child /></GalleryGate>);
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("GALLERY CONTENT")).toBeNull();
  });

  it("GALLERY_VIEW 보유면 children 렌더", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: ["GALLERY_VIEW"] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<GalleryGate><Child /></GalleryGate>);
    expect(await screen.findByText("GALLERY CONTENT")).toBeDefined();
  });
});
