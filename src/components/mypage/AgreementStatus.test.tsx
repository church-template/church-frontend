import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { AgreementStatus } from "./AgreementStatus";

const base = {
  uuid: "u1", name: "홍길동", phone: "01012345678", email: "", position: "집사",
  roles: ["MEMBER"], permissions: [], maxPriority: 0,
  termsAgreed: true, privacyAgreed: true, agreedAt: "2026-01-01T00:00:00",
};

describe("AgreementStatus", () => {
  it("둘 다 동의 + agreedAt 있으면 완료와 날짜를 표시", () => {
    render(<AgreementStatus me={base} />);
    expect(screen.getByText(/약관 동의 · 완료/)).toBeDefined();
    expect(screen.getByText(/2026/)).toBeDefined();
  });

  it("agreedAt null이어도 완료 텍스트만, 깨지지 않는다", () => {
    render(<AgreementStatus me={{ ...base, agreedAt: null }} />);
    expect(screen.getByText("약관 동의 · 완료")).toBeDefined();
  });

  it("미동의면 /agreements?next=/mypage 재동의 링크를 보인다", () => {
    render(<AgreementStatus me={{ ...base, termsAgreed: false, agreedAt: null }} />);
    const link = screen.getByRole("link", { name: /재동의하기/ });
    expect(link.getAttribute("href")).toBe("/agreements?next=/mypage");
  });
});
