// src/components/auth/AuthCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthCard } from "./AuthCard";

describe("AuthCard", () => {
  it("h1 제목과 children을 렌더한다", () => {
    render(
      <AuthCard title="로그인">
        <p>내용</p>
      </AuthCard>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "로그인" })).toBeDefined();
    expect(screen.getByText("내용")).toBeDefined();
  });

  it("subtitle이 있으면 제목 아래 렌더한다", () => {
    render(
      <AuthCard title="로그인" subtitle="홈페이지에 로그인하세요">
        <p>내용</p>
      </AuthCard>,
    );
    expect(screen.getByText("홈페이지에 로그인하세요")).toBeDefined();
  });

  it("subtitle이 없으면 부제 단락을 렌더하지 않는다", () => {
    render(
      <AuthCard title="로그인">
        <p>내용</p>
      </AuthCard>,
    );
    expect(screen.queryByText("홈페이지에 로그인하세요")).toBeNull();
  });
});
