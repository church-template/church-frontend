import { describe, it, expect } from "vitest";
import {
  civilKey,
  kstCivil,
  kstCivilFromDate,
  monthMatrix,
  bucketEvents,
  buildCalendarModel,
  resolveMonth,
  formatAllDayRange,
} from "./calendar";
import type { EventCardResponse } from "./api/types";

const ev = (o: Partial<EventCardResponse>): EventCardResponse => ({
  id: 1, title: "t", location: null, startAt: "2026-06-14T10:00:00",
  endAt: null, allDay: false, tags: [], ...o,
});

describe("kstCivil — KST 벽시계 날짜(런타임 TZ 무관)", () => {
  it("offset 없는 datetime의 날짜부를 그대로 반환", () => {
    expect(kstCivil("2026-06-14T23:59:59")).toEqual({ y: 2026, m: 6, d: 14 });
    expect(kstCivil("2026-06-14T00:00:00")).toEqual({ y: 2026, m: 6, d: 14 });
  });
  it("UTC 인스턴트를 Asia/Seoul로 환산(+9h 경계)", () => {
    // 2026-06-14T16:00:00Z = KST 2026-06-15 01:00
    expect(kstCivilFromDate(new Date("2026-06-14T16:00:00Z"))).toEqual({ y: 2026, m: 6, d: 15 });
    // 2026-06-14T14:00:00Z = KST 2026-06-14 23:00
    expect(kstCivilFromDate(new Date("2026-06-14T14:00:00Z"))).toEqual({ y: 2026, m: 6, d: 14 });
  });
});

describe("monthMatrix", () => {
  it("2026-06은 5행, 첫 셀은 이전 달(5/31, inMonth=false)", () => {
    const m = monthMatrix(2026, 6);
    expect(m.length).toBe(5);
    expect(m[0][0]).toEqual({ civil: { y: 2026, m: 5, d: 31 }, inMonth: false });
    expect(m[0][1].civil).toEqual({ y: 2026, m: 6, d: 1 });
  });
  it("일요일 시작 28일 2월(2026-02)은 4행", () => {
    expect(monthMatrix(2026, 2).length).toBe(4);
  });
});

describe("bucketEvents — KST 셀 매핑", () => {
  const has = (m: Map<number, EventCardResponse[]>, y: number, mo: number, d: number) =>
    (m.get(civilKey({ y, m: mo, d })) ?? []).length > 0;

  it("점 이벤트(endAt=null)는 시작일 셀만(검수 ③)", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-14T10:00:00", endAt: null })]);
    expect(has(m, 2026, 6, 14)).toBe(true);
    expect(has(m, 2026, 6, 15)).toBe(false);
  });
  it("end_at 배타 — 종료 자정 다음날 제외(검수 ④)", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-30T00:00:00", endAt: "2026-07-01T00:00:00", allDay: true })]);
    expect(has(m, 2026, 6, 30)).toBe(true);
    expect(has(m, 2026, 7, 1)).toBe(false);
  });
  it("2일 all-day(end=익일 자정)는 시작·종료일 모두, 그 다음날 제외", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-14T00:00:00", endAt: "2026-06-16T00:00:00", allDay: true })]);
    expect(has(m, 2026, 6, 14)).toBe(true);
    expect(has(m, 2026, 6, 15)).toBe(true);
    expect(has(m, 2026, 6, 16)).toBe(false);
  });
  it("OVERLAP — 시작이 이전 달이면 이전 달 셀에도 버킷", () => {
    const m = bucketEvents([ev({ startAt: "2026-05-31T10:00:00", endAt: "2026-06-02T00:00:00", allDay: false })]);
    expect(has(m, 2026, 5, 31)).toBe(true);
    expect(has(m, 2026, 6, 1)).toBe(true);
    expect(has(m, 2026, 6, 2)).toBe(false); // 06-02 00:00 배타
  });
  it("퇴화 end==start는 시작일만(점 이벤트를 end=start로 보낸 경우 방어)", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T10:00:00" })]);
    expect(has(m, 2026, 6, 14)).toBe(true);
    expect(m.size).toBe(1);
  });
  it("Invalid 입력(offset 접미사 등)은 버킷 스킵(무음 NaN 차단)", () => {
    const m = bucketEvents([ev({ startAt: "garbage", endAt: null })]);
    expect(m.size).toBe(0);
  });
});

describe("buildCalendarModel", () => {
  it("weeks·dayGroups·today를 직렬화 모델로 반환", () => {
    const model = buildCalendarModel({
      year: 2026, month: 6,
      today: { y: 2026, m: 6, d: 15 },
      events: [ev({ id: 1, startAt: "2026-06-14T10:00:00", endAt: null })],
    });
    expect(model.weeks.length).toBe(5);
    expect(model.today).toEqual({ y: 2026, m: 6, d: 15 });
    // dayGroups: 이벤트 있는 in-month 날만, 오름차순
    expect(model.dayGroups.map((g) => g.civil.d)).toEqual([14]);
    expect(model.dayGroups[0].events[0].id).toBe(1);
  });
});

describe("resolveMonth", () => {
  const now = new Date("2026-03-15T05:00:00Z"); // KST 2026-03-15 14:00
  it("유효한 year+month는 그대로", () => {
    expect(resolveMonth({ year: 2026, month: 6 }, now)).toEqual({ year: 2026, month: 6 });
  });
  it("반쪽/누락/비정상은 현재 KST 월로 폴백(400 차단)", () => {
    expect(resolveMonth({ year: 2026 }, now)).toEqual({ year: 2026, month: 3 });
    expect(resolveMonth({}, now)).toEqual({ year: 2026, month: 3 });
    expect(resolveMonth({ year: 2026, month: 13 }, now)).toEqual({ year: 2026, month: 3 });
  });
});

describe("formatAllDayRange — lastC(포함 마지막 날) 파생", () => {
  it("단일일(end=익일 자정)은 null", () => {
    expect(formatAllDayRange("2026-06-14T00:00:00", "2026-06-15T00:00:00")).toBeNull();
  });
  it("다일은 '~ M. D.'(lastC)", () => {
    expect(formatAllDayRange("2026-06-14T00:00:00", "2026-06-16T00:00:00")).toBe("~ 6. 15.");
  });
  it("endAt 없으면 null", () => {
    expect(formatAllDayRange("2026-06-14T00:00:00", null)).toBeNull();
  });
});
