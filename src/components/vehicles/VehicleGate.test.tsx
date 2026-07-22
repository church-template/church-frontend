import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/vehicle-runs" }));

import { VehicleGate } from "./VehicleGate";
import { useAuthStore } from "@/lib/auth/authStore";

const Child = () => <div>VEHICLE CONTENT</div>;

beforeEach(() => {
  useMeMock.mockReset();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
});

describe("VehicleGate", () => {
  it("비로그인이면 로그인 안내 + children 차단", async () => {
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("VEHICLE CONTENT")).toBeNull();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fvehicle-runs");
  });

  it("로그인+로딩이면 스켈레톤", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    await waitFor(() => expect(screen.queryByText("VEHICLE CONTENT")).toBeNull());
    expect(screen.getByTestId("vehicle-skeleton")).toBeDefined();
  });

  it("권한 없으면 교인 승인 안내 + 차단", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: [] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("VEHICLE CONTENT")).toBeNull();
  });

  it("VEHICLE_APPLY 보유면 children 렌더", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: ["VEHICLE_APPLY"] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    expect(await screen.findByText("VEHICLE CONTENT")).toBeDefined();
  });
});
