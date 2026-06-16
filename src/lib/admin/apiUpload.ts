// src/lib/admin/apiUpload.ts
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";

type Method = "POST" | "PATCH";
type QueryValue = string | number | (string | number)[];

// 쿼리 직렬화: undefined 생략, 배열은 값마다 같은 키 반복(mediaIds=3&mediaIds=5).
function buildQuery(query?: Record<string, QueryValue | undefined>): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((item) => sp.append(k, String(item)));
    else sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 비-JSON 어드민 쓰기(멀티파트 업로드 + 쿼리파라미터 전용 쓰기). authFetch(401 refresh·큐잉) 재사용.
// Content-Type 미설정 → 멀티파트는 브라우저가 boundary 설정, 쿼리 전용은 body 없음. apiMutate(JSON)와 분리.
export async function apiUpload<T>(
  path: string,
  opts: { method: Method; formData?: FormData; query?: Record<string, QueryValue | undefined> },
): Promise<T> {
  const res = await authFetch(`${path}${buildQuery(opts.query)}`, {
    method: opts.method,
    body: opts.formData,
  });
  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}
