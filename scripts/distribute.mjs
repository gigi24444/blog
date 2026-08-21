import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");

loadDotEnv(path.join(ROOT, ".env"));

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function latestPost() {
  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) return null;
  files.sort();
  const file = files[files.length - 1];
  const raw = readFileSync(path.join(BLOG_DIR, file), "utf8");
  const title = raw.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? file;
  const description = raw.match(/^description:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
  const slug = file.replace(/\.md$/, "");
  return { title, description, slug };
}

async function distributeToDiscord(post) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.log("[distribute] DISCORD_WEBHOOK_URL 미설정 — Discord 배포 건너뜀");
    return;
  }
  const siteUrl = process.env.SITE_URL || "https://example.com";
  const url = `${siteUrl.replace(/\/$/, "")}/blog/${post.slug}/`;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `📝 새 글: **${post.title}**\n${post.description}\n${url}` }),
  });
  if (!res.ok) {
    console.error(`[distribute] Discord 전송 실패: ${res.status} ${await res.text()}`);
  } else {
    console.log("[distribute] Discord 전송 완료");
  }
}

// 새 채널을 추가하려면 여기에 distributeToXxx(post) 함수를 만들고 아래 목록에 추가하세요.
// 예: 트위터(X)는 OAuth 서명이 필요해 별도 라이브러리(twitter-api-v2 등) 설치가 필요합니다.
const post = latestPost();
if (!post) {
  console.log("[distribute] 발행할 글이 없습니다.");
  process.exit(0);
}

await distributeToDiscord(post);
