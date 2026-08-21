import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOPICS_PATH = path.join(__dirname, "topics.json");
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const MODEL = "claude-sonnet-5";

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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function nextTopic() {
  const state = JSON.parse(readFileSync(TOPICS_PATH, "utf8"));
  const topics = state.topics ?? [];
  if (topics.length === 0) {
    console.error(
      `scripts/topics.json 의 "topics" 배열이 비어 있습니다.\n` +
        `자동 생성을 시작하려면 { "topic": "...", "keywords": ["..."] } 형태로 최소 1개 이상 채워주세요.`
    );
    process.exit(1);
  }
  const index = (state.nextIndex ?? 0) % topics.length;
  const topic = topics[index];
  state.nextIndex = (index + 1) % topics.length;
  writeFileSync(TOPICS_PATH, JSON.stringify(state, null, 2) + "\n");
  return topic;
}

async function generatePost(topic) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다. .env.example을 참고해 .env를 만들어주세요.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const keywordHint = topic.keywords?.length ? ` 관련 키워드: ${topic.keywords.join(", ")}.` : "";

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content:
          `다음 주제로 한국어 블로그 글을 작성해줘: "${topic.topic}".${keywordHint}\n\n` +
          `요구사항:\n` +
          `- 사람이 읽기 좋은 자연스러운 문체, 800~1300자 분량의 본문(마크다운, 소제목 포함)\n` +
          `- SEO에 적합한 제목과 160자 이내의 메타 설명\n` +
          `- 관련 태그 3~5개\n\n` +
          `아래 JSON 스키마와 정확히 일치하는 JSON만 출력해. 다른 설명이나 코드블록 표시 없이 순수 JSON만:\n` +
          `{"title": string, "description": string, "tags": string[], "body": string}`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(jsonText);
}

function writePostFile(post) {
  mkdirSync(BLOG_DIR, { recursive: true });
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const slug = `${dateStr}-${slugify(post.title)}`;
  const filePath = path.join(BLOG_DIR, `${slug}.md`);

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.description)}`,
    `pubDate: ${dateStr}`,
    `tags: ${JSON.stringify(post.tags ?? [])}`,
    `draft: false`,
    "---",
    "",
    post.body,
    "",
  ].join("\n");

  writeFileSync(filePath, frontmatter);
  console.log(`글 생성 완료: ${path.relative(ROOT, filePath)}`);
  return filePath;
}

const topic = nextTopic();
console.log(`선택된 주제: ${topic.topic}`);
const post = await generatePost(topic);
writePostFile(post);
