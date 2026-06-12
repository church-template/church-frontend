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
export const DEPARTMENTS: Department[] = [
  {
    slug: "student",
    name: "학생부",
    leader: "김믿음 전도사",
    description:
      "중·고등학생이 **말씀과 예배** 안에서 함께 자라가는 공동체입니다.\n\n매주 토요일 오후, 찬양과 말씀 그리고 소그룹 나눔으로 모입니다.",
    media: img("student", "학생부"),
    caption: ["말씀으로 자라는", "다음 세대"],
    children: [
      {
        slug: "middle",
        name: "중등부",
        description: "중학생을 위한 예배와 교육 공동체입니다.",
        media: img("middle", "중등부"),
        caption: ["함께 걷는", "믿음의 첫걸음"],
      },
      {
        slug: "high",
        name: "고등부",
        description: "고등학생을 위한 예배와 교육 공동체입니다.",
        media: img("high", "고등부"),
        caption: ["꿈을 품은", "청소년의 자리"],
      },
    ],
  },
  {
    slug: "youth",
    name: "청년부",
    leader: "이소망 목사",
    description: "청년들이 **예배와 교제**로 신앙의 뿌리를 내리는 공동체입니다.",
    media: img("youth", "청년부"),
    caption: ["청년의 때에", "주를 만나다"],
  },
  {
    slug: "praise",
    name: "예배부",
    leader: "박찬양 간사",
    description: "찬양과 경배로 **예배를 섬기는** 사역팀입니다.",
    media: img("praise", "예배부"),
    caption: ["온 맘 다해", "주를 찬양하라"],
  },
  {
    slug: "men",
    name: "남선교회",
    leader: "정충성 장로",
    description: "남성 성도들이 **섬김과 봉사**로 교회를 세워가는 공동체입니다.",
    media: img("men", "남선교회"),
    caption: ["섬김으로 세우는", "믿음의 공동체"],
  },
  {
    slug: "women",
    name: "여선교회",
    leader: "최은혜 권사",
    description: "여성 성도들이 **기도와 나눔**으로 함께하는 공동체입니다.",
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
