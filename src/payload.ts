import sharp from "sharp";
import type { Article } from "./types.js";

const payloadUrl = process.env.PAYLOAD_API_URL ?? "https://wowweekend.vn/api";

function slugFromArticleUrl(articleUrl: string): string {
  const segments = new URL(articleUrl).pathname.split("/").filter(Boolean);
  const slug = segments.at(-1)?.replace(/\.html$/i, "");
  if (!slug) throw new Error(`Không tìm thấy slug trong URL: ${articleUrl}`);
  return slug;
}

function findImageUrl(value: unknown): string | undefined {
  if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  if (!value || typeof value !== "object") return undefined;
  const media = value as Record<string, unknown>;
  // Payload projects commonly expose either featuredImage.origin or a media URL directly.
  return findImageUrl(media.origin) ?? findImageUrl(media.url);
}

async function featuredImageUrl(article: Article): Promise<string> {
  const apiKey = process.env.PAYLOAD_API_KEY;
  if (!apiKey) throw new Error("PAYLOAD_API_KEY is not configured");
  const slug = slugFromArticleUrl(article.url);
  const endpoint = new URL("posts", `${payloadUrl.replace(/\/$/, "")}/`);
  endpoint.searchParams.set("where[slug][equals]", slug);
  endpoint.searchParams.set("limit", "1");
  const response = await fetch(endpoint, { headers: { Authorization: `users API-Key ${apiKey}` } });
  if (!response.ok) throw new Error(`Payload không tìm được bài viết “${slug}” (${response.status})`);
  const body = await response.json() as { docs?: Array<{ featuredImage?: unknown }> };
  const imageUrl = findImageUrl(body.docs?.[0]?.featuredImage);
  if (!imageUrl) throw new Error(`Bài viết “${slug}” không có featuredImage.origin hợp lệ`);
  return imageUrl;
}

async function downloadAndResize(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Không tải được featured image (${response.status})`);
  return sharp(Buffer.from(await response.arrayBuffer()))
    .resize(1040, 584, { fit: "cover", position: "attention" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

/** Downloads the featured image for every WWK article and normalizes it for the newsletter. */
export async function fetchPayloadImages(articles: Article[]): Promise<Buffer[]> {
  return Promise.all(articles.map(async (article) => downloadAndResize(await featuredImageUrl(article))));
}
