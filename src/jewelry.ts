import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { JewelryArticle, JewelryBlock, JewelryCredit, JewelryPick, JewelryTemplate1Content, JewelryTemplate2Content } from "./types.js";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

const requiredField = (text: string, name: string): string | undefined => {
  const match = text.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
};

const validUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export type JewelryParseResult = { value: JewelryTemplate1Content } | { error: string };

/** Parses the copy-and-fill form sent as one Telegram message. */
function parseJewelryTemplate1Form(text: string): JewelryParseResult {
  const category = requiredField(text, "CATEGORY");
  const title = requiredField(text, "TITLE");
  const url = requiredField(text, "LINK");
  const heroValue = requiredField(text, "HERO") ?? "1";
  const heroImage = Number(heroValue);
  if (!category || !title || !url) return { error: "Thiếu CATEGORY, TITLE hoặc LINK." };
  if (!validUrl(url)) return { error: "LINK phải là một URL https hợp lệ." };
  if (!Number.isInteger(heroImage) || heroImage < 1) return { error: "HERO phải là số thứ tự ảnh dương, ví dụ HERO: 1." };

  const bodyMarker = /^BODY:\s*$/im.exec(text);
  if (!bodyMarker || bodyMarker.index === undefined) return { error: "Thiếu BODY. Hãy đặt phần nội dung sau dòng BODY:." };
  const bodyAndCredits = text.slice(bodyMarker.index + bodyMarker[0].length).replace(/^\r?\n/, "");
  const creditsMarker = /^CREDITS:\s*$/im.exec(bodyAndCredits);
  const body = (creditsMarker?.index === undefined ? bodyAndCredits : bodyAndCredits.slice(0, creditsMarker.index)).trim();
  const creditsText = creditsMarker?.index === undefined ? "" : bodyAndCredits.slice(creditsMarker.index + creditsMarker[0].length).replace(/^\r?\n/, "");
  if (!body) return { error: "Thiếu nội dung sau dòng BODY:." };

  const blocks: JewelryBlock[] = [];
  for (const part of body.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)) {
    const imageMatch = part.match(/^\[\[IMAGES:\s*(\d+)\s*,\s*(\d+)\s*\]\]$/i);
    if (imageMatch) {
      blocks.push({ type: "imagePair", images: [Number(imageMatch[1]), Number(imageMatch[2])] });
      continue;
    }
    if (/^\[\[IMAGES:/i.test(part)) return { error: "Marker ảnh phải có dạng [[IMAGES: 2, 3]] và nằm riêng một đoạn." };
    blocks.push({ type: "text", paragraphs: part.split("\n").map((line) => line.trim()).filter(Boolean) });
  }
  if (!blocks.some((block) => block.type === "imagePair")) return { error: "Thiếu marker ảnh [[IMAGES: 2, 3]] trong BODY." };

  const credits: JewelryCredit[] = [];
  for (const line of creditsText.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const [creditText, ...urlParts] = line.split("|").map((item) => item.trim());
    const creditUrl = urlParts.join("|");
    if (!creditText) return { error: "Một dòng CREDITS không có nội dung." };
    if (creditUrl && !validUrl(creditUrl)) return { error: `Link credit không hợp lệ: ${creditUrl}` };
    credits.push({ text: creditText, url: creditUrl || undefined });
  }
  return { value: { category, title, url, heroImage, blocks, credits } };
}

/** Parses the editor's usual paste format, with no labels required. */
function parseJewelryTemplate1Raw(text: string): JewelryParseResult {
  const lines = text.replace(/\r/g, "").split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim());
  if (firstContentIndex < 0) return { error: "Nội dung trống." };
  const category = lines[firstContentIndex].trim();
  const title = lines.slice(firstContentIndex + 1).find((line) => line.trim())?.trim();
  const urlIndex = lines.findIndex((line, index) => index > firstContentIndex && /^https:\/\//.test(line.trim()));
  const url = urlIndex < 0 ? undefined : lines[urlIndex].trim();
  if (!title || !url || !validUrl(url)) return { error: "Cần 3 phần đầu: category, tiêu đề và một URL https của bài viết." };

  const creditsIndex = lines.findIndex((line, index) => index > urlIndex && /^credits\s*$/i.test(line.trim()));
  const bodyText = lines.slice(urlIndex + 1, creditsIndex < 0 ? undefined : creditsIndex).join("\n").trim();
  const paragraphs = bodyText.split(/\n\s*\n/).map((part) => part.trim().replace(/\n+/g, " ")).filter(Boolean);
  if (!paragraphs.length) return { error: "Không tìm thấy phần nội dung sau link." };

  const credits: JewelryCredit[] = [];
  for (const line of (creditsIndex < 0 ? [] : lines.slice(creditsIndex + 1)).map((item) => item.trim()).filter(Boolean)) {
    const linked = line.match(/^(.*?)\s*\|\s*(https:\/\/\S+)$/);
    const trailingUrl = line.match(/^(.*?)\s+(https:\/\/\S+)$/);
    const creditText = (linked?.[1] ?? trailingUrl?.[1] ?? line).trim();
    const creditUrl = linked?.[2] ?? trailingUrl?.[2];
    credits.push({ text: creditText, url: creditUrl && validUrl(creditUrl) ? creditUrl : undefined });
  }

  // The established template 1 layout places its two-column image grid after the intro.
  const intro = paragraphs.slice(0, 2);
  const remainder = paragraphs.slice(2);
  const blocks: JewelryBlock[] = [{ type: "text", paragraphs: intro }, { type: "imagePair", images: [2, 3] }];
  if (remainder.length) blocks.push({ type: "text", paragraphs: remainder });
  return { value: { category, title, url, heroImage: 1, blocks, credits } };
}

export function parseJewelryTemplate1(text: string): JewelryParseResult {
  return /^CATEGORY:/im.test(text) ? parseJewelryTemplate1Form(text) : parseJewelryTemplate1Raw(text);
}

export const jewelryTemplate1Form = `TOPIC
Tiêu đề bài viết
https://jewelry.wowweekend.vn/...

Đoạn nội dung đầu tiên.

Đoạn nội dung thứ hai.

Đoạn nội dung sau cụm ảnh.

Credits
Head of Editorial: Veera
Cover photo: Pandora | https://pandora.net`;

export type JewelryTemplate2ParseResult = { value: JewelryTemplate2Content } | { error: string };

const cleanMarkdown = (value: string) => value.replace(/\*{1,3}/g, "").trim();
const markdownUrl = (value: string) => value.match(/\]\((https:\/\/[^\s)]+)\)|\b(https:\/\/\S+)/)?.[1]
  ?? value.match(/\]\((https:\/\/[^\s)]+)\)|\b(https:\/\/\S+)/)?.[2];

function parseTemplate2Article(lines: string[]): JewelryArticle | undefined {
  const values = lines.map(cleanMarkdown).filter(Boolean);
  const urlIndex = values.findIndex((line) => markdownUrl(line));
  const url = urlIndex < 0 ? undefined : markdownUrl(values[urlIndex]);
  if (values.length < 3 || !url || !validUrl(url)) return undefined;
  return { category: values[0], title: values[1], url, description: values.slice(urlIndex + 1).join(" ") };
}

function parseTemplate2Pick(line: string): JewelryPick | undefined {
  const match = cleanMarkdown(line).match(/^(This|That):\s*(.+)$/i);
  if (!match) return undefined;
  const url = markdownUrl(match[2]);
  if (!url || !validUrl(url)) return undefined;
  const title = cleanMarkdown(match[2].replace(/\[([^\]]*)\]\(https:\/\/[^\s)]+\)/g, "$1").replace(/https:\/\/\S+/g, ""));
  return title ? { label: match[1].toLowerCase(), title, url } : undefined;
}

/** Parses the editorial paste used by Jewelry template 2, including optional Your Pick copy. */
export function parseJewelryTemplate2(text: string): JewelryTemplate2ParseResult {
  const lines = text.replace(/\r/g, "").split("\n");
  const markerIndexes = lines.map((line, index) => ({ line: cleanMarkdown(line), index }))
    .filter(({ line }) => /^(FEATURED SPOTLIGHT|TOPIC|YOUR PICK)$/i.test(line));
  const featuredIndex = markerIndexes.find(({ line }) => /^FEATURED SPOTLIGHT$/i.test(line))?.index;
  const topicIndexes = markerIndexes.filter(({ line }) => /^TOPIC$/i.test(line)).map(({ index }) => index);
  const picksIndex = markerIndexes.find(({ line }) => /^YOUR PICK$/i.test(line))?.index;
  if (featuredIndex === undefined || topicIndexes.length !== 2 || picksIndex === undefined) return { error: "Cần 1 FEATURED SPOTLIGHT, 2 TOPIC và 1 YOUR PICK." };
  const beforeFeatured = lines.slice(0, featuredIndex).map(cleanMarkdown).filter(Boolean);
  if (beforeFeatured.length < 2) return { error: "Thiếu Editor’s Note hoặc chữ ký editor ở đầu nội dung." };
  const featured = parseTemplate2Article(lines.slice(featuredIndex, topicIndexes[0]));
  const first = parseTemplate2Article(lines.slice(topicIndexes[0], topicIndexes[1]));
  const second = parseTemplate2Article(lines.slice(topicIndexes[1], picksIndex));
  if (!featured || !first || !second) return { error: "Mỗi bài cần category, tiêu đề, URL https và mô tả." };
  const pickLines = lines.slice(picksIndex + 1).map(cleanMarkdown).filter(Boolean);
  const thisIndex = pickLines.findIndex((line) => /^This:/i.test(line));
  const thatIndex = pickLines.findIndex((line) => /^That:/i.test(line));
  if (thisIndex < 0 || thatIndex < 0) return { error: "YOUR PICK cần đủ hai dòng This: và That: có link https." };
  const thisPick = parseTemplate2Pick(pickLines[thisIndex]);
  const thatPick = parseTemplate2Pick(pickLines[thatIndex]);
  if (!thisPick || !thatPick) return { error: "This và That cần tiêu đề cùng URL https hợp lệ." };
  return { value: { editorNote: beforeFeatured.slice(0, -1).join(" "), editorSignature: beforeFeatured.at(-1)!, featured, articles: [first, second], yourPickDescription: pickLines.slice(0, thisIndex).join(" ") || undefined, picks: [thisPick, thatPick] } };
}

function imageUrl(folderName: string, image: number, images?: string[]): string {
  return images?.[image - 1] ?? `https://newsletter.wowweekend.vn/jewelry/${encodeURIComponent(folderName)}/assets/img/banner_${image}.jpg`;
}

function textBlock(paragraphs: string[]) {
  return `<tr><td align="center" style="padding:4px 30px 20px;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:26px;font-weight:400;color:#ffffff;text-align:center;">${paragraphs.map((paragraph) => `<p style="margin:0;">${escapeHtml(paragraph)}</p>`).join("")}</div></td></tr>`;
}

function imagePair(folderName: string, images: [number, number], imageSources?: string[]) {
  const [left, right] = images.map((image) => escapeHtml(imageUrl(folderName, image, imageSources)));
  return `<tr><td align="center" style="padding:10px 30px 20px;"><table role="presentation" width="540" cellpadding="0" cellspacing="0"><tr><td width="260" valign="top"><img src="${left}" width="260" style="display:block;width:100%;height:auto;border:0;" alt="" /></td><td width="20">&nbsp;</td><td width="260" valign="top"><img src="${right}" width="260" style="display:block;width:100%;height:auto;border:0;" alt="" /></td></tr></table></td></tr>`;
}

export function renderJewelryTemplate1(folderName: string, content: JewelryTemplate1Content, imageSources?: string[]): string {
  const blocks = content.blocks.map((block) => block.type === "text" ? textBlock(block.paragraphs) : imagePair(folderName, block.images, imageSources)).join("");
  const credits = content.credits.length ? `<tr><td align="center" style="padding:4px 30px 20px;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:26px;color:#ffffff;text-align:center;"><p style="margin:0;"><u>Credits</u></p>${content.credits.map((credit) => `<p style="margin:0;">${credit.url ? `<a href="${escapeHtml(credit.url)}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(credit.text)}</a>` : escapeHtml(credit.text)}</p>`).join("")}</div></td></tr>` : "";
  const hero = escapeHtml(imageUrl(folderName, content.heroImage, imageSources));
  const dynamicContent = `<!-- Hero Image -->
          <tr><td align="center" style="padding:0 30px 20px 30px;"><img class="hero-image" src="${hero}" width="540" alt="" style="width:100%;max-width:540px;display:block;border:0;outline:none;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:20px 30px 4px 30px;"><p class="sans-serif-text" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:16px;font-weight:400;color:#A37E2C !important;text-transform:uppercase;text-align:center;">${escapeHtml(content.category)}</p><h2 class="headline-text" style="margin:4px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:28px;font-weight:normal;color:#ffffff !important;letter-spacing:-0.05em;text-align:center;">${escapeHtml(content.title)}</h2></td></tr>${blocks}
          <tr><td align="center" style="padding:15px 30px 25px 30px;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center"><tr><td align="center" bgcolor="#ffffff" style="background-color:#ffffff;padding:14px 38px;border:1px solid #ffffff;"><a href="${escapeHtml(content.url)}" class="sans-serif-text" style="font-family:Georgia,'Times New Roman',serif;font-size:12px;font-weight:bold;color:#000000 !important;text-decoration:none;display:block;letter-spacing:2px;text-transform:uppercase;">READ MORE</a></td></tr></table></td></tr>${credits}
          `;
  const sourcePath = join(process.cwd(), "UI_template", "jewelry", "template1", "2026-07-23", "index.html");
  const source = readFileSync(sourcePath, "utf8");
  const rendered = source.replace(/<!-- Hero Image -->[\s\S]*?(?=\s*<!-- Footer Social Icons -->)/, dynamicContent);
  if (rendered === source) throw new Error("Jewelry template 1 is missing its dynamic content markers.");
  return rendered;
}

const template2Article = (article: JewelryArticle, image: number, full = false) => `<tr><td class="article-card-cell" align="center" style="padding:${full ? "0" : "10px 90px 0"};background-color:#000000;"><img class="hero-image" src="${escapeHtml(imageUrl("FOLDER", image))}" width="${full ? 600 : 420}" style="width:100%;max-width:${full ? 600 : 420}px;display:block;border:0;outline:none;height:auto;" alt="" /></td></tr><tr><td class="article-card-cell" align="center" style="padding:20px 90px 4px;background-color:#000000;"><p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#A37E2C;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(article.category)}</p><h2 style="margin:4px 0 0;font-family:Georgia,serif;font-size:24px;line-height:28px;font-weight:500;color:#fff;text-align:center;">${escapeHtml(article.title)}</h2><p style="margin:4px auto 0;width:70%;max-width:280px;font-family:Georgia,serif;font-size:13px;line-height:18px;color:#fff;text-align:center;">${escapeHtml(article.description)}</p></td></tr><tr><td align="center" style="padding:12px 90px 30px;background-color:#000000;"><table role="presentation"><tr><td style="padding:12px 32px;border:1px solid #fff;"><a href="${escapeHtml(article.url)}" style="font-family:Georgia,serif;font-size:11px;font-weight:bold;color:#fff;text-decoration:none;letter-spacing:2px;">READ MORE</a></td></tr></table></td></tr>`;

export function renderJewelryTemplate2(folderName: string, content: JewelryTemplate2Content, imageSources?: string[]): string {
  const img = (order: number) => escapeHtml(imageSources?.[order - 1] ?? imageUrl(folderName, order));
  const articleHtml = (article: JewelryArticle, order: number, full = false) => template2Article(article, order, full).replaceAll(escapeHtml(imageUrl("FOLDER", order)), img(order));
  const pick = (value: JewelryPick, order: number) => `<td class="column" width="220" valign="top" align="center" style="width:220px;padding:0 10px 15px;"><h3 style="margin:0 0 6px;font-family:Georgia,serif;font-size:14px;line-height:20px;font-weight:normal;color:#111;text-transform:uppercase;text-align:left;height:40px;overflow:hidden;">${escapeHtml(value.title)}</h3><div style="margin-bottom:20px;"><img src="${img(order)}" width="200" style="width:100%;max-width:200px;display:block;margin:0 auto;border:0;" alt="" /></div><table role="presentation" style="width:100%;"><tr><td align="center" style="background:#000;padding:12px 10px;border-radius:25px;"><a href="${escapeHtml(value.url)}" style="font-family:Georgia,serif;font-size:18px;color:#fff;text-decoration:none;">${escapeHtml(value.label)}</a></td></tr></table></td>`;
  const dynamic = `<!-- Editor's Note --><tr><td align="center" style="padding:30px 90px 60px;background:#000;"><p style="margin:0;font-family:Georgia,serif;font-size:14px;line-height:18px;color:#fff;text-align:center;font-style:italic;">${escapeHtml(content.editorNote)}</p><p style="margin:15px 0 0;font-family:Georgia,serif;font-size:13px;font-weight:600;color:#fff;text-align:center;font-style:italic;">${escapeHtml(content.editorSignature)}</p></td></tr>${articleHtml(content.featured, 1, true)}${articleHtml(content.articles[0], 2)}${articleHtml(content.articles[1], 3)}<tr><td align="center" style="padding:30px 30px 5px;background:#fff;"><h2 style="margin:0;font-family:Georgia,serif;font-size:42px;font-weight:300;color:#111;text-transform:uppercase;text-align:center;">YOUR PICK</h2>${content.yourPickDescription ? `<p style="margin:4px auto 0;max-width:280px;font-family:Georgia,serif;font-size:13px;line-height:18px;color:#111;text-align:center;">${escapeHtml(content.yourPickDescription)}</p>` : ""}</td></tr><tr><td align="center" style="padding:20px 30px 40px;background:#fff;"><table role="presentation" style="width:100%;max-width:540px;"><tr>${pick(content.picks[0], 4)}<td width="100" align="center" style="font-family:Georgia,serif;font-size:24px;font-style:italic;">(or)</td>${pick(content.picks[1], 5)}</tr></table></td></tr>`;
  const source = readFileSync(join(process.cwd(), "UI_template", "jewelry", "template2", "2026-07-30", "index.html"), "utf8");
  const rendered = source.replace(/<!-- Editor's Note -->[\s\S]*?(?=\s*<!-- Divider -->)/, dynamic);
  if (rendered === source) throw new Error("Jewelry template 2 is missing its dynamic content markers.");
  return rendered;
}
