import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("전달한 메시지를 표시한다", () => {
    render(<EmptyState message="등록된 설교가 없습니다" />);
    expect(screen.getByText("등록된 설교가 없습니다")).toBeDefined();
  });
});
