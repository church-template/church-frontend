import { describe, it, expect } from "vitest";
import {
  BIBLE_BOOKS, bookName, chapterCount, locate, dailyGoalOf, challengeEndDate, formatRange,
} from "./bible";

describe("BIBLE_BOOKS", () => {
  it("66권, 구약 929·신약 260·전체 1189장 (백엔드 BibleStructure 스냅샷)", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    const sum = (a: number, b: number) =>
      BIBLE_BOOKS.slice(a - 1, b).reduce((s, x) => s + x.chapters, 0);
    expect(sum(1, 39)).toBe(929);
    expect(sum(40, 66)).toBe(260);
    expect(sum(1, 66)).toBe(1189);
  });
  it("양끝 권 이름", () => {
    expect(bookName(1)).toBe("창세기");
    expect(bookName(40)).toBe("마태복음");
    expect(bookName(66)).toBe("요한계시록");
  });
});

describe("chapterCount", () => {
  it("전체·신약·단일 권 구간", () => {
    expect(chapterCount(1, 66)).toBe(1189);
    expect(chapterCount(40, 66)).toBe(260);
    expect(chapterCount(19, 19)).toBe(150); // 시편
  });
});

describe("locate", () => {
  it("구간 시작권 기준 1-based ordinal → (권, 장), 권 경계 이월", () => {
    expect(locate(1, 1)).toEqual({ book: "창세기", chapter: 1 });
    expect(locate(1, 50)).toEqual({ book: "창세기", chapter: 50 });
    expect(locate(1, 51)).toEqual({ book: "출애굽기", chapter: 1 });
    expect(locate(40, 29)).toEqual({ book: "마가복음", chapter: 1 });
    expect(locate(1, 1189)).toEqual({ book: "요한계시록", chapter: 22 });
  });
});

describe("파생 계산 (어드민 미리보기)", () => {
  it("하루 목표 = ⌈장 수/일수⌉", () => {
    expect(dailyGoalOf(260, 65)).toBe(4);
    expect(dailyGoalOf(1189, 365)).toBe(4); // 3.257… → 4
  });
  it("종료일 = 시작일 + targetDays - 1 (포함)", () => {
    expect(challengeEndDate("2026-01-05", 65)).toBe("2026-03-10");
    expect(challengeEndDate("2026-12-31", 1)).toBe("2026-12-31");
  });
  it("범위 라벨", () => {
    expect(formatRange(40, 66)).toBe("마태복음 ~ 요한계시록");
    expect(formatRange(19, 19)).toBe("시편");
  });
});
