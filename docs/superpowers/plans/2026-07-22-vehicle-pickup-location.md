# 차량 탑승 신청 — 현재 위치 첨부(원탭) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 탑승자가 신청 시 브라우저 현재 위치를 원탭으로 첨부하고, 회원 카드·기사 명단에서 그 좌표로 카카오맵 핀을 연다(지도 SDK·키 없이).

**Architecture:** 백엔드가 이미 신청/응답에 `latitude`·`longitude`(nullable)를 추가하고 `pickupLocation`을 선택으로 완화함. 프론트는 (1) geolocation·카카오맵URL 유틸 2개 추가, (2) 좌표 타입 확장, (3) 신청 다이얼로그에 "현재 위치 첨부" 버튼 + zod "최소 하나" 검증, (4) 회원 카드·기사 명단에 좌표 있으면 지도 링크. 기존 #114 컴포넌트 위에 얹는 증분.

**Tech Stack:** Next.js(App Router)·TanStack Query·RHF+zod·Tailwind 토큰·lucide·vitest. 브라우저 `navigator.geolocation`. 신규 의존성 없음.

**스펙:** `docs/superpowers/specs/2026-07-22-vehicle-pickup-location-frontend-design.md` (백엔드 계약: `2026-07-22-vehicle-pickup-location-backend-spec.md` + `docs/api-docs.json`)

## Global Constraints

- 코드 작성 전 `node_modules/next/dist/docs/` 관련 문서 확인(AGENTS.md — 이 Next.js는 다르다).
- **검증 게터 3종 금지**: `docs/api-docs.json`의 `VehicleRequestCreateRequest`에 뜬 `pickupOrCoordinatesPresent`·`coordinatesPaired`·`coordinatesInRange`는 Spring `@AssertTrue` 게터가 샌 것 — 실제 입력 필드가 아니다. 타입에 넣지도, 전송하지도 않는다. `latitude`·`longitude`만 보낸다.
- 지도 링크는 카카오맵 좌표 URL(`https://map.kakao.com/link/map/{라벨},{위도},{경도}`) — SDK·키 없음. 외부 링크는 `target="_blank" rel="noopener noreferrer"`.
- 에러 분기는 `errorCode`로만(status·title 금지). geolocation 실패는 `notify.error`로 안내.
- 주석은 한국어·WHY 중심. hex·px 인라인 금지(`typo.*`·토큰 유틸만). JSX 조건부는 삼항(`{cond ? <X/> : null}`).
- UI 이모지 금지, 아이콘은 lucide-react만. 색 `currentColor`, 크기 `size` prop.
- Button variant는 코드상 `secondary`(DESIGN.md의 `button-secondary-light`에 해당).
- 테스트 관례: vitest `globals:false` 명시 import · jest-dom 없음(`toBeDefined()`/`getAttribute`) · `next/navigation`·`next/link` mock · mock 컴포넌트는 엘리먼트 반환.
- zod v4: `invalid_type_error` 금지 — 메시지 인자만.
- 검증 3종: `pnpm test` · `npx tsc --noEmit`(lint는 타입체크 안 함) · `pnpm lint`.
- 커밋 형식 `<type> : <설명> #<N>` — **`#<N>`은 실행 시작 시 결정한 이슈 번호로 치환**(이 기능은 #114와 별개 후속 — 새 이슈 발급 권장. 실행 전 브랜치·이슈 확정). Co-Authored-By 금지.

---

### Task 1: geolocation·mapLink 유틸

**Files:**
- Create: `src/lib/geolocation.ts`, `src/lib/geolocation.test.ts`
- Create: `src/lib/mapLink.ts`, `src/lib/mapLink.test.ts`

**Interfaces:**
- Produces: `getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }>` (`Coordinates` 타입 export) · `kakaoMapPinUrl(latitude: number, longitude: number, label?: string): string`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/geolocation.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getCurrentPosition } from "./geolocation";

afterEach(() => vi.unstubAllGlobals());

// 표준 GeolocationPositionError 코드 상수(1·2·3)를 실은 오류 객체.
function geoError(code: number): GeolocationPositionError {
  return { code, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
}

describe("getCurrentPosition", () => {
  it("성공 시 좌표를 반환한다", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 37.5, longitude: 127.0, accuracy: 12 } } as GeolocationPosition),
      },
    });
    await expect(getCurrentPosition()).resolves.toEqual({ latitude: 37.5, longitude: 127.0, accuracy: 12 });
  });

  it("권한 거부(1)면 안내 문구로 reject", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => err(geoError(1)),
      },
    });
    await expect(getCurrentPosition()).rejects.toThrow("위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요.");
  });

  it("타임아웃(3)이면 재시도 안내로 reject", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => err(geoError(3)),
      },
    });
    await expect(getCurrentPosition()).rejects.toThrow("위치를 가져오지 못했습니다. 다시 시도해 주세요.");
  });

  it("미지원 브라우저면 미지원 문구로 reject", async () => {
    vi.stubGlobal("navigator", {});
    await expect(getCurrentPosition()).rejects.toThrow("이 브라우저는 위치를 지원하지 않습니다.");
  });
});
```

- [ ] **Step 2: 실패하는 테스트 작성** — `src/lib/mapLink.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { kakaoMapPinUrl } from "./mapLink";

describe("kakaoMapPinUrl", () => {
  it("좌표와 라벨로 카카오맵 핀 URL을 만든다", () => {
    expect(kakaoMapPinUrl(37.5665, 126.978, "정문")).toBe(
      "https://map.kakao.com/link/map/%EC%A0%95%EB%AC%B8,37.5665,126.978",
    );
  });

  it("라벨 생략 시 기본 '픽업 위치'", () => {
    expect(kakaoMapPinUrl(37.5, 127.0)).toBe(
      "https://map.kakao.com/link/map/%ED%94%BD%EC%97%85%20%EC%9C%84%EC%B9%98,37.5,127",
    );
  });

  it("undefined 라벨이면 기본값이 적용된다", () => {
    expect(kakaoMapPinUrl(37.5, 127.0, undefined)).toContain("/%ED%94%BD%EC%97%85%20%EC%9C%84%EC%B9%98,");
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run src/lib/geolocation.test.ts src/lib/mapLink.test.ts`
Expected: FAIL — `Cannot find module './geolocation'` / `'./mapLink'`

- [ ] **Step 4: 구현** — `src/lib/geolocation.ts`

```ts
// 브라우저 위치 래퍼 — navigator.geolocation.getCurrentPosition을 프로미스로.
// 회원 신청의 "현재 위치 첨부" 전용. 오류 코드를 사용자 문구로 매핑해 reject(호출부가 토스트).
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("이 브라우저는 위치를 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(geolocationErrorMessage(err))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

// GeolocationPositionError.code → 한글 문구.
function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요.";
    case err.POSITION_UNAVAILABLE:
      return "현재 위치를 확인할 수 없습니다.";
    case err.TIMEOUT:
      return "위치를 가져오지 못했습니다. 다시 시도해 주세요.";
    default:
      return "위치를 가져오지 못했습니다.";
  }
}
```

- [ ] **Step 5: 구현** — `src/lib/mapLink.ts`

```ts
// 좌표 → 카카오맵 핀 URL(SDK·키 불필요). 회원 카드·기사 명단이 공유.
// 형식: /link/map/{이름},{위도},{경도} — 이름 라벨로 핀 표시, 모바일은 카카오맵 앱 연계.
// church.ts의 mapSearchUrl(주소 검색)과 별개 — 이건 좌표 핀.
export function kakaoMapPinUrl(latitude: number, longitude: number, label = "픽업 위치"): string {
  return `https://map.kakao.com/link/map/${encodeURIComponent(label)},${latitude},${longitude}`;
}
```

- [ ] **Step 6: 통과 확인**

Run: `pnpm vitest run src/lib/geolocation.test.ts src/lib/mapLink.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 7: 커밋**

```bash
git add src/lib/geolocation.ts src/lib/geolocation.test.ts src/lib/mapLink.ts src/lib/mapLink.test.ts
git commit -m "feat : 위치 첨부용 geolocation·카카오맵URL 유틸 추가 #<N>"
```

---

### Task 2: 좌표 타입 확장

순수 타입 변경 — 단위 테스트 없음, `tsc`로 검증. 뒤 Task 3~5가 이 타입을 소비한다.

**Files:**
- Modify: `src/lib/api/types.ts` (`MyRequestResponse`·`VehicleRequestResponse`·`VehicleRosterEntryResponse`)
- Modify: `src/lib/api/vehicles.ts` (`VehicleRequestCreateRequest`)

**Interfaces:**
- Produces: 세 응답 타입에 `latitude?: number`·`longitude?: number` + `pickupLocation?`(선택화). 요청 타입 `VehicleRequestCreateRequest`에 `latitude?: number`·`longitude?: number`.

- [ ] **Step 1: 응답 타입 3종 수정** — `src/lib/api/types.ts`

`MyRequestResponse`를 다음으로 교체:
```ts
export interface MyRequestResponse {
  pickupLocation?: string; // 좌표만 신청 시 누락 가능(@JsonInclude(NON_NULL))
  note?: string; // @JsonInclude(NON_NULL) 관례 — 미입력 시 누락 가능
  latitude?: number; // 현재 위치 첨부 시(좌표는 동반)
  longitude?: number;
}
```

`VehicleRequestResponse`를 다음으로 교체:
```ts
export interface VehicleRequestResponse {
  id: number;
  runId: number;
  pickupLocation?: string; // 좌표만 신청 시 누락 가능
  note?: string;
  latitude?: number;
  longitude?: number;
}
```

`VehicleRosterEntryResponse`를 다음으로 교체:
```ts
export interface VehicleRosterEntryResponse {
  name: string; // 탈퇴 회원은 "(탈퇴한 사용자)" — 백엔드 처리
  phone?: string; // 탈퇴 시 누락 가능성 방어
  pickupLocation?: string; // 좌표만 신청 시 누락 가능
  note?: string;
  requestedAt: string;
  latitude?: number; // 현재 위치 첨부 시
  longitude?: number;
}
```

- [ ] **Step 2: 요청 타입 수정** — `src/lib/api/vehicles.ts`

`VehicleRequestCreateRequest`를 다음으로 교체:
```ts
// 요청 타입은 도메인-로컬(types.ts 규약 — 쓰기 요청 타입은 공유 파일에 두지 않는다).
// 주의: 백엔드 스키마의 pickupOrCoordinatesPresent 등 @AssertTrue 게터는 실제 필드가 아니므로 넣지 않는다.
export interface VehicleRequestCreateRequest {
  pickupLocation?: string; // ≤200, 선택(좌표만 신청 가능)
  note?: string; // 동승 인원·특이사항
  latitude?: number; // 현재 위치 첨부(좌표는 동반 필수 — 백엔드 검증)
  longitude?: number;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 오류 0. (기존 `VehicleApplyDialog`가 `pickupLocation: v.pickupLocation`(string)을 optional 필드에 넣는 것·카드에서 `myRequest.pickupLocation`(now optional)을 JSX에 쓰는 것 모두 컴파일 유지 — Task 3~4에서 표시 로직 보강.)

- [ ] **Step 4: 커밋**

```bash
git add src/lib/api/types.ts src/lib/api/vehicles.ts
git commit -m "feat : 차량 탑승 신청·명단 응답에 좌표 필드 추가 #<N>"
```

---

### Task 3: 신청 다이얼로그 — 현재 위치 첨부

**Files:**
- Modify: `src/components/vehicles/VehicleApplyDialog.tsx` (전면 교체)
- Modify: `src/components/vehicles/VehicleApplyDialog.test.tsx` (기존 3건 갱신 + 신규 3건)

**Interfaces:**
- Consumes: Task 1 `getCurrentPosition`·`kakaoMapPinUrl`, Task 2 요청 타입, 기존 `useApplyVehicleRequest`(`./queries`), `@/lib/notify`.
- Produces: 변경 없음(같은 `VehicleApplyDialog` 시그니처).

- [ ] **Step 1: 테스트 전면 교체** — `src/components/vehicles/VehicleApplyDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { applyMock, geoMock } = vi.hoisted(() => ({ applyMock: vi.fn(), geoMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  applyVehicleRequest: applyMock,
}));
vi.mock("@/lib/geolocation", () => ({ getCurrentPosition: geoMock }));
// 토스트는 sonner Toaster가 이 테스트에 없어 DOM으로 못 잡는다 → notify를 spy로 검증(queries onSuccess도 이 mock 사용).
vi.mock("@/lib/notify", () => ({ notify: { error: vi.fn(), success: vi.fn() } }));

import { VehicleApplyDialog } from "./VehicleApplyDialog";
import { notify } from "@/lib/notify";
import type { VehicleRunCardResponse } from "@/lib/api/types";

const run: VehicleRunCardResponse = { id: 5, departsAt: "2026-07-26T07:30:00", note: "본당 앞", myRequest: null };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

const renderDialog = (onOpenChange = vi.fn()) =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleApplyDialog run={run} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );

describe("VehicleApplyDialog", () => {
  it("픽업·위치 모두 없이 제출이면 검증 메시지 + API 미호출", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    expect(await screen.findByText("픽업 장소를 입력하거나 현재 위치를 첨부해 주세요.")).toBeDefined();
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("픽업 텍스트만 제출 시 좌표 없이 payload 전달 + 닫힘", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);
    fireEvent.change(screen.getByLabelText("픽업 장소 (선택)"), { target: { value: "○○아파트 정문" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "○○아파트 정문" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("메모 입력 시 note 포함", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    renderDialog();
    fireEvent.change(screen.getByLabelText("픽업 장소 (선택)"), { target: { value: "정문" } });
    fireEvent.change(screen.getByLabelText("메모 (선택)"), { target: { value: "동생과 2명" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "정문", note: "동생과 2명" }));
  });

  it("현재 위치 첨부 → 좌표만으로 제출(검증 게터 미포함)", async () => {
    geoMock.mockResolvedValue({ latitude: 37.5, longitude: 127.0, accuracy: 10 });
    applyMock.mockResolvedValue({ id: 1, runId: 5 });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 첨부" }));
    await waitFor(() => expect(screen.getByText("위치 첨부됨")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { latitude: 37.5, longitude: 127.0 }));
  });

  it("위치 첨부 후 지우면 다시 검증에 걸린다", async () => {
    geoMock.mockResolvedValue({ latitude: 37.5, longitude: 127.0, accuracy: 10 });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 첨부" }));
    await waitFor(() => expect(screen.getByText("위치 첨부됨")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "첨부한 위치 지우기" }));
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    expect(await screen.findByText("픽업 장소를 입력하거나 현재 위치를 첨부해 주세요.")).toBeDefined();
  });

  it("위치 권한 거부 시 에러 토스트(첨부 안 됨)", async () => {
    geoMock.mockRejectedValue(new Error("위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요."));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 첨부" }));
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith("위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요."),
    );
    expect(screen.queryByText("위치 첨부됨")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleApplyDialog.test.tsx`
Expected: FAIL — 기존 라벨/문구 불일치 + 새 동작 미구현

- [ ] **Step 3: 구현** — `src/components/vehicles/VehicleApplyDialog.tsx` (전면 교체)

```tsx
"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LocateFixed, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { notify } from "@/lib/notify";
import { formatDate, formatClockTime } from "@/lib/date";
import { getCurrentPosition } from "@/lib/geolocation";
import { kakaoMapPinUrl } from "@/lib/mapLink";
import { useApplyVehicleRequest } from "./queries";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// 백엔드 VehicleRequestCreateRequest 미러(스펙 2026-07-22): 픽업 텍스트·좌표 중 최소 하나.
// 좌표 동반(둘 다/둘 다 없음)은 UI 불변식(attach/clear가 쌍으로 처리)이라 refine 없이 백엔드가 최종 방어.
const applySchema = z
  .object({
    pickupLocation: z.string().trim().max(200, "200자 이내로 입력해 주세요."),
    note: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  })
  .refine((v) => v.pickupLocation.trim() !== "" || (v.latitude != null && v.longitude != null), {
    path: ["pickupLocation"],
    message: "픽업 장소를 입력하거나 현재 위치를 첨부해 주세요.",
  });
type ApplyFormValues = z.infer<typeof applySchema>;
const EMPTY: ApplyFormValues = { pickupLocation: "", note: "", latitude: null, longitude: null };

export interface VehicleApplyDialogProps {
  run: VehicleRunCardResponse | null; // null=닫힘
  onOpenChange: (v: boolean) => void;
}

export function VehicleApplyDialog({ run, onOpenChange }: VehicleApplyDialogProps) {
  const apply = useApplyVehicleRequest();
  const open = run != null;
  const [locating, setLocating] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: EMPTY,
  });

  // 열릴 때마다 초기화 — 직전 신청 입력·좌표 잔존 방지.
  useEffect(() => {
    if (open) { reset(EMPTY); setLocating(false); }
  }, [open, reset]);

  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const attachLocation = async () => {
    setLocating(true);
    try {
      const c = await getCurrentPosition();
      setValue("latitude", c.latitude, { shouldValidate: true });
      setValue("longitude", c.longitude, { shouldValidate: true });
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "위치를 가져오지 못했습니다.");
    } finally {
      setLocating(false);
    }
  };

  const clearLocation = () => {
    setValue("latitude", null, { shouldValidate: true });
    setValue("longitude", null, { shouldValidate: true });
  };

  const submit = (v: ApplyFormValues) => {
    if (run == null) return;
    const pickup = v.pickupLocation.trim();
    apply.mutate(
      {
        runId: run.id,
        body: {
          ...(pickup === "" ? {} : { pickupLocation: pickup }),
          ...(v.note.trim() === "" ? {} : { note: v.note }),
          ...(v.latitude != null && v.longitude != null ? { latitude: v.latitude, longitude: v.longitude } : {}),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {run ? `${formatDate(run.departsAt)} ${formatClockTime(run.departsAt)} 탑승 신청` : "탑승 신청"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vh-pickup" className={cn(typo.bodySm, "text-body")}>픽업 장소 (선택)</label>
            <Input id="vh-pickup" placeholder="예: ○○아파트 정문" error={errors.pickupLocation?.message} {...register("pickupLocation")} />
            <p className={cn(typo.caption, "text-muted")}>주소를 입력하거나 아래에서 현재 위치를 첨부하세요.</p>
          </div>

          <div className="flex flex-col gap-xxs">
            {latitude != null && longitude != null ? (
              <div className="flex items-center justify-between gap-sm rounded-md border border-hairline p-md">
                <span className={cn(typo.bodySm, "flex items-center gap-xs text-body")}>
                  <MapPin size={18} aria-hidden />
                  위치 첨부됨
                </span>
                <span className="flex items-center gap-sm">
                  <a
                    href={kakaoMapPinUrl(latitude, longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(typo.bodySm, "text-primary underline-offset-4 hover:underline")}
                  >
                    지도에서 확인
                  </a>
                  <button type="button" onClick={clearLocation} aria-label="첨부한 위치 지우기" className="text-muted hover:text-ink">
                    <X size={18} aria-hidden />
                  </button>
                </span>
              </div>
            ) : (
              <Button type="button" variant="secondary" loading={locating} onClick={attachLocation}>
                <LocateFixed size={18} aria-hidden />
                현재 위치 첨부
              </Button>
            )}
            <p className={cn(typo.caption, "text-muted")}>휴대폰에서 누르면 더 정확해요. PC는 위치가 부정확할 수 있어요.</p>
          </div>

          <div className="flex flex-col gap-xxs">
            <label htmlFor="vh-note" className={cn(typo.bodySm, "text-body")}>메모 (선택)</label>
            <Textarea id="vh-note" rows={3} placeholder="동승 인원·특이사항이 있으면 적어 주세요." {...register("note")} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={apply.isPending}>신청</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleApplyDialog.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/vehicles/VehicleApplyDialog.tsx src/components/vehicles/VehicleApplyDialog.test.tsx
git commit -m "feat : 탑승 신청에 현재 위치 첨부 추가 #<N>"
```

---

### Task 4: 회원 카드 — 위치 보기

**Files:**
- Modify: `src/components/vehicles/VehicleRunList.tsx` (myRequest 표시 블록)
- Modify: `src/components/vehicles/VehicleRunList.test.tsx` (신규 2건)

**Interfaces:**
- Consumes: Task 1 `kakaoMapPinUrl`, Task 2 `MyRequestResponse`(좌표·optional pickupLocation).

- [ ] **Step 1: 신규 테스트 작성** — `src/components/vehicles/VehicleRunList.test.tsx`의 `describe` 안 마지막에 추가

```tsx
  it("좌표 있는 신청은 '위치 보기' 링크(카카오맵)", async () => {
    fetchMock.mockResolvedValue(
      page([{ id: 7, departsAt: "2026-08-09T07:30:00", myRequest: { pickupLocation: "정문", latitude: 37.5, longitude: 127.0 } }]),
    );
    renderList();
    const link = await screen.findByRole("link", { name: "위치 보기" });
    expect(link.getAttribute("href")).toBe("https://map.kakao.com/link/map/%EC%A0%95%EB%AC%B8,37.5,127");
  });

  it("좌표만 있고 픽업 텍스트 없으면 '위치 첨부됨' 표기", async () => {
    fetchMock.mockResolvedValue(
      page([{ id: 8, departsAt: "2026-08-16T07:30:00", myRequest: { latitude: 37.5, longitude: 127.0 } }]),
    );
    renderList();
    expect(await screen.findByText("위치 첨부됨")).toBeDefined();
    expect(screen.getByRole("link", { name: "위치 보기" })).toBeDefined();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleRunList.test.tsx`
Expected: FAIL — "위치 보기" 링크/"위치 첨부됨" 미구현

- [ ] **Step 3: 구현** — `src/components/vehicles/VehicleRunList.tsx`

파일 상단 import에 추가:
```tsx
import { kakaoMapPinUrl } from "@/lib/mapLink";
```

myRequest 표시 블록(현재 55~58행)을 다음으로 교체:
```tsx
                <Badge variant="primary">신청됨</Badge>
                {run.myRequest.pickupLocation ? (
                  <p className={cn(typo.bodySm, "text-body")}>픽업: {run.myRequest.pickupLocation}</p>
                ) : (
                  <p className={cn(typo.bodySm, "text-body")}>위치 첨부됨</p>
                )}
                {run.myRequest.latitude != null && run.myRequest.longitude != null ? (
                  <a
                    href={kakaoMapPinUrl(run.myRequest.latitude, run.myRequest.longitude, run.myRequest.pickupLocation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(typo.caption, "text-primary underline-offset-4 hover:underline")}
                  >
                    위치 보기
                  </a>
                ) : null}
                {run.myRequest.note ? <p className={cn(typo.caption, "text-muted")}>{run.myRequest.note}</p> : null}
                <Button type="button" variant="tertiary" onClick={() => setCancelTarget(run)}>신청 취소</Button>
```

> `kakaoMapPinUrl`의 3번째 인자에 `pickupLocation`(string | undefined)을 넘기면, undefined일 때 기본값 "픽업 위치"가 적용된다(기본 매개변수).

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleRunList.test.tsx`
Expected: PASS (기존 4건 + 신규 2건)

- [ ] **Step 5: 커밋**

```bash
git add src/components/vehicles/VehicleRunList.tsx src/components/vehicles/VehicleRunList.test.tsx
git commit -m "feat : 회원 카드에 위치 보기 링크·좌표만 신청 표기 추가 #<N>"
```

---

### Task 5: 기사 명단 — 지도 보기

**Files:**
- Modify: `src/components/admin/vehicles/VehicleRosterView.tsx` (픽업 장소 컬럼)
- Modify: `src/components/admin/vehicles/VehicleRosterView.test.tsx` (신규 2건)

**Interfaces:**
- Consumes: Task 1 `kakaoMapPinUrl`, Task 2 `VehicleRosterEntryResponse`(좌표·optional pickupLocation).

- [ ] **Step 1: 신규 테스트 작성** — `src/components/admin/vehicles/VehicleRosterView.test.tsx`의 `describe` 안 마지막에 추가

```tsx
  it("좌표 있는 명단 항목은 '지도 보기' 링크(카카오맵)", async () => {
    rosterMock.mockResolvedValue(
      page([{ name: "홍길동", phone: "010-1234-5678", pickupLocation: "정문", requestedAt: "2026-07-20T21:00:00", latitude: 37.5, longitude: 127.0 }]),
    );
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} />
      </QueryClientProvider>,
    );
    const link = await screen.findByRole("link", { name: "지도 보기" });
    expect(link.getAttribute("href")).toBe("https://map.kakao.com/link/map/%EC%A0%95%EB%AC%B8,37.5,127");
  });

  it("좌표 없는 항목은 지도 링크 없음", async () => {
    rosterMock.mockResolvedValue(
      page([{ name: "김철수", phone: "010-2222-3333", pickupLocation: "후문", requestedAt: "2026-07-20T21:05:00" }]),
    );
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("후문")).toBeDefined());
    expect(screen.queryByRole("link", { name: "지도 보기" })).toBeNull();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRosterView.test.tsx`
Expected: FAIL — "지도 보기" 링크 미구현

- [ ] **Step 3: 구현** — `src/components/admin/vehicles/VehicleRosterView.tsx`

파일 상단 import에 추가:
```tsx
import { kakaoMapPinUrl } from "@/lib/mapLink";
```

`columns`의 `pickupLocation` 항목(현재: `{ key: "pickupLocation", header: "픽업 장소", cell: (e) => e.pickupLocation }`)을 다음으로 교체:
```tsx
    {
      key: "pickupLocation",
      header: "픽업 장소",
      cell: (e) => (
        <span className="flex flex-col gap-xxs">
          {e.pickupLocation ? <span>{e.pickupLocation}</span> : null}
          {e.latitude != null && e.longitude != null ? (
            <a
              href={kakaoMapPinUrl(e.latitude, e.longitude, e.pickupLocation)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(typo.bodySm, "text-primary underline-offset-4 hover:underline")}
            >
              지도 보기
            </a>
          ) : null}
        </span>
      ),
    },
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRosterView.test.tsx`
Expected: PASS (기존 3건 + 신규 2건)

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/vehicles/VehicleRosterView.tsx src/components/admin/vehicles/VehicleRosterView.test.tsx
git commit -m "feat : 기사 명단에 좌표 지도 보기 링크 추가 #<N>"
```

---

### Task 6: DESIGN.md 갱신 + 전체 검증

**Files:**
- Modify: `.claude/rules/DESIGN.md` (`vehicle-run-card`·`vehicle-roster-view` 항목)

- [ ] **Step 1: DESIGN.md 갱신** — `vehicle-run-card` 항목 끝 문장에 이어 추가:

```markdown
  현재 위치 첨부(브라우저 geolocation) 지원 — 신청 다이얼로그에 "현재 위치 첨부" 버튼(lucide `LocateFixed`) +
  첨부 시 "위치 첨부됨"·"지도에서 확인"(카카오맵 좌표 URL)·지우기. 픽업 텍스트는 선택(텍스트·좌표 중 최소 하나).
  카드는 좌표가 있으면 "위치 보기" 링크, 픽업 텍스트가 없으면 "위치 첨부됨" 표기.
```

`vehicle-roster-view` 항목 끝 문장에 이어 추가:
```markdown
 좌표가 있으면 픽업 장소 셀에 "지도 보기" 링크(카카오맵 좌표 URL, 키·SDK 불필요).
```

- [ ] **Step 2: 전체 테스트**

Run: `pnpm test`
Expected: 신규·기존 전부 PASS(사전존재 실패 4파일 — `about/SymbolismList`·`about/VisionHero`·`main/HeroHeaderSync`·`about/photos/page` — 은 이 브랜치 미접촉이라 무관).

- [ ] **Step 3: 타입 체크·린트**

Run: `npx tsc --noEmit && pnpm lint`
Expected: tsc 0 오류. lint 0 오류(경고는 기존 파일 한정).

- [ ] **Step 4: 커밋**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs : 차량 위치 첨부 디자인 컴포넌트 갱신 #<N>"
```

---

## 실행 전 확인 (git·이슈)

- 이 기능은 #114(차량운행) 완료 후의 **별개 후속**이며 백엔드 좌표 변경에 의존한다. 실행 시작 시:
  1. `docs/api-docs.json`의 좌표 변경분이 아직 커밋 안 됐으면(현재 워킹트리 수정 상태) 먼저 커밋(`docs : 차량운행 좌표 API 명세 반영 #<N>`).
  2. 새 이슈 발급(`/issue-branch` 권장) 후 그 번호로 `#<N>` 치환, 또는 #114 브랜치 연장 여부를 사용자와 확정.
- 두 스펙 파일(`2026-07-22-*-backend-spec.md`·`*-frontend-design.md`)과 이 계획 파일도 함께 커밋.
