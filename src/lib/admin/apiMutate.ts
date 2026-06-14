import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";

type Method = "POST" | "PUT" | "PATCH" | "DELETE";

// 어드민 JSON 쓰기 공용 헬퍼. authFetch(401 refresh·큐잉) + parseJson(비-2xx → ApiError).
// 204(DELETE 등)는 본문이 없어 parseJson의 res.json()이 빈 본문에 throw하므로 여기서 먼저 처리.
// FormData 업로드는 Content-Type 수동설정 금지라 이 헬퍼를 쓰지 않는다(05 업로더 별도).
export async function apiMutate<T>(
  path: string,
  opts: { method: Method; body?: unknown },
): Promise<T> {
  const res = await authFetch(path, {
    method: opts.method,
    headers: { "Content-Type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}
