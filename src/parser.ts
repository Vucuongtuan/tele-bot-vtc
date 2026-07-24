import type { Article } from "./types.js";

const categories = [
  "Properties Opportunity", "Watches", "Technology", "Architecture", "Sports & Esports",
  "Photograph", "Music", "Beauty", "Cuisine", "Fashion", "Automobile", "Long Form",
  "Environmental Movement", "WWK Video", "WWK News", "Hospitality Business News",
  "W Coffee Talk", "Inspiration Journey", "Tips & Advice", "The Art Corner", "Explore",
  "Enjoy", "Jewelry", "WWK's Choice", "The Luxe Journal",
];

export function parseContent(text: string): Article[] {
  const result: Article[] = [];
  let current: Partial<Article> | undefined;
  for (const rawLine of text.split("\n").map((line) => line.trim()).filter(Boolean)) {
    const category = categories.find((item) => rawLine.startsWith(item));
    if (category) {
      if (isComplete(current)) result.push(current);
      const title = rawLine.slice(category.length).trim().replace(/^[:\-–—]\s*/, "");
      current = { cate: category, title: title || undefined };
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
