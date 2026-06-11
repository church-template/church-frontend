import { describe, it, expect } from "vitest";
import { ApiError, parseJson } from "./apiError";

describe("parseJson", () => {
  it("res.ok면 JSON을 반환한다", async () => {
    const res = new Response(JSON.stringify({ uuid: "u1" }), { status: 200 });
    await expect(parseJson<{ uuid: string }>(res)).resolves.toEqual({ uuid: "u1" });
  });

  it("403이면 ApiError(status·errorCode)를 throw한다", async () => {
    const res = new Response(
      JSON.stringify({ errorCode: "ACCESS_DENIED", detail: "권한 없음" }),
      { status: 403 },
    );
    await expect(parseJson(res)).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      errorCode: "ACCESS_DENIED",
    });
  });

  it("401 본문이 비어도 throw한다(errorCode undefined 허용)", async () => {
    const res = new Response("", { status: 401 });
    await expect(parseJson(res)).rejects.toBeInstanceOf(ApiError);
  });

  it("봉투 7필드(title·instance·errors·references)를 모두 채운다", async () => {
    const body = {
      errorCode: "INVALID_INPUT_VALUE",
      title: "유효하지 않은 입력값",
      status: 400,
      detail: "입력값이 유효성 검사를 통과하지 못했습니다",
      instance: "/api/auth/login",
      errors: [{ field: "phone", reason: "전화번호 형식이 올바르지 않습니다" }],
    };
    const res = new Response(JSON.stringify(body), { status: 400 });
    await expect(parseJson(res)).rejects.toMatchObject({
      status: 400,
      errorCode: "INVALID_INPUT_VALUE",
      title: "유효하지 않은 입력값",
      instance: "/api/auth/login",
      errors: [{ field: "phone", reason: "전화번호 형식이 올바르지 않습니다" }],
    });
  });

  it("MEDIA_IN_USE면 references를 채운다", async () => {
    const body = {
      errorCode: "MEDIA_IN_USE",
      title: "미디어 사용 중",
      status: 409,
      detail: "참조 중",
      references: [{ type: "SERMON", id: 7, title: "주일설교" }],
    };
    const res = new Response(JSON.stringify(body), { status: 409 });
    await expect(parseJson(res)).rejects.toMatchObject({
      errorCode: "MEDIA_IN_USE",
      references: [{ type: "SERMON", id: 7, title: "주일설교" }],
    });
  });
});
