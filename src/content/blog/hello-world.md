---
title: "첫 번째 글: 자동화 블로그를 시작합니다"
description: "이 블로그는 Claude API로 글을 자동 생성하고, GitHub Actions로 주기적으로 발행됩니다."
pubDate: 2026-08-21
tags: ["소개"]
draft: false
---

이 글은 자동화 파이프라인이 정상 동작하는지 확인하기 위한 예시 글입니다.

- 글 생성: `scripts/generate-post.mjs` (Claude API)
- 자동 발행: GitHub Actions cron
- 배포: Vercel

`scripts/topics.json`에 주제를 채운 뒤 `npm run generate`를 실행하면 이 글 옆에 새 글이 쌓입니다.
