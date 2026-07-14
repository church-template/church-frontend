import { notify } from "@/lib/notify";
import type { ApiError, FieldError, MediaReference } from "./apiError";

// 컨텍스트 의존 효과(라우터·RHF·모달)는 소비측(T14+)이 콜백으로 주입한다.
// 미제공 콜백은 notify 토스트로 폴백한다(가이드 4.2 / 스펙 D2·D7).
export interface ApiErrorHandlers {
  onFieldErrors?: (errors: FieldError[]) => void;      // INVALID_INPUT_VALUE → RHF setError
  onRedirectToLogin?: () => void;                       // INVALID_TOKEN
  onReedit?: () => void | Promise<void>;                // OPTIMISTIC_LOCK_CONFLICT
  onMediaReferences?: (refs: MediaReference[]) => void; // MEDIA_IN_USE
  onDuplicate?: (error: ApiError) => void;              // DUPLICATE_RESOURCE
  onAuthFailed?: (message: string) => void;             // AUTHENTICATION_FAILED(가입여부 비노출)
}

// 회원·어드민(클라이언트) 흐름 전용 — notify가 client seam이다.
// 공개 서버 페이지의 비-2xx는 notFound()/에러 바운더리가 처리(이 함수 호출 안 함).
export function handleApiError(error: ApiError, handlers: ApiErrorHandlers = {}): void {
  switch (error.errorCode) {
    case "AUTHENTICATION_FAILED": {
      const message = "전화번호 또는 비밀번호가 올바르지 않습니다.";
      if (handlers.onAuthFailed) handlers.onAuthFailed(message);
      else notify.error(message);
      break;
    }
    case "INVALID_TOKEN":
      // 여기 도달 = authFetch가 refresh 실패 후 forceLogout 완료(세션 만료).
      if (handlers.onRedirectToLogin) handlers.onRedirectToLogin();
      else notify.error("세션이 만료되었습니다. 다시 로그인해 주세요.");
      break;
    case "ACCESS_DENIED":
      notify.error(error.detail ?? error.title ?? "접근 권한이 없습니다.");
      break;
    case "INVALID_INPUT_VALUE":
      if (error.errors?.length && handlers.onFieldErrors) handlers.onFieldErrors(error.errors);
      else notify.error(error.detail ?? error.title ?? "입력값을 확인해 주세요.");
      break;
    case "MEDIA_IN_USE":
      if (handlers.onMediaReferences) handlers.onMediaReferences(error.references ?? []);
      else notify.error(error.detail ?? error.title ?? "참조 중이라 삭제할 수 없습니다.");
      break;
    case "OPTIMISTIC_LOCK_CONFLICT":
      notify.error("다른 사용자가 먼저 수정했습니다. 최신 내용을 다시 불러옵니다.");
      void handlers.onReedit?.();
      break;
    case "DUPLICATE_RESOURCE":
      if (handlers.onDuplicate) handlers.onDuplicate(error);
      else notify.error(error.detail ?? error.title ?? "이미 존재하는 값입니다.");
      break;
    case "ROLE_IN_USE":
      notify.error("회원에게 할당된 역할이라 삭제할 수 없습니다.");
      break;
    case "DEPARTMENT_HAS_CHILDREN":
      notify.error("하위 부서가 있어 삭제할 수 없습니다. 하위 부서를 먼저 정리해 주세요.");
      break;
    case "FILE_SIZE_EXCEEDED":
      notify.error("파일 용량이 한도를 초과했습니다. 더 작은 파일을 선택해 주세요.");
      break;
    case "RATE_LIMIT_EXCEEDED":
      // 문의 등록 IP 제한(1시간 5건). 재시도 시점을 알려줘야 방문자가 막힌 줄 알고 이탈하지 않는다.
      notify.error("문의가 너무 많이 접수되었습니다. 잠시 후 다시 시도해 주세요.");
      break;
    // FILE_STORAGE_ERROR·INTERNAL_ERROR는 default(서버 title ?? 일반)로 처리 — case 불필요
    default:
      notify.error(error.title ?? "오류가 발생했습니다.");
  }
}
