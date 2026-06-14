import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/auth/apiError";
import { adminOnError, isOptimisticLockConflict } from "./mutationHandlers";

vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
import { notify } from "@/lib/notify";
vi.mock("@/lib/auth/handleApiError", () => ({ handleApiError: vi.fn() }));
import { handleApiError } from "@/lib/auth/handleApiError";

beforeEach(() => vi.clearAllMocks());

describe("adminOnError", () => {
  it("ApiError면 handleApiError로 위임한다", () => {
    const e = new ApiError(403, "ACCESS_DENIED", undefined);
    const handlers = { onReedit: vi.fn() };
    adminOnError(handlers)(e);
    expect(handleApiError).toHaveBeenCalledWith(e, handlers);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("ApiError가 아니면 일반 네트워크 오류 토스트", () => {
    adminOnError()(new Error("network down"));
    expect(notify.error).toHaveBeenCalledWith(
      "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(handleApiError).not.toHaveBeenCalled();
  });
});

describe("isOptimisticLockConflict", () => {
  it("OPTIMISTIC_LOCK_CONFLICT ApiError면 true", () => {
    expect(isOptimisticLockConflict(new ApiError(409, "OPTIMISTIC_LOCK_CONFLICT", undefined))).toBe(true);
  });
  it("다른 ApiError·일반 오류면 false", () => {
    expect(isOptimisticLockConflict(new ApiError(403, "ACCESS_DENIED", undefined))).toBe(false);
    expect(isOptimisticLockConflict(new Error("x"))).toBe(false);
  });
});
