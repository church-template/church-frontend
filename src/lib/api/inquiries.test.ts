import { describe, it, expect, vi, afterEach } from "vitest";
import { createInquiry } from "./inquiries";
import { ApiError } from "@/lib/auth/apiError";

afterEach(() => vi.restoreAllMocks());

const body = {
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  content: "예배 시간이 궁금합니다.",
  privacyAgreed: true,
};

describe("createInquiry", () => {
  it("POST /api/inquiries 로 본문을 JSON 전송하고 접수번호를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 12 }), { status: 201, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await createInquiry(body);

    expect(res).toEqual({ id: 12 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/inquiries")).toBe(true);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(body);
  });

  it("비-2xx는 ApiError로 변환하고 errorCode를 보존한다(429 과다 제출)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errorCode: "RATE_LIMIT_EXCEEDED", title: "요청이 너무 많습니다" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(createInquiry(body)).rejects.toBeInstanceOf(ApiError);
    await expect(createInquiry(body)).rejects.toMatchObject({ status: 429, errorCode: "RATE_LIMIT_EXCEEDED" });
  });

  it("인증 헤더를 붙이지 않는다(비회원 제출)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createInquiry(body);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.credentials).toBeUndefined();
  });
});
