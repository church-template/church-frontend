import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "./apiError";
import { handleApiError } from "./handleApiError";

// notify는 'use client'(sonner) — 토스트 부수효과를 모킹으로 격리.
vi.mock("@/lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));
import { notify } from "@/lib/notify";

const err = (code: string, extra: Partial<ApiError> = {}) =>
  new ApiError(
    extra.status ?? 400,
    code,
    extra.detail,
    extra.title,
    undefined,
    extra.errors,
    extra.references,
  );

beforeEach(() => vi.clearAllMocks());

describe("handleApiError", () => {
  it("AUTHENTICATION_FAILED: onAuthFailed 없으면 토스트 폴백", () => {
    handleApiError(err("AUTHENTICATION_FAILED"));
    expect(notify.error).toHaveBeenCalledWith(
      "전화번호 또는 비밀번호가 올바르지 않습니다.",
    );
  });

  it("AUTHENTICATION_FAILED: onAuthFailed 제공 시 콜백 호출(토스트 안 함)", () => {
    const onAuthFailed = vi.fn();
    handleApiError(err("AUTHENTICATION_FAILED"), { onAuthFailed });
    expect(onAuthFailed).toHaveBeenCalledWith(
      "전화번호 또는 비밀번호가 올바르지 않습니다.",
    );
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("INVALID_TOKEN: 핸들러 있으면 리다이렉트", () => {
    const onRedirectToLogin = vi.fn();
    handleApiError(err("INVALID_TOKEN", { status: 401 }), { onRedirectToLogin });
    expect(onRedirectToLogin).toHaveBeenCalledOnce();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("INVALID_TOKEN: 핸들러 없으면 토스트 폴백(침묵 금지)", () => {
    handleApiError(err("INVALID_TOKEN", { status: 401 }));
    expect(notify.error).toHaveBeenCalledWith(
      "세션이 만료되었습니다. 다시 로그인해 주세요.",
    );
  });

  it("ACCESS_DENIED: detail 토스트", () => {
    handleApiError(err("ACCESS_DENIED", { status: 403, detail: "위계 위반" }));
    expect(notify.error).toHaveBeenCalledWith("위계 위반");
  });

  it("INVALID_INPUT_VALUE: errors 있고 onFieldErrors 있으면 필드 인라인", () => {
    const onFieldErrors = vi.fn();
    const errors = [{ field: "phone", reason: "형식 오류" }];
    handleApiError(err("INVALID_INPUT_VALUE", { errors }), { onFieldErrors });
    expect(onFieldErrors).toHaveBeenCalledWith(errors);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("INVALID_INPUT_VALUE: errors 없으면 detail 토스트", () => {
    handleApiError(err("INVALID_INPUT_VALUE", { detail: "본문 파싱 실패" }), {
      onFieldErrors: vi.fn(),
    });
    expect(notify.error).toHaveBeenCalledWith("본문 파싱 실패");
  });

  it("MEDIA_IN_USE: onMediaReferences로 참조 전달", () => {
    const onMediaReferences = vi.fn();
    const references = [{ type: "SERMON", id: 7, title: "주일설교" }];
    handleApiError(err("MEDIA_IN_USE", { status: 409, references }), {
      onMediaReferences,
    });
    expect(onMediaReferences).toHaveBeenCalledWith(references);
  });

  it("OPTIMISTIC_LOCK_CONFLICT: 토스트 + onReedit", () => {
    const onReedit = vi.fn();
    handleApiError(err("OPTIMISTIC_LOCK_CONFLICT", { status: 409 }), { onReedit });
    expect(notify.error).toHaveBeenCalledOnce();
    expect(onReedit).toHaveBeenCalledOnce();
  });

  it("DUPLICATE_RESOURCE: onDuplicate 콜백", () => {
    const onDuplicate = vi.fn();
    const e = err("DUPLICATE_RESOURCE", { status: 409 });
    handleApiError(e, { onDuplicate });
    expect(onDuplicate).toHaveBeenCalledWith(e);
  });

  it("미정의 코드(default): title 토스트", () => {
    handleApiError(err("ROLE_IN_USE", { status: 409, title: "역할 사용 중" }));
    expect(notify.error).toHaveBeenCalledWith("역할 사용 중");
  });

  // 폴백 rung(?? 체인·핸들러 부재) 분기 커버리지
  it("ACCESS_DENIED: detail 없으면 title 폴백", () => {
    handleApiError(err("ACCESS_DENIED", { status: 403, title: "접근 거부" }));
    expect(notify.error).toHaveBeenCalledWith("접근 거부");
  });

  it("ACCESS_DENIED: detail·title 모두 없으면 기본 메시지", () => {
    handleApiError(err("ACCESS_DENIED", { status: 403 }));
    expect(notify.error).toHaveBeenCalledWith("접근 권한이 없습니다.");
  });

  it("INVALID_INPUT_VALUE: errors 있어도 onFieldErrors 없으면 detail 토스트", () => {
    handleApiError(
      err("INVALID_INPUT_VALUE", {
        errors: [{ field: "phone", reason: "형식 오류" }],
        detail: "검증 실패",
      }),
    );
    expect(notify.error).toHaveBeenCalledWith("검증 실패");
  });

  it("MEDIA_IN_USE: onMediaReferences 없으면 토스트 폴백", () => {
    handleApiError(err("MEDIA_IN_USE", { status: 409, detail: "참조 중" }));
    expect(notify.error).toHaveBeenCalledWith("참조 중");
  });

  it("DUPLICATE_RESOURCE: onDuplicate 없으면 토스트 폴백", () => {
    handleApiError(err("DUPLICATE_RESOURCE", { status: 409, detail: "전화번호 중복" }));
    expect(notify.error).toHaveBeenCalledWith("전화번호 중복");
  });

  it("default: title 없으면 기본 메시지", () => {
    handleApiError(err("INTERNAL_ERROR", { status: 500 }));
    expect(notify.error).toHaveBeenCalledWith("오류가 발생했습니다.");
  });
});
