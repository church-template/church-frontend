This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 개발 규약 (요약)

자세한 규칙은 [`CLAUDE.md`](CLAUDE.md) · [`docs/church-frontend-guide.md`](docs/church-frontend-guide.md) · [`.claude/rules/DESIGN.md`](.claude/rules/DESIGN.md) 참조.

**데이터 패칭 경계** (가이드 15.1)

- 공개 페이지(메인·설교·공지·일정·부서·주보): **서버 컴포넌트 `fetch` + ISR**. TanStack Query 미사용.
- 회원·어드민(갤러리·내 정보): **클라이언트 + TanStack Query + `authFetch`**.
- 클라 상태는 Zustand(토큰·member 스냅샷), 폼은 react-hook-form + zod. 서버 데이터를 Zustand에 복제하지 않는다.

**설정 분리**

- 환경마다 다른 값만 `.env`(`NEXT_PUBLIC_API_BASE`). 교회 고유값·콘텐츠는 `src/constants/`(매직스트링 금지, env 아님).
- 색·간격·타이포는 DESIGN.md 토큰 참조(hex·px 인라인 금지).

> ⚠️ 이 프로젝트는 Next.js 16 — 코드 작성 전 `node_modules/next/dist/docs/`를 확인한다([AGENTS.md](AGENTS.md)).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

<!-- AUTO-VERSION-SECTION: DO NOT EDIT MANUALLY -->
## 최신 버전 : v0.1.67 (2026-07-17)

[전체 버전 기록 보기](CHANGELOG.md)
