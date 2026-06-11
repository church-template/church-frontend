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
    { year: "2010", text: "교회 설립" },
    { year: "2015", text: "교육관 건축" },
    { year: "2020", text: "지역 섬김 사역 확대" },
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
