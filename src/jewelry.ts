import type { JewelryBlock, JewelryCredit, JewelryTemplate1Content } from "./types.js";

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
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>THE JEWELRY EDITION</title><style>body{margin:0;background:#fff}table{border-collapse:collapse}@media only screen and (max-width:600px){.container{width:100%!important}.pair td{display:block!important;width:100%!important}.pair .gap{display:none!important}}</style></head><body><table width="100%" role="presentation"><tr><td align="center"><table class="container" width="600" role="presentation" style="max-width:600px;width:100%;background:#000;"><tr><td align="center" style="padding:25px 30px 15px;"><a href="https://jewelry.wowweekend.vn/"><img src="https://cdn-jw.wowweekend.vn/uploads/thejewelryedition_logo-03-u7pbl.png" width="450" style="display:block;max-width:100%;height:auto;border:0;" alt="THE JEWELRY EDITION"></a></td></tr><tr><td align="center" style="padding:10px 30px 20px;font-family:Georgia,serif;font-size:12px;"><a href="https://jewelry.wowweekend.vn/t/brands" style="color:#fff;text-decoration:none;">BRANDS</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://jewelry.wowweekend.vn/t/jewelry-101" style="color:#fff;text-decoration:none;">JEWELRY 101</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://jewelry.wowweekend.vn/t/spotlight" style="color:#fff;text-decoration:none;">SPOTLIGHT</a></td></tr><tr><td style="padding:0 30px 20px;"><img src="${hero}" width="540" style="display:block;width:100%;height:auto;border:0;" alt=""></td></tr><tr><td align="center" style="padding:20px 30px 4px;"><p style="margin:0;color:#a37e2c;font:12px Georgia,serif;text-transform:uppercase;">${escapeHtml(content.category)}</p><h2 style="margin:4px 0 0;color:#fff;font:normal 24px/28px Georgia,serif;">${escapeHtml(content.title)}</h2></td></tr>${blocks}<tr><td align="center" style="padding:15px 30px 25px;"><a href="${escapeHtml(content.url)}" style="display:inline-block;padding:14px 38px;background:#fff;color:#000;font:bold 12px Georgia,serif;letter-spacing:2px;text-decoration:none;">READ MORE</a></td></tr>${credits}<tr><td align="center" style="padding:10px 30px 40px;color:#fff;font:10px Georgia,serif;letter-spacing:1px;">© 2026 THE JEWELRY EDITION. All rights reserved.</td></tr></table></td></tr></table></body></html>`;
}
