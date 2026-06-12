import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptLeader } from "./DeptLeader";
import { DEPT_PAGE } from "@/constants/departments";

describe("DeptLeader", () => {
  it("'인도 · {이름}' 형태로 렌더한다", () => {
    render(<DeptLeader name="김목사" />);
    expect(screen.getByText(`${DEPT_PAGE.leaderLabel} · 김목사`)).toBeDefined();
  });
});
