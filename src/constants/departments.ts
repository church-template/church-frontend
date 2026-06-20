// 공개 "사역(부서) 소개" 단일 출처 — 메인 페이지처럼 프론트 상수로 주입한다(하드코딩 금지, 가이드 12장).
// 백엔드 `department`(교인 정보관리·어드민)와 별개. 공개 인트로 페이지는 이 상수만으로 자립 동작한다.
// 히어로 미디어는 /public/dept/{slug}.jpg 관례의 placeholder(배포 시 교체) — 메인의 /hero.mp4와 동일.
import type { HeroMedia } from "@/hero/types";

export interface Department {
  slug: string; // URL 키(/departments/{slug}) — 백엔드 id와 무관, 프론트가 큐레이션
  name: string;
  leader?: string;
  description: string; // raw 마크다운 → MarkdownContent
  media: HeroMedia; // DeptHero placeholder
  caption: string[]; // 풀스크린 확장 후 등장 카피 — 줄 단위 배열
  children?: Department[]; // 하위부서(옵션)
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
  },
  {
    slug: "youth",
    name: "청년부",
    description:
      "대학생과 직장인 청년이 **예배와 교제**로 신앙의 뿌리를 내리는 공동체입니다.\n\n각자의 자리에서 그리스도의 제자로 살아가며, 진솔한 나눔과 깊이 있는 말씀으로 함께 성장합니다.",
    media: img("youth", "청년부"),
    caption: ["청년의 때에", "주를 만나다"],
  },
  {
    slug: "praise",
    name: "예배부",
    description:
      "찬양과 경배로 **예배를 섬기는** 사역팀 'Seed-씨앗'입니다.\n\n리드보컬과 악기, 음향·방송이 한 마음으로 성도들의 마음을 모아 하나님께 영광을 돌립니다.",
    media: img("praise", "예배부"),
    caption: ["온 맘 다해", "주를 찬양하라"],
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
