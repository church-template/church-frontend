// 공개 "사역(부서) 소개" 단일 출처 — 메인 페이지처럼 프론트 상수로 주입한다(하드코딩 금지, 가이드 12장).
// 백엔드 `department`(교인 정보관리·어드민)와 별개. 공개 인트로 페이지는 이 상수만으로 자립 동작한다.
// 히어로 미디어는 /public/dept/{slug}.jpg 관례의 placeholder(배포 시 교체) — 메인의 /hero.mp4와 동일.
import type { HeroMedia } from "@/hero/types";

export interface DeptFeature {
  icon: string; // 직렬화 키 — 컴포넌트에서 lucide 아이콘으로 매핑(상수는 직렬화 가능 값만)
  title: string;
  desc: string;
}

export interface DeptInfoItem {
  label: string;
  value: string;
}

export interface DeptProgram {
  name: string;
  desc: string;
}

export interface DeptPhoto {
  src: string;
  alt: string;
}

export interface Department {
  slug: string; // URL 키(/departments/{slug}) — 백엔드 id와 무관, 프론트가 큐레이션
  name: string;
  leader?: string;
  description: string; // raw 마크다운 → MarkdownContent
  media: HeroMedia; // DeptHero placeholder
  caption: string[]; // 풀스크린 확장 후 등장 카피 — 줄 단위 배열
  children?: Department[]; // 하위부서(옵션)
  // 부서 상세 보강 섹션(모두 옵션 — 미기입 부서는 기존과 동일하게 렌더)
  intro?: { heading: string; lead: string };
  features?: DeptFeature[];
  info?: DeptInfoItem[];
  activities?: string[];
  programs?: DeptProgram[];
  gallery?: DeptPhoto[];
  invite?: { heading: string; body: string };
}

const FALLBACK_THUMB = "/dept/default.jpg";

// placeholder는 색상 jpg 타일(public/dept/{slug}.jpg, 1600×900) — 배포 시 실제 사진으로 교체.
const img = (slug: string, name: string): HeroMedia => ({
  type: "image",
  src: `/dept/${slug}.jpg`,
  alt: name,
});

// 사역 부서 — 메가메뉴 "사역" 카테고리와 동일 구성(학생부·청년부·예배부·남선교회·여선교회).
// 담당자(leader)는 실제 인명이 확정되기 전까지 비워 둔다(상세 페이지가 없으면 '인도' 줄을 생략).
// 하위 부서는 두지 않는다 — 은샘교회는 학생부가 단일 부서. 필요 시 어드민 CRUD로 추가한다.
export const DEPARTMENTS: Department[] = [
  {
    slug: "student",
    name: "학생부",
    description:
      "중·고등학생이 **말씀과 예배** 안에서 건강하게 자라가는 공동체입니다.\n\n매주 토요일 오전 11시, 학생·청년이 함께 예배하며 찬양과 말씀, 소그룹 나눔으로 모입니다.",
    media: img("student", "학생부"),
    caption: ["말씀으로 자라는", "다음 세대"],
    intro: {
      heading: "학생부 소개",
      lead: "중·고등학생들이 하나님의 사랑 안에서 건강하게 성장할 수 있도록 돕는 사역입니다. 또래 친구들과 함께 신앙을 배우고 나누며, 꿈과 비전을 발견해 나가세요.",
    },
    features: [
      { icon: "book", title: "청소년 신앙 교육", desc: "성경 중심의 체계적 신앙 교육" },
      { icon: "users", title: "또래 교제", desc: "건전한 친구 관계와 공동체 의식" },
      { icon: "sparkles", title: "창의적 활동", desc: "재미있는 활동을 통한 전인적 성장" },
    ],
    info: [
      { label: "담당자", value: "학생부 담당 선생님" },
      { label: "모임 시간", value: "매주 토요일 오전 11시 (학생·청년예배)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 학생부실" },
    ],
    activities: [
      "토요일 학생 예배 및 성경공부",
      "여름·겨울 수련회 참가",
      "찬양과 율동 활동",
      "배드민턴 등 재미있는 활동",
    ],
    programs: [
      { name: "여름 수련회", desc: "자연 속에서 하나님과 더 가까워지는 시간" },
      { name: "겨울 수련회", desc: "한 해를 마무리하며 새로운 다짐을 세우는 시간" },
      { name: "찬양 경연대회", desc: "학생들의 재능을 발휘하는 특별한 무대" },
      { name: "배드민턴 프로그램", desc: "학생 예배 후에 하는 재밌는 배드민턴 운동" },
    ],
    gallery: [
      { src: "/dept/student/1.jpg", alt: "학생부 활동 사진 1" },
      { src: "/dept/student/2.jpg", alt: "학생부 활동 사진 2" },
      { src: "/dept/student/3.jpg", alt: "학생부 활동 사진 3" },
      { src: "/dept/student/4.jpg", alt: "학생부 활동 사진 4" },
    ],
    invite: {
      heading: "학생부에서 함께해요",
      body: "중·고등학생 친구들! 새로운 친구들과 만나고, 재미있는 활동을 통해 신앙을 배워나가세요. 또래 친구들과 함께 하나님의 사랑을 경험하며, 언제든지 편안하게 참여하실 수 있습니다.",
    },
  },
  {
    slug: "youth",
    name: "청년부",
    description:
      "대학생과 직장인 청년이 **예배와 교제**로 신앙의 뿌리를 내리는 공동체입니다.\n\n각자의 자리에서 그리스도의 제자로 살아가며, 진솔한 나눔과 깊이 있는 말씀으로 함께 성장합니다.",
    media: img("youth", "청년부"),
    caption: ["청년의 때에", "주를 만나다"],
    intro: {
      heading: "청년부 소개",
      lead: "대학생과 직장인 청년들이 삶의 자리에서 그리스도의 제자로 살아가도록 돕는 사역입니다. 진솔한 나눔과 깊이 있는 말씀 안에서 함께 신앙의 뿌리를 내려가세요.",
    },
    features: [
      { icon: "book", title: "말씀 훈련", desc: "청년의 눈높이에 맞춘 깊이 있는 성경 공부" },
      { icon: "users", title: "소그룹 교제", desc: "진솔한 나눔으로 서로를 세우는 공동체" },
      { icon: "sparkles", title: "비전과 소명", desc: "삶의 자리에서 부르심을 발견하는 시간" },
    ],
    info: [
      { label: "담당자", value: "청년부 담당 교역자" },
      { label: "모임 시간", value: "매주 토요일 오전 11시 (학생·청년예배)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 청년부실" },
    ],
    activities: [
      "토요일 청년 예배 및 말씀 나눔",
      "주중 소그룹 모임",
      "청년 수련회·비전 캠프",
      "지역 섬김과 봉사 활동",
    ],
    programs: [
      { name: "청년 수련회", desc: "일상을 떠나 예배와 교제에 집중하는 시간" },
      { name: "비전 캠프", desc: "삶의 방향과 소명을 함께 찾는 시간" },
      { name: "제자 훈련", desc: "말씀 안에서 그리스도의 제자로 세워지는 과정" },
      { name: "청년 찬양의 밤", desc: "찬양으로 마음을 모아 하나님께 드리는 예배" },
    ],
    gallery: [
      { src: "/dept/youth/1.jpg", alt: "청년부 활동 사진 1" },
      { src: "/dept/youth/2.jpg", alt: "청년부 활동 사진 2" },
      { src: "/dept/youth/3.jpg", alt: "청년부 활동 사진 3" },
      { src: "/dept/youth/4.jpg", alt: "청년부 활동 사진 4" },
    ],
    invite: {
      heading: "청년부에서 함께해요",
      body: "이제 막 신앙을 시작한 청년도, 오랜 믿음의 청년도 환영합니다. 같은 시대를 살아가는 또래들과 예배하고 교제하며, 삶의 자리에서 주님을 만나가세요. 언제든지 편안하게 찾아오세요.",
    },
  },
  {
    slug: "praise",
    name: "예배부",
    description:
      "찬양과 경배로 **예배를 섬기는** 사역팀 'Seed-씨앗'입니다.\n\n리드보컬과 악기, 음향·방송이 한 마음으로 성도들의 마음을 모아 하나님께 영광을 돌립니다.",
    media: img("praise", "예배부"),
    caption: ["온 맘 다해", "주를 찬양하라"],
    intro: {
      heading: "예배부 소개",
      lead: "찬양과 경배로 예배를 섬기는 사역팀 'Seed-씨앗'입니다. 리드보컬·악기·음향·방송이 한마음으로 성도들의 마음을 모아 하나님께 영광을 올려드립니다.",
    },
    features: [
      { icon: "sparkles", title: "찬양 인도", desc: "리드보컬과 싱어가 예배의 흐름을 이끕니다" },
      { icon: "users", title: "연주팀", desc: "건반·기타·베이스·드럼이 함께 만드는 찬양" },
      { icon: "book", title: "음향·방송", desc: "보이지 않는 곳에서 예배를 든든히 섬깁니다" },
    ],
    info: [
      { label: "담당자", value: "예배부 찬양 인도자" },
      { label: "모임 시간", value: "매주 주일 오전 9시 30분 (예배 전 연습)" },
      { label: "연락처", value: "041-337-2298" },
      { label: "모임 장소", value: "은샘침례교회 본당·음향실" },
    ],
    activities: [
      "주일 예배 찬양 인도",
      "정기 찬양 연습",
      "특별 예배·절기 찬양 준비",
      "음향·영상 방송 섬김",
    ],
    programs: [
      { name: "찬양의 밤", desc: "온 성도가 함께 드리는 찬양 예배" },
      { name: "절기 특별 찬양", desc: "부활절·성탄절 등 절기를 위한 찬양 준비" },
      { name: "워십 워크숍", desc: "찬양과 연주 실력을 함께 다듬는 시간" },
      { name: "신입 팀원 훈련", desc: "새로 섬기는 지체를 위한 기초 훈련" },
    ],
    gallery: [
      { src: "/dept/praise/1.jpg", alt: "예배부 활동 사진 1" },
      { src: "/dept/praise/2.jpg", alt: "예배부 활동 사진 2" },
      { src: "/dept/praise/3.jpg", alt: "예배부 활동 사진 3" },
      { src: "/dept/praise/4.jpg", alt: "예배부 활동 사진 4" },
    ],
    invite: {
      heading: "예배부에서 함께 섬겨요",
      body: "찬양과 연주, 음향과 방송으로 예배를 섬기고 싶은 분들을 기다립니다. 재능보다 중요한 것은 예배자의 마음입니다. 함께 온 맘 다해 주님을 찬양하며 섬김의 자리로 나아가세요.",
    },
  },
  {
    slug: "men",
    name: "남선교회",
    description:
      "남성 성도들이 **섬김과 봉사**로 교회를 세워가는 공동체입니다.\n\n예배와 선교, 교회 시설 섬김과 형제 교제로 가정과 교회의 영적 리더로 함께 성장합니다.",
    media: img("men", "남선교회"),
    caption: ["섬김으로 세우는", "믿음의 공동체"],
  },
  {
    slug: "women",
    name: "여선교회",
    description:
      "여성 성도들이 **기도와 나눔**으로 함께하는 공동체입니다.\n\n영성 훈련과 사랑의 봉사, 따뜻한 자매애로 가정과 교회를 섬기며 아름답게 성장합니다.",
    media: img("women", "여선교회"),
    caption: ["기도로 함께하는", "동역의 자리"],
  },
];

// 목록·상세 페이지 카피.
export const DEPT_PAGE = {
  eyebrow: "사역",
  title: "사역 안내",
  empty: "등록된 사역이 없습니다.",
  leaderLabel: "인도",
  subHeading: "하위 부서",
} as const;

// 상세 보강 섹션 헤딩 — 하드코딩 금지(컴포넌트가 아닌 상수에서 주입).
export const DEPT_SECTIONS = {
  info: "알림 사항",
  activities: "주요 활동",
  programs: "특별 프로그램",
  gallery: "활동 사진",
} as const;

// 카드 16:9 썸네일 — 영상이면 poster, 없으면 기본 에셋. 순수 함수(테스트 용이).
export function thumbnailOf(media: HeroMedia): string {
  return media.type === "image" ? media.src : (media.poster ?? FALLBACK_THUMB);
}

// slug로 부서 조회(하위까지 깊이 탐색). 상세 페이지·정적 파라미터 생성에서 사용.
export function findDepartment(
  slug: string,
  list: Department[] = DEPARTMENTS,
): Department | undefined {
  for (const d of list) {
    if (d.slug === slug) {
      return d;
    }
    if (d.children) {
      const found = findDepartment(slug, d.children);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

// 모든 부서 slug(하위 포함) — generateStaticParams·검증에서 사용.
export function allDepartmentSlugs(list: Department[] = DEPARTMENTS): string[] {
  return list.flatMap((d) => [d.slug, ...allDepartmentSlugs(d.children ?? [])]);
}
