// 개신교 정경 66권 1189장 — 불변 상수. 백엔드 BibleStructure.java와 동일 숫자·한글 이름
// (currentPosition.book이 백엔드 이름으로 오므로 표기 일치 필수 — bible.test.ts가 드리프트 감시).
// 콘텐츠 하드코딩 금지 예외 아님: 교회별로 변하지 않는 성경 구조 데이터다(백엔드 동일 판단).

const NAMES = [
  "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기", "룻기", "사무엘상", "사무엘하",
  "열왕기상", "열왕기하", "역대상", "역대하", "에스라", "느헤미야", "에스더", "욥기", "시편", "잠언",
  "전도서", "아가", "이사야", "예레미야", "예레미야애가", "에스겔", "다니엘", "호세아", "요엘", "아모스",
  "오바댜", "요나", "미가", "나훔", "하박국", "스바냐", "학개", "스가랴", "말라기", "마태복음",
  "마가복음", "누가복음", "요한복음", "사도행전", "로마서", "고린도전서", "고린도후서", "갈라디아서", "에베소서", "빌립보서",
  "골로새서", "데살로니가전서", "데살로니가후서", "디모데전서", "디모데후서", "디도서", "빌레몬서", "히브리서", "야고보서", "베드로전서",
  "베드로후서", "요한일서", "요한이서", "요한삼서", "유다서", "요한계시록",
] as const;

const CHAPTERS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31,
  12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28,
  16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5,
  3, 5, 1, 1, 1, 22,
] as const;

export const BIBLE_BOOKS: readonly { name: string; chapters: number }[] = NAMES.map(
  (name, i) => ({ name, chapters: CHAPTERS[i] }),
);

// CUMULATIVE[b] = 1~b권 장 수 합 (CUMULATIVE[0]=0, CUMULATIVE[66]=1189) — 백엔드와 동일 산술.
const CUMULATIVE = CHAPTERS.reduce<number[]>((acc, c) => (acc.push(acc[acc.length - 1] + c), acc), [0]);

/** 1-based 권 번호 → 한글 이름. 범위 밖은 호출자 책임(백엔드가 1~66 보장). */
export function bookName(n: number): string {
  return NAMES[n - 1];
}

/** 구간 [startBook, endBook]의 총 장 수. */
export function chapterCount(startBook: number, endBook: number): number {
  return CUMULATIVE[endBook] - CUMULATIVE[startBook - 1];
}

/** 구간 시작권 기준 ordinal(1-based)번째 장의 (권, 장) — 백엔드 locate와 동일 의미. */
export function locate(startBook: number, ordinal: number): { book: string; chapter: number } {
  const global = CUMULATIVE[startBook - 1] + ordinal;
  let book = 1;
  while (CUMULATIVE[book] < global) book++;
  return { book: NAMES[book - 1], chapter: global - CUMULATIVE[book - 1] };
}

/** 하루 목표 = ⌈구간 장 수 / 목표 일수⌉ — 어드민 폼 미리보기용(생성 후 진실은 서버 응답). */
export function dailyGoalOf(totalChapters: number, targetDays: number): number {
  return Math.ceil(totalChapters / targetDays);
}

/** 종료일 = 시작일 + targetDays - 1 (포함). 입력·출력 모두 "YYYY-MM-DD" — UTC 산술이라 TZ 무관. */
export function challengeEndDate(startDate: string, targetDays: number): string {
  const [y, m, d] = startDate.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + targetDays - 1));
  return end.toISOString().slice(0, 10);
}

/** "창세기 ~ 요한계시록" / 단일 권이면 "시편" — 카드·어드민 테이블 범위 표기. */
export function formatRange(startBook: number, endBook: number): string {
  return startBook === endBook ? bookName(startBook) : `${bookName(startBook)} ~ ${bookName(endBook)}`;
}
