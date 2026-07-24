import type { Article } from "./types.js";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Kept server-side so the generated index.html never depends on Vue state. */
export function renderNewsletter(folderName: string, articles: Article[], imageSources?: string[]): string {
  const cards = articles.map((article, index) => `
    <tr><td style="padding:0 35px 24px;background:#f2f7f5;font-family:Georgia,serif">
      <a href="${escapeHtml(article.url)}"><img src="${imageSources?.[index] ?? `https://newsletter.wowweekend.vn/${encodeURIComponent(folderName)}/assets/img/banner${index + 1}_2x.jpg`}" alt="${escapeHtml(article.title)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0"></a>
      <p style="margin:14px 0 5px;color:#9e7e3b;font-size:13px;text-transform:uppercase">${escapeHtml(article.cate)}</p>
      <h2 style="margin:0 0 9px;font-size:23px;line-height:1.25"><a style="color:#222;text-decoration:none" href="${escapeHtml(article.url)}">${escapeHtml(article.title)}</a></h2>
      <p style="margin:0;color:#444;line-height:1.5">${escapeHtml(article.des)}</p>
    </td></tr>`).join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOWWEEKEND</title></head><body style="margin:0;background:#036039"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="650" style="max-width:650px;width:100%;background:#f2f7f5" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 35px;text-align:center;font:700 28px Georgia,serif;color:#036039">WOWWEEKEND</td></tr>${cards}<tr><td style="padding:28px 35px;text-align:center;border-top:1px solid #9e7e3b;font:12px Georgia,serif;color:#222">COPYRIGHT © 2023, WOWWEEKEND. ALL RIGHTS RESERVED.</td></tr></table></td></tr></table></body></html>`;
}
