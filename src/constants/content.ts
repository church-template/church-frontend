// 정적 페이지 콘텐츠·예배 시간·CTA 카피. 배포 시 이 파일만 교체(스펙 D4). 샘플 문구.
import type { HeroMedia } from "@/hero/types";

// 소망 본문 세그먼트 — 의미 구절 자체를 상징색 글자로(괄호 표기 없이). color 없는 조각은 평문.
export interface HopeSegment {
  text: string;
  color?: "blue" | "green" | "red" | "orange";
}

const HOPE_BODY: HopeSegment[] = [
  { text: "하나님의 사랑", color: "blue" },
  { text: " 안에서, " },
  { text: "하나님이 만드신 이 세상", color: "green" },
  { text: " 가운데, " },
  { text: "예수 그리스도의 보혈", color: "red" },
  { text: "로 " },
  { text: "구원받은 성도들", color: "orange" },
  {
    text: "이 함께 모여 서로 사랑하고 섬기며, 지역사회와 세상을 향해 하나님의 사랑을 전하는 축복의 통로가 되기를 소망합니다.",
  },
];

export const ABOUT = {
  title: "소개 및 비전",
  statement: "함께함이 축복이 되는 교회",
  statementHighlight: "축복", // 대표문구에서 primary로 강조할 단어
  intro: [
    "은샘침례교회는 하나님과 함께함이 축복이 되는 교회입니다.",
    "은샘침례교회는 성도들과 함께함이 축복이 되는 교회입니다.",
  ],
  symbolismHeading: "로고에 담긴 네 가지 고백",
  symbolismLead:
    "로고를 감싸는 네 빛깔은 우리가 믿는 복음의 흐름입니다. 하나님의 사랑에서 시작해, 그분이 지으신 세상과 예수님의 보혈을 지나, 구원받은 성도에게로 이어집니다.",
  // 로고 상징색 — 색 자체가 신학적 상징(콘텐츠)이며 UI 브랜드 팔레트와 무관. 색 연출은 나중에.
  symbolism: [
    { color: "파랑색", title: "하나님", lines: ["전능하신 하나님의", "사랑과 은혜"] },
    {
      color: "초록색",
      title: "하나님이 만드신 세상",
      lines: ["하나님께서 창조하신", "아름다운 세상"],
    },
    {
      color: "빨강색",
      title: "예수 그리스도의 보혈",
      lines: ["우리를 구원하신", "예수님의 십자가 사랑"],
    },
    {
      color: "주황색",
      title: "구원받은 성도",
      lines: ["예수님을 믿고 구원받은", "하나님의 백성"],
    },
  ],
  hope: {
    heading: "우리의 소망",
    body: HOPE_BODY,
  },
  story: {
    heading: "우리의 이야기",
    paragraphs: [
      "은샘침례교회는 기독교한국침례회 소속으로 충청남도 예산군 삽교읍 수암산로 260에 위치한 교회입니다.",
      "2011년 하나님의 은혜와 인도하심 속에 개척된 이후, 하나님의 말씀을 중심으로 한 예배와 성도들의 헌신적인 섬김을 통해 지금의 공동체로 성장하게 되었습니다.",
      "우리 교회는 성경의 가르침을 바탕으로 예수 그리스도의 복음을 전하고, 성도들이 영적으로 성장할 수 있도록 돕는 것을 사명으로 삼고 있습니다. 또한 지역 사회를 섬기고 세계 선교에 동참함으로써 하나님의 나라를 확장하는 일에 힘쓰고 있습니다.",
    ],
  },
};

export interface HistoryItem {
  id: string; // 앵커(#id)·aria-labelledby·React key 전용 — 표시엔 쓰지 않는다
  year: string; // 표시 연월 (예: "2011년 4월")
  text: string; // 헤드라인
  desc: string; // 한 줄 설명
  details: string[]; // 세부 항목
  significance: string; // 의의 풀쿼트
  media?: HeroMedia; // 배경 미디어(placeholder, /public/history/{id}.jpg). 후일 교체
}

export interface HistoryContent {
  title: string;
  intro: string; // 인트로 한 줄(placeholder 카피 — 후일 수정)
  items: HistoryItem[];
}

export const HISTORY = {
  title: "연혁",
  intro: "2011년 봄, 사택의 작은 예배에서 시작된 은샘교회의 발자취입니다.",
  items: [
    {
      id: "2011-04",
      year: "2011년 4월",
      text: "개척예배",
      desc: "개척예배가 사택(태산아파트)에서 진행되었습니다.",
      details: [
        "홍성균 목사가 은샘교회를 개척·창립",
        "사택에서 첫 예배 진행",
        "소수의 성도들과 함께 교회의 기초를 세움",
        "기독교한국침례회 소속으로 시작",
      ],
      significance: "은샘교회 역사의 출발점이자 하나님의 부르심에 순종한 신앙의 시작",
      media: { type: "image", src: "/history/2011-04.jpg", alt: "" },
    },
    {
      id: "2011-05",
      year: "2011년 5월",
      text: "창립예배",
      desc: "태산아파트 옆 상가에서 예배가 진행되었습니다.",
      details: [
        "정식 창립예배 및 교회 설립",
        "태산아파트 상가 건물로 예배 장소 이전",
        "체계적인 교회 운영 시스템 구축",
        "지역 주민들에게 교회 존재 알림",
      ],
      significance: "공식적인 교회 공동체로서의 첫걸음을 내딛은 중요한 순간",
      media: { type: "image", src: "/history/2011-05.jpg", alt: "" },
    },
    {
      id: "2015",
      year: "2015년",
      text: "교회 확장",
      desc: "주방을 허물고 교회를 확장시켰습니다.",
      details: [
        "기존 주방 공간을 허물어 예배 공간 확대",
        "더 많은 성도들을 수용할 수 있는 공간 마련",
        "교회 성장에 따른 필요한 시설 개선",
        "예배와 교제 공간의 효율적 활용",
      ],
      significance: "교회 성장에 발맞춘 공간 확대로 많은 성도들을 품을 수 있게 됨",
      media: { type: "image", src: "/history/2015.jpg", alt: "" },
    },
    {
      id: "2016",
      year: "2016년",
      text: "1층 주방·쉼터 조성",
      desc: "1층 공간을 새로운 주방과 쉼터 공간으로 조성했습니다.",
      details: [
        "1층에 새로운 주방 시설 설치",
        "성도들을 위한 쉼터 공간 조성",
        "교제와 식사를 위한 편의시설 완비",
        "다양한 교회 행사를 위한 공간 활용",
      ],
      significance: "교제와 섬김을 위한 공간 마련으로 공동체 활성화",
      media: { type: "image", src: "/history/2016.jpg", alt: "" },
    },
    {
      id: "2021",
      year: "2021년",
      text: "현재 위치로 이전",
      desc: "교회를 이전하여 새로운 출발을 하였습니다.",
      details: [
        "충청남도 예산군 삽교읍 수암산로 260으로 교회 이전",
        "더 넓고 쾌적한 예배 공간 확보",
        "주차 시설 및 편의 시설 개선",
        "지역 접근성 향상으로 더 많은 성도들 섬김",
      ],
      significance: "교회 성장과 발전을 위한 새로운 터전 마련",
      media: { type: "image", src: "/history/2021.jpg", alt: "" },
    },
    {
      id: "2023",
      year: "2023년",
      text: "교회 성장",
      desc: "다양한 연령층의 성도들이 함께하는 건강한 교회.",
      details: [
        "다양한 연령층의 성도들이 함께하는 공동체 형성",
        "체계적인 사역 부서 운영(학생부·청년부·예배부·남선교회·여선교회)",
        "건강한 교회, 건강한 성도",
        "지속적인 신앙 성장과 교제 프로그램 운영",
      ],
      significance:
        "하나님의 은혜 가운데 성숙한 교회 공동체로 발전, 모든 세대가 함께하는 축복의 공간",
      media: { type: "image", src: "/history/2023.jpg", alt: "" },
    },
    {
      id: "2025",
      year: "2025년",
      text: "디지털 사역 확장",
      desc: "온라인과 오프라인을 연결하는 새로운 시작.",
      details: [
        "교회 웹사이트 개설로 온라인 소통 강화",
        "실시간 예배 유튜브 주소 공유",
        "디지털 주보 및 온라인 공지사항 서비스",
        "소셜 미디어를 통한 젊은 세대와의 소통",
      ],
      significance:
        "디지털 시대에 맞는 새로운 소통 방식으로 더 많은 사람들에게 복음을 전할 수 있게 됨",
      media: { type: "image", src: "/history/2025.jpg", alt: "" },
    },
  ],
} satisfies HistoryContent;

export const VISION = {
  title: "비전",
  statement: "함께함이 축복이 되는 교회",
  points: [
    "예배와 교회가 중심이 되는 신앙생활",
    "성경 중심의 설교와 목회",
    "성도들과의 따뜻한 교제와 돌봄",
    "지역 사회를 섬기는 교회",
    "다음 세대를 세우는 교육 사역",
    "선교와 전도에 힘쓰는 교회",
  ],
};

// 목회자 인사말 페이지 — 소개·인사말·약력·목회 철학. 사진은 자산 준비 후 image에 주입.
export type PastorPhilosophyKey =
  | "worship"
  | "bible"
  | "fellowship"
  | "community"
  | "nextgen"
  | "mission";

export const PASTOR = {
  title: "목회자 인사말",
  name: "홍성균",
  position: "담임목사",
  degree: "한국침례신학대학교 석사 (M.Div)",
  // 포트레이트 자산 — 미준비 시 null(플레이스홀더 폴백). 준비되면 { src, alt } 주입.
  image: null as { src: string; alt: string } | null,
  // 다크 밴드 핵심 인용 1문장 — 컴포넌트 발췌 금지(콘텐츠 하드코딩 방지).
  pullQuote:
    "은샘에서 함께함이 축복이 되는 행복한 신앙의 삶을 시작하시길 주님의 이름으로 축원합니다.",
  intro:
    "홍성균 목사님은 은샘침례교회를 섬기고 있습니다. 성경적인 설교와 따뜻한 목회로 성도들의 영적 성장을 돕고 있으며, 교회와 지역 사회를 위한 다양한 사역을 이끌고 있습니다.",
  greeting: [
    "하나님의 은혜와 사랑으로 시작된 은샘교회에 오심을 주님의 이름으로 축복합니다. 사람의 계획보다 더 큰 계획을 가지고 계신 하나님께서 덕산에 작은 교회를 통하여 하나님의 일을 시작하셨고, 지금까지 도우심으로 지금 이곳에 은샘교회가 여전히 존재합니다.",
    "지금까지 지키신 에벤에셀의 하나님께서 앞으로도 지키시고 도우시고 복주시며 이곳을 들고 나는 모든 이들을 축복하실 것입니다. 은샘에서 함께함이 축복이 되는 행복한 신앙의 삶을 시작하시고 경험하시고 누리시길 주님의 이름으로 축원합니다.",
  ],
  credentials: {
    heading: "학력 및 경력",
    items: [
      "한국침례신학대학교 신학과 졸업",
      "한국침례신학대학교 목회신학대학원 석사 (M.Div)",
      "2011년 은샘침례교회 개척 및 담임목사 취임",
      "기독교한국침례회 소속",
      "한국 베트남 신학교 강사",
    ],
  },
  philosophy: {
    heading: "목회 철학",
    // 아이콘 매핑용 key 부여(컴포넌트가 매핑, 상수는 직렬화 키만 — MinistryCards 선례).
    items: [
      { key: "worship", text: "예배와 교회가 중심이 되는 신앙생활" },
      { key: "bible", text: "성경 중심의 설교와 목회" },
      { key: "fellowship", text: "성도들과의 따뜻한 교제와 돌봄" },
      { key: "community", text: "지역 사회를 섬기는 교회" },
      { key: "nextgen", text: "다음 세대를 세우는 교육 사역" },
      { key: "mission", text: "선교와 전도에 힘쓰는 교회" },
    ] satisfies { key: PastorPhilosophyKey; text: string }[],
  },
};

// 교회 사진(정적 시설 사진) — public/photos/{interior,exterior} 정적 에셋을 그룹별로 주입.
// 분류·경로·alt는 상수에서만(하드코딩 금지). alt는 편집 쉬운 인덱스 기본값.
export type ChurchPhoto = { src: string; alt: string };
export type PhotoGroup = { key: string; title: string; photos: ChurchPhoto[] };

export const CHURCH_PHOTOS: { title: string; empty: string; groups: PhotoGroup[] } = {
  title: "교회 사진",
  empty: "교회 사진을 준비 중입니다.",
  groups: [
    {
      key: "interior",
      title: "교회 내부",
      photos: [
        { src: "/photos/interior/in_1.jpg", alt: "교회 내부 1" },
        { src: "/photos/interior/in_2.jpg", alt: "교회 내부 2" },
        { src: "/photos/interior/in_3.jpg", alt: "교회 내부 3" },
        { src: "/photos/interior/in_4.jpg", alt: "교회 내부 4" },
        { src: "/photos/interior/in_5.jpg", alt: "교회 내부 5" },
        { src: "/photos/interior/in_6.jpeg", alt: "교회 내부 6" },
      ],
    },
    {
      key: "exterior",
      title: "교회 외부",
      photos: [
        { src: "/photos/exterior/out_1.jpg", alt: "교회 외부 1" },
        { src: "/photos/exterior/out_2.jpg", alt: "교회 외부 2" },
        { src: "/photos/exterior/out_3.jpeg", alt: "교회 외부 3" },
        { src: "/photos/exterior/out_4.jpg", alt: "교회 외부 4" },
        { src: "/photos/exterior/out_5.jpeg", alt: "교회 외부 5" },
      ],
    },
  ],
};

export const LOCATION = {
  title: "오시는 길",
  lead: "은샘교회를 찾아오시는 길을 안내합니다.",
  // 약도(그림 지도). 실제 약도 이미지를 public/location/ 에 넣고 src만 교체하면 된다(단일 교체점).
  map: { src: "/location/map-placeholder.svg", alt: "은샘교회 약도" },
  directionsHeading: "찾아오는 방법",
  directions: [
    {
      key: "car",
      title: "자가용",
      lines: [
        "교회 주차 공간이 마련되어 있습니다.",
        "내비게이션: '은샘교회' 또는 '수암산로 260' 검색",
      ],
    },
    // 대중교통 실제 노선 문구는 교회가 채운다(placeholder).
    { key: "transit", title: "대중교통", lines: ["버스 노선 정보 준비 중입니다."] },
  ],
};

export interface WorshipService {
  name: string;
  time: string;
  place: string;
}
export const WORSHIP = { title: "예배 시간 안내" };
export const WORSHIP_SERVICES: WorshipService[] = [
  { name: "새벽예배", time: "월~토 오전 5:30", place: "본당" },
  { name: "주일예배", time: "주일 오전 11:00", place: "본당" },
  { name: "수요예배", time: "수요일 오후 7:20", place: "본당" },
  { name: "학생·청년예배", time: "토요일 오전 11:00", place: "본당" },
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
