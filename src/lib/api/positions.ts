import { apiUrl } from "@/lib/auth/apiBase";
import type { PositionResponse } from "./types";

// 직분 목록(공개, 비페이징 평배열, sortOrder 오름차순). 클라 useQuery 전용 — RSC에서 import 금지.
export async function getPositions(): Promise<PositionResponse[]> {
  const res = await fetch(apiUrl("/api/positions"));
  if (!res.ok) throw new Error(`GET /api/positions 실패: ${res.status}`);
  return (await res.json()) as PositionResponse[];
}
