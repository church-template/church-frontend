import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/vehicles/VehicleGate", () => ({
  VehicleGate: ({ children }: { children: React.ReactNode }) => <div data-testid="gate">{children}</div>,
}));
vi.mock("@/components/vehicles/VehicleRunList", () => ({
  VehicleRunList: () => <div>run-list</div>,
}));

import VehicleRunsPage, { metadata } from "./page";

describe("/vehicle-runs 페이지", () => {
  it("제목·게이트·목록을 렌더한다", () => {
    render(<VehicleRunsPage />);
    expect(screen.getByRole("heading", { name: "차량 탑승 신청" })).toBeDefined();
    expect(screen.getByTestId("gate")).toBeDefined();
    expect(screen.getByText("run-list")).toBeDefined();
  });

  it("metadata title 설정", () => {
    expect(metadata.title).toBe("차량 탑승 신청");
  });
});
