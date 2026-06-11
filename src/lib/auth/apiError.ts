// fetch는 4xx/5xx에 throw하지 않으므로, 비-2xx를 여기서 ApiError로 변환한다.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string | undefined,
    readonly detail: string | undefined,
  ) {
    super(detail ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

export async function parseJson<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  // 본문이 RFC7807 ErrorResponse가 아닐 수도 있어 방어적으로 파싱.
  const body = await res
    .clone()
    .json()
    .catch(() => ({}) as { errorCode?: string; detail?: string });
  throw new ApiError(res.status, body.errorCode, body.detail);
}
