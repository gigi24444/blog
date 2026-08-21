# 자동화 블로그

Astro 정적 사이트 + Claude API 글 자동 생성 + GitHub Actions 스케줄링 + Vercel 배포로 구성된 완전 자동화 블로그입니다.

## 구조

- `src/content/blog/*.md` — 글 (frontmatter: title, description, pubDate, tags, draft)
- `src/content.config.ts` — 글 스키마 정의 (SEO 메타데이터의 단일 소스)
- `src/pages/rss.xml.js`, `@astrojs/sitemap` — RSS/사이트맵 자동 생성
- `scripts/generate-post.mjs` — Claude API로 글 1편을 생성해 `src/content/blog/`에 저장
- `scripts/topics.json` — 다룰 주제 목록 (직접 채워야 함)
- `scripts/distribute.mjs` — 새 글을 외부 채널(현재 Discord 웹훅 예시)에 알림
- `.github/workflows/auto-publish.yml` — 주기적으로 글 생성 → 커밋 → push
- `src/components/AdSlot.astro`, `Sidebar.astro` — Google AdSense 광고 단위 (홈/목록 상단 배너, 글 본문 상단, 사이드바)

## 1. 로컬 개발

```bash
npm install
cp .env.example .env   # ANTHROPIC_API_KEY 채워넣기
npm run dev             # http://localhost:4321
```

## 2. 주제 채우기

`scripts/topics.json`의 `topics` 배열에 항목을 추가하세요:

```json
{
  "topics": [
    { "topic": "재택근무 생산성 팁", "keywords": ["재택근무", "생산성", "루틴"] },
    { "topic": "초보자를 위한 예산 관리법", "keywords": ["가계부", "저축"] }
  ],
  "nextIndex": 0
}
```

`nextIndex`는 스크립트가 라운드로빈으로 자동 갱신합니다. 목록을 다 소진하면 처음부터 다시 순환합니다.

## 3. 글 수동 생성 테스트

```bash
npm run generate
```

`ANTHROPIC_API_KEY`가 없거나 `topics.json`이 비어 있으면 명확한 에러 메시지와 함께 종료됩니다.

## 4. 빌드/미리보기

```bash
npm run build
npm run preview
```

## 5. 자동화 배포 연결 (계정 작업 필요 — 아래는 사용자가 직접 진행)

1. GitHub 저장소 생성 후 이 프로젝트를 push
   ```bash
   git init
   git add .
   git commit -m "init: auto blog scaffold"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. GitHub 저장소 **Settings → Secrets and variables → Actions**에서
   - Secret: `ANTHROPIC_API_KEY`
   - Secret(선택): `DISCORD_WEBHOOK_URL`
   - Variable(선택): `SITE_URL`
   등록
3. [vercel.com](https://vercel.com)에서 New Project → 방금 만든 GitHub 저장소 Import (Framework Preset: Astro 자동 인식)
4. Vercel 프로젝트의 Environment Variables에도 `SITE_URL` 등을 동일하게 등록 (선택)
5. 이제 `.github/workflows/auto-publish.yml`의 cron 스케줄에 따라 매일 자동으로 글이 생성/커밋/push되고, push 즉시 Vercel이 자동 빌드·배포합니다.

## 6. 발행 주기 변경

`.github/workflows/auto-publish.yml`의 `cron` 값을 수정하세요 (예: 하루 2번 → `"0 0,12 * * *"`). [crontab.guru](https://crontab.guru)에서 표현식을 검증할 수 있습니다. GitHub Actions 저장소 화면의 **Actions → Auto publish → Run workflow**로 즉시 수동 실행도 가능합니다.

## 7. SNS 채널 추가

`scripts/distribute.mjs`에 `distributeToXxx(post)` 함수를 추가하고 목록에 연결하세요. 트위터(X) 등 OAuth 서명이 필요한 채널은 전용 라이브러리(예: `twitter-api-v2`) 설치가 필요합니다.

## 8. Google AdSense 광고

현재 홈/글 목록 상단 배너, 글 본문 상단(in-article), 목록·상세 페이지 사이드바에 광고 자리가 마련되어 있습니다. `PUBLIC_ADSENSE_CLIENT`가 비어 있으면 실제 광고 대신 점선 자리표시자가 표시되므로, 승인 전에도 레이아웃을 그대로 확인할 수 있습니다.

1. [Google AdSense](https://www.google.com/adsense/)에 사이트를 등록하고 심사를 신청하세요 (심사에는 실제 배포된 사이트 URL이 필요합니다 — Vercel 배포 이후 진행).
2. 승인 후 발급받는 게시자 ID(`ca-pub-...`)를 `.env`의 `PUBLIC_ADSENSE_CLIENT`에, 그리고 GitHub/Vercel의 환경변수에도 동일하게 등록하세요.
3. AdSense 관리 페이지에서 광고 단위(배너/사이드바/인아티클)를 각각 만들고, 발급된 슬롯 ID를 `PUBLIC_ADSENSE_SLOT_BANNER`, `PUBLIC_ADSENSE_SLOT_SIDEBAR`, `PUBLIC_ADSENSE_SLOT_IN_ARTICLE`에 채워 넣으세요.
4. 재배포하면 자리표시자 대신 실제 광고가 노출됩니다. 다른 위치에 광고를 추가하려면 `<AdSlot slot={...} />`를 원하는 페이지/컴포넌트에 추가하면 됩니다.
