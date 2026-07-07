import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/challenges/ChallengeGate", () => ({
  ChallengeGate: ({ children }: { children: React.ReactNode }) => <div data-testid="gate">{children}</div>,
}));
vi.mock("@/components/challenges/ChallengeDetail", () => ({
  ChallengeDetail: ({ id }: { id: number }) => <div>DETAIL {id}</div>,
}));

import ChallengeDetailPage from "./page";

describe("ChallengeDetailPage", () => {
  it("게이트 안에서 id를 숫자로 넘겨 상세를 렌더", async () => {
    render(await ChallengeDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByTestId("gate")).toBeDefined();
    expect(screen.getByText("DETAIL 7")).toBeDefined();
  });
});
