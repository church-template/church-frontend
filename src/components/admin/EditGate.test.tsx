import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditAccessDenied } from "./EditGate";

describe("EditAccessDenied", () => {
  it("권한 안내 문구를 보인다", () => {
    render(<EditAccessDenied />);
    expect(screen.getByText("이 페이지를 열 권한이 없습니다.")).toBeDefined();
  });
});
