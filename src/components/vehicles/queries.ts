"use client";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import {
  fetchVehicleRuns, applyVehicleRequest, cancelVehicleRequest,
  type VehicleRequestCreateRequest,
} from "@/lib/api/vehicles";

// 게이트 통과 후에만 마운트. retry:false — 401 재시도는 authFetch 전담(챌린지 컨벤션).
export function useVehicleRuns(page: number) {
  return useQuery({
    queryKey: ["vehicle-runs", { page }],
    queryFn: () => fetchVehicleRuns({ page }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

// 신청·취소 공통 onError: 상태 어긋남(중복 신청·소멸된 운행일)은 안내 후 목록 재조회로
// 실상태 동기화(다른 기기에서 신청/취소한 경우 — 스펙 §5). 그 외는 공통 errorCode 분기.
function vehicleMutationError(qc: ReturnType<typeof useQueryClient>) {
  return (e: unknown) => {
    if (e instanceof ApiError) {
      if (e.errorCode === "DUPLICATE_RESOURCE" || e.errorCode === "RESOURCE_NOT_FOUND") {
        notify.error(e.errorCode === "DUPLICATE_RESOURCE" ? "이미 신청한 운행일입니다." : "운행일을 찾을 수 없습니다.");
        void qc.invalidateQueries({ queryKey: ["vehicle-runs"] });
        return;
      }
      handleApiError(e); // INVALID_INPUT_VALUE(출발 시각 경과 등)=detail 토스트 외 공통 분기
      return;
    }
    notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  };
}

export function useApplyVehicleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, body }: { runId: number; body: VehicleRequestCreateRequest }) =>
      applyVehicleRequest(runId, body),
    onError: vehicleMutationError(qc),
    onSuccess: () => {
      notify.success("탑승을 신청했습니다.");
      void qc.invalidateQueries({ queryKey: ["vehicle-runs"] });
    },
  });
}

export function useCancelVehicleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: number) => cancelVehicleRequest(runId),
    onError: vehicleMutationError(qc),
    onSuccess: () => {
      notify.success("신청을 취소했습니다.");
      void qc.invalidateQueries({ queryKey: ["vehicle-runs"] });
    },
  });
}
