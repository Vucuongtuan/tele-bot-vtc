import type { Article } from "./types.js";

const categories = [
  "Properties Opportunity", "Watches", "Technology", "Architecture", "Sports & Esports",
  "Photograph", "Music", "Beauty", "Cuisine", "Fashion", "Automobile", "Long Form",
  "Environmental Movement", "WWK Video", "WWK News", "Hospitality Business News",
  "W Coffee Talk", "Inspiration Journey", "Tips & Advice", "The Art Corner", "Explore",
  "Enjoy", "Jewelry", "WWK's Choice", "The Luxe Journal",
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Converts the common plain-text/Markdown email presentation to one line. */
function normalizeLine(value: string): string {
  const markdownUrl = value.trim().match(/^\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/);
  if (markdownUrl) return markdownUrl[1];
  return value.trim()
    .replace(/^\*{1,3}\s*(.*?)\s*\*{1,3}$/, "$1")
    .replace(/^_{1,3}\s*(.*?)\s*_{1,3}$/, "$1");
}

/**
 * Editors often paste category labels in uppercase or with a colon/dash.
 * Match those presentation differences, but always return the canonical label
 * used by the newsletter template.
 */
function readCategory(line: string): { cate: string; title: string } | undefined {
  const withoutLabel = line.replace(/^\s*(?:category|chuyên\s*mục)\s*:\s*/i, "");
  for (const cate of categories) {
    const pattern = escapeRegex(cate)
      .replace(/\s+/g, "\\s+")
      .replace(/'/g, "['’]");
    // Gmail's plain-text version can collapse `*Category*Title` onto one
    // line. Read the Markdown-wrapped category before the normal form.
    const markdownMatch = withoutLabel.match(new RegExp(`^(?:\\*{1,3}|_{1,3})${pattern}(?:\\*{1,3}|_{1,3})(.*)$`, "i"));
    if (markdownMatch) return { cate, title: markdownMatch[1].trim() };
    const match = withoutLabel.match(new RegExp(`^${pattern}(?=\\s|:|-|–|—|$)\\s*(?:[:\-–—]\\s*)?(.*)$`, "i"));
    if (match) return { cate, title: match[1].trim() };
  }
  return undefined;
}

export function parseContent(text: string): Article[] {
  const result: Article[] = [];
  let current: Partial<Article> | undefined;
  let descriptionEnded = false;
  for (const rawLine of text.split("\n")) {
    const line = normalizeLine(rawLine);
    if (!line) {
      if (current?.des) descriptionEnded = true;
      continue;
    }
    const category = readCategory(line);
    if (category) {
      if (isComplete(current)) result.push(current);
      current = { cate: category.cate, title: category.title || undefined };
      descriptionEnded = false;
    } else if (current && !current.url && /^https:\/\//.test(line)) {
      current.url = line;
    } else if (current && !current.title) {
      current.title = line;
    } else if (current && !current.url) {
      current.title = `${current.title} ${line}`;
    } else if (current?.url && !current.des) {
      current.des = line;
      descriptionEnded = false;
    } else if (current?.des && !descriptionEnded) {
      current.des = `${current.des} ${line}`;
    }
  }
  if (isComplete(current)) result.push(current);
  return result;
}

/**
 * Keeps only complete newsletter blocks, deliberately removing email greetings,
 * sign-offs, and signatures before an order is persisted.
 */
export function cleanNewsletterContent(text: string): string | undefined {
  const articles = parseContent(text);
  if (!articles.length) return undefined;
  return articles.map((article) => [article.cate, article.title, article.url, article.des].join("\n")).join("\n\n");
}

function isComplete(article: Partial<Article> | undefined): article is Article {
  return Boolean(article?.cate && article.title && article.url && article.des);
}
