import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptInvite } from "./DeptInvite";

afterEach(() => vi.unstubAllGlobals());

describe("DeptInvite", () => {
  it("초대 헤딩과 본문을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(
      <DeptInvite
        heading="학생부에서 함께해요"
        body="언제든 편안하게 참여하세요."
      />
    );
    expect(
      screen.getByRole("heading", { name: "학생부에서 함께해요" })
    ).toBeDefined();
    expect(
      screen.getByText("언제든 편안하게 참여하세요.")
    ).toBeDefined();
  });
});
