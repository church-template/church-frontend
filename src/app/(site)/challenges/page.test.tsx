import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/challenges/ChallengeGate", () => ({
  ChallengeGate: ({ children }: { children: React.ReactNode }) => <div data-testid="gate">{children}</div>,
}));
vi.mock("@/components/challenges/ChallengeList", () => ({ ChallengeList: () => <div>LIST</div> }));

import ChallengesPage from "./page";

describe("ChallengesPage", () => {
  it("제목 + 게이트 안 목록", () => {
    render(<ChallengesPage />);
    expect(screen.getByRole("heading", { name: "성경통독 챌린지" })).toBeDefined();
    expect(screen.getByTestId("gate")).toBeDefined();
    expect(screen.getByText("LIST")).toBeDefined();
  });
});
