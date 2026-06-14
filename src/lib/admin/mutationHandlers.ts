import { ApiError } from "@/lib/auth/apiError";
import { handleApiError, type ApiErrorHandlers } from "@/lib/auth/handleApiError";
import { notify } from "@/lib/notify";

// useMutation onError 통일: ApiError는 errorCode 분기(handleApiError), 그 외는 네트워크 오류 토스트.
export function adminOnError(handlers?: ApiErrorHandlers): (e: unknown) => void {
  return (e: unknown) => {
    if (e instanceof ApiError) handleApiError(e, handlers);
    else notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  };
}

// 낙관락 충돌(가이드 8장) 도메인 분기용 — onReedit로 최신본 재조회를 유도할 때 판별.
export function isOptimisticLockConflict(e: unknown): boolean {
  return e instanceof ApiError && e.errorCode === "OPTIMISTIC_LOCK_CONFLICT";
}
