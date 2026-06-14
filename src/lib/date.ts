// 서버 datetime은 offset 없는 LocalDateTime("2026-06-14T10:00:00"). JS new Date("...")는 브라우저
// 로컬TZ로 파싱돼 SSR/비KST에서 어긋남 → +09:00 명시 부착 후 파싱(KST 가정, 가이드 15.3 / 백엔드 A).
export function parseServerDate(s: string): Date {
  return /T/.test(s) ? new Date(`${s}+09:00`) : new Date(`${s}T00:00:00+09:00`);
}

// 표시 포맷터 — Intl + Asia/Seoul 고정. 서버 런타임 TZ와 무관하게 KST 표기를 보장한다.
// (date-fns format()은 런타임 로컬 TZ 기준이라 비KST 서버에서 어긋남 — 도입은 캘린더 T12에서)
const KST = "Asia/Seoul";

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const monthDayFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  month: "numeric",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026. 6. 1." — preachedAt(date)·createdAt(datetime) 공용. datetime 토큰(tnum)과 함께 쓴다. */
export function formatDate(iso: string): string {
  return dateFmt.format(parseServerDate(iso));
}

/**
 * EventCard 시간줄 — 날짜는 배지가 담당하므로 중복 표기하지 않는다(스펙 §4).
 * allDay → null(시간 생략, 13.2). 단 여러 날이면 "~ 6. 15." 종료일만.
 * endAt 없음 → "10:00" / 같은 날 → "10:00 ~ 12:00" / 다른 날 → "10:00 ~ 6. 15. 12:00"
 */
export function formatEventTime(
  startAt: string,
  endAt: string | null | undefined,
  allDay: boolean,
): string | null {
  const start = parseServerDate(startAt);
  const end = endAt ? parseServerDate(endAt) : null;
  const sameDay = end !== null && dateFmt.format(start) === dateFmt.format(end);

  if (allDay) {
    return end && !sameDay ? `~ ${monthDayFmt.format(end)}` : null;
  }
  if (!end) {
    return timeFmt.format(start);
  }
  if (sameDay) {
    return `${timeFmt.format(start)} ~ ${timeFmt.format(end)}`;
  }
  return `${timeFmt.format(start)} ~ ${monthDayFmt.format(end)} ${timeFmt.format(end)}`;
}

/** 칩·상세의 시각 — KST "HH:mm"(tnum은 호출부 typo.datetime). allDay 분기는 호출부. */
export function formatClockTime(iso: string): string {
  return timeFmt.format(parseServerDate(iso));
}

// 쓰기 경로: 폼의 datetime-local/date 값 → 서버 offset 없는 LocalDateTime 문자열.
// 읽기의 parseServerDate(+09:00 부착)와 대칭으로, 쓰기는 offset을 붙이지 않고 KST naive 그대로 둔다.
export function toServerDateTime(local: string, allDay = false): string {
  if (!local) return "";
  if (allDay) return `${local.slice(0, 10)}T00:00:00`;
  const withSeconds = local.length === 16 ? `${local}:00` : local; // 분 단위면 초 보강
  return withSeconds.length === 10 ? `${withSeconds}T00:00:00` : withSeconds; // date만 온 경우 방어
}

// 편집 프리필: 서버 LocalDateTime 문자열 → datetime-local(앞 16자) 또는 date(앞 10자) 입력값.
// parseServerDate(Date 변환)를 거치지 않아야 런타임 TZ가 섞이지 않는다.
export function toLocalInput(serverIso: string, allDay = false): string {
  if (!serverIso) return "";
  return allDay ? serverIso.slice(0, 10) : serverIso.slice(0, 16);
}
