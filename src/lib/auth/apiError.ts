// fetch는 4xx/5xx에 throw하지 않으므로, 비-2xx를 여기서 ApiError로 변환한다.

// RFC 7807 봉투(가이드 4.1 / api-docs ErrorResponse). @JsonInclude(NON_NULL)이라 조건부 키는 빠질 수 있다.
export interface FieldError {
  field: string;
  reason: string;
}
export interface MediaReference {
  type: string;
  id: number;
  title: string;
}
export interface ErrorBody {
  errorCode?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: FieldError[];      // INVALID_INPUT_VALUE 시에만
  references?: MediaReference[]; // MEDIA_IN_USE 시에만
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string | undefined,
    readonly detail: string | undefined,
    readonly title?: string,
    readonly instance?: string,
    readonly errors?: FieldError[],
    readonly references?: MediaReference[],
  ) {
    super(detail ?? title ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

export async function parseJson<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  // 본문이 RFC7807 ErrorResponse가 아닐 수도 있어 방어적으로 파싱.
  const body = await res
    .clone()
    .json()
    .catch(() => ({}) as ErrorBody);
  throw new ApiError(
    res.status,
    body.errorCode,
    body.detail,
    body.title,
    body.instance,
    body.errors,
    body.references,
  );
}
