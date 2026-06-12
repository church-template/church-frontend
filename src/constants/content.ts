// 정적 페이지 콘텐츠·예배 시간·CTA 카피. 배포 시 이 파일만 교체(스펙 D4). 샘플 문구.
export const ABOUT = {
  title: "교회 소개",
  paragraphs: [
    "우리 교회는 말씀과 삶이 만나는 공동체를 지향합니다.",
    "지역과 함께 호흡하며 다음 세대를 세우는 일에 힘쓰고 있습니다.",
  ],
};

export const HISTORY = {
  title: "연혁",
  items: [
    { year: "2010", text: "교회 설립", desc: "작은 모임에서 시작해 첫 예배를 드렸습니다." },
    { year: "2015", text: "교육관 건축", desc: "다음 세대를 위한 배움의 공간을 마련했습니다." },
    { year: "2020", text: "지역 섬김 사역 확대", desc: "이웃과 함께하는 사역으로 지경을 넓혔습니다." },
  ],
};

export const VISION = {
  title: "비전",
  statement: "하나님을 사랑하고 이웃을 섬기는 교회",
  points: ["말씀 중심의 예배", "다음 세대 양육", "지역 사회 섬김"],
};

export const LOCATION = {
  title: "오시는 길",
  transit: ["지하철 ○○역 0번 출구 도보 5분", "버스 000·000 ○○정류장 하차"],
};

export interface WorshipService {
  name: string;
  time: string;
  place: string;
}
export const WORSHIP = { title: "예배 시간 안내" };
export const WORSHIP_SERVICES: WorshipService[] = [
  { name: "주일 1부 예배", time: "주일 09:00", place: "본당" },
  { name: "주일 2부 예배", time: "주일 11:00", place: "본당" },
  { name: "수요 예배", time: "수요일 19:30", place: "본당" },
  { name: "금요 기도회", time: "금요일 21:00", place: "본당" },
];

export const CTA_BAND = {
  heading: "처음 오셨나요?",
  primary: "새가족 안내",
  secondary: "오시는 길",
};

// 메인 사역 카드(스펙 2026-06-12 H4·H5) — VISION.points의 3축을 카드로 승격.
// 아이콘은 직렬화 가능한 키만 — lucide 컴포넌트 매핑은 MinistryCards가 담당.
export const MINISTRY = { title: "우리의 사역" };
export interface Ministry {
  key: "worship" | "nextgen" | "serving";
  title: string;
  desc: string;
}
export const MINISTRIES: Ministry[] = [
  { key: "worship", title: "말씀 중심의 예배", desc: "주일과 평일, 삶의 자리마다 말씀으로 예배합니다." },
  { key: "nextgen", title: "다음 세대 양육", desc: "영유아부터 청년까지 세대별 교육으로 신앙을 세웁니다." },
  { key: "serving", title: "지역 사회 섬김", desc: "지역과 이웃의 필요에 응답하는 섬김을 실천합니다." },
];

// 메인 데이터 섹션 타이틀·빈 상태 문구(가이드 13.2 빈 배열 처리) — 콘텐츠 하드코딩 금지(12장).
export const MAIN_SECTIONS = {
  sermons: { title: "최신 설교", empty: "등록된 설교가 없습니다" },
  notices: { title: "공지", empty: "등록된 공지가 없습니다" },
  events: { title: "다가오는 일정", empty: "등록된 일정이 없습니다" },
} as const;
