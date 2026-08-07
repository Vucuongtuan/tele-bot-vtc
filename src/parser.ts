import type { Article } from "./types.js";

const categories = [
  "Properties Opportunity", "Watches", "Technology", "Architecture", "Sports & Esports",
  "Photograph", "Music", "Beauty", "Cuisine", "Fashion", "Automobile", "Long Form",
  "Environmental Movement", "WWK Video", "WWK News", "Hospitality Business News",
  "W Coffee Talk", "Inspiration Journey", "Tips & Advice", "The Art Corner", "Explore",
  "Enjoy", "Jewelry", "WWK's Choice", "The Luxe Journal",
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    const match = withoutLabel.match(new RegExp(`^${pattern}(?=\\s|:|-|–|—|$)\\s*(?:[:\-–—]\\s*)?(.*)$`, "i"));
    if (match) return { cate, title: match[1].trim() };
  }
  return undefined;
}

export function parseContent(text: string): Article[] {
  const result: Article[] = [];
  let current: Partial<Article> | undefined;
  for (const rawLine of text.split("\n").map((line) => line.trim()).filter(Boolean)) {
    const category = readCategory(rawLine);
    if (category) {
      if (isComplete(current)) result.push(current);
      current = { cate: category.cate, title: category.title || undefined };
    } else if (current && !current.url && /^https:\/\//.test(rawLine)) {
      current.url = rawLine;
    } else if (current && !current.title) {
      current.title = rawLine;
    } else if (current?.url && !current.des) {
      current.des = rawLine;
    }
  }
  if (isComplete(current)) result.push(current);
  return result;
}

function isComplete(article: Partial<Article> | undefined): article is Article {
  return Boolean(article?.cate && article.title && article.url && article.des);
}
