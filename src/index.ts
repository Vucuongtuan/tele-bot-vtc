import "dotenv/config";
import { createWriteStream, promises as fs } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import Fastify from "fastify";
import { Bot, InlineKeyboard, InputFile, webhookCallback } from "grammy";
import { buildExportZip, buildExportZipFromImages, buildJewelryPreviewHtml, buildJewelryTemplate2PreviewHtml, buildPreviewHtml, makeWorkDir } from "./archive.js";
import { publishExportToGitHub } from "./github.js";
import { checkGmailOrders, sendGmailOrderReply } from "./gmail.js";
import { parseContent } from "./parser.js";
import { jewelryTemplate1Form, parseJewelryTemplate1, parseJewelryTemplate2, renderJewelryTemplate1, renderJewelryTemplate2 } from "./jewelry.js";
import { clearGmailReplyDraft, clearOrder, getGmailReplyDraft, getOrder, markEmailProcessed, saveGmailReplyDraft, saveOrder, wasEmailProcessed } from "./store.js";
import { renderNewsletter } from "./template.js";
import { fetchPayloadImages } from "./payload.js";
import type { Order } from "./types.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const bot = new Bot(token);
const app = Fastify({ logger: true });

try {
  await bot.api.setMyCommands([
    { command: "start", description: "Xem hướng dẫn sử dụng bot" },
  { command: "new", description: "Tạo newsletter mới" },
    { command: "clean", description: "Xóa toàn bộ order hiện tại để làm lại" },
    { command: "cancel", description: "Hủy order hiện tại" },
    { command: "checkwwk", description: "Kiểm tra mail order WWK mới" },
  ]);
} catch (error) {
  app.log.warn(error, "Could not update Telegram command menu");
}

const sendContentPrompt = (ctx: { reply: (text: string) => Promise<unknown> }, template: "wwk" | "jewelry-1" | "jewelry-2") => {
  if (template === "jewelry-1") return ctx.reply(`Đã chọn Jewelry template 1. Dán content theo mẫu dưới đây; bot sẽ tự đặt ảnh folder 1 là hero, ảnh 2–3 là cụm ảnh đôi:\n\n${jewelryTemplate1Form}`);
  if (template === "jewelry-2") return ctx.reply("Đã chọn Jewelry template 2. Dán nguyên content editorial: Editor’s Note, FEATURED SPOTLIGHT, 2 TOPIC và YOUR PICK (This/That). Sau đó gửi ZIP gồm 5 folder ảnh theo thứ tự.");
  return ctx.reply("Đã chọn WWK. Hãy dán content newsletter, sau đó gửi ZIP ảnh.");
};

const createOrder = async (ctx: { chat: { id: number }; reply: (text: string) => Promise<unknown> }, template: "wwk" | "jewelry-1" | "jewelry-2", folderName: string) => {
  await saveOrder({ chatId: ctx.chat.id, folderName, template, status: "waiting_content", updatedAt: new Date() });
  return sendContentPrompt(ctx, template);
};

const todayFolderName = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const vietnamWeekdayNames = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

// Return today through the coming Sunday
const folderDateOptions = () => {
  const today = todayFolderName();
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", weekday: "short" }).format(new Date());
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const count = dayIndex === 0 ? 1 : 8 - dayIndex;
  const start = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const value = date.toISOString().slice(0, 10);
    return { value, label: `${vietnamWeekdayNames[(dayIndex + offset) % 7]} · ${value.slice(-2)}` };
  });
};

const sendWwkConfirmation = (ctx: { reply: (text: string, options: { reply_markup: InlineKeyboard }) => Promise<unknown> }, order: Order) => {
  const articles = parseContent(order.content!);
  const source = order.imageSource === "payload" ? "Payload (featured image)" : "ZIP ảnh";
  const list = articles.map((article, index) => `${index + 1}. ${article.title}`).join("\n");
  const keyboard = new InlineKeyboard().text("Tạo preview & export", "export:confirm").text("Sửa content", "export:edit");
  return ctx.reply(`Kiểm tra trước khi export\n\nNgày: ${order.folderName}\nNguồn ảnh: ${source}\nSố bài: ${articles.length}\n\n${list}`, { reply_markup: keyboard });
};

async function preparePayloadOrder(chatId: number, content: string, folderName = todayFolderName(), gmail?: Order["gmail"]): Promise<boolean> {
  const articles = parseContent(content);
  if (!articles.length) return false;
  if (await getOrder(chatId)) {
    await bot.api.sendMessage(chatId, "Có WWK email mới nhưng bot đang có một order chưa hoàn tất. Hãy export hoặc /cancel order hiện tại trước.");
    return false;
  }
  const order: Order = { chatId, folderName, template: "wwk", content, imageSource: "payload", status: "processing", updatedAt: new Date(), gmail };
  await saveOrder(order);
  try {
    const images = await fetchPayloadImages(articles);
    for (const [index, image] of images.entries()) {
      await bot.api.sendPhoto(chatId, new InputFile(image, `preview-${index + 1}.jpg`), { caption: `${index + 1}. ${articles[index].title}` });
    }
    const prepared = { ...order, status: "waiting_confirmation" as const, updatedAt: new Date() };
    await saveOrder(prepared);
    await sendWwkConfirmation({ reply: (text, options) => bot.api.sendMessage(chatId, text, options) }, prepared);
    return true;
  } catch (error) {
    app.log.error(error, "Payload preview failed for Gmail order");
    await clearOrder(chatId);
    await bot.api.sendMessage(chatId, "Không thể tạo preview Payload cho WWK email mới.");
    return false;
  }
}

function folderNameFromEmailSubject(subject: string): string | undefined {
  const match = subject.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return undefined;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function exportWwk(ctx: any, order: Order): Promise<void> {
  const workDir = await makeWorkDir(order.chatId);
  try {
    const articles = parseContent(order.content!);
    const outputPath = join(workDir, `${order.folderName}.zip`);
    let count: number;
    let previewHtml: string;
    if (order.imageSource === "payload") {
      const images = await fetchPayloadImages(articles);
      count = await buildExportZipFromImages(outputPath, renderNewsletter(order.folderName, articles), images);
      previewHtml = renderNewsletter(order.folderName, articles, images.map((image) => `data:image/jpeg;base64,${image.toString("base64")}`));
    } else {
      if (!order.archiveFileId) throw new Error("ZIP archive is missing");
      const file = await ctx.api.getFile(order.archiveFileId);
      if (!file.file_path) throw new Error("Telegram did not return a file path");
      const download = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      if (!download.ok || !download.body) throw new Error("Could not download archive from Telegram");
      const inputPath = join(workDir, "input.zip");
      await pipeline(download.body as never, createWriteStream(inputPath));
      count = await buildExportZip(inputPath, outputPath, order.folderName, renderNewsletter(order.folderName, articles));
      if (!count) throw new Error("Không tìm thấy ảnh có tên dạng 1.jpg, 2.jpg… trong ZIP.");
      previewHtml = await buildPreviewHtml(inputPath, order.folderName, articles);
    }
    if ((await fs.stat(outputPath)).size > 50 * 1024 * 1024) throw new Error("Output archive exceeds Telegram's 50 MB send limit");
    await ctx.replyWithDocument(new InputFile(Buffer.from(previewHtml), `${order.folderName}-preview.html`), { caption: "Preview newsletter (ảnh được nhúng Base64)." });
    await ctx.replyWithDocument(new InputFile(outputPath, `${order.folderName}.zip`), { caption: `Hoàn tất: ${count} ảnh.` });
    await clearOrder(order.chatId);
    if (order.gmail) {
      await saveGmailReplyDraft({ chatId: order.chatId, folderName: order.folderName, ...order.gmail });
      const keyboard = new InlineKeyboard().text("Gửi mail báo link e-news", "gmail:reply").text("Không gửi mail", "gmail:cancel");
      await ctx.reply("Sau khi bạn upload file và server build xong, bấm nút để reply mail gốc.", { reply_markup: keyboard });
    }
    try {
      const publishStatus = await publishExportToGitHub(outputPath, order.folderName, workDir);
      if (publishStatus === "pushed") await ctx.reply("Đã push folder newsletter lên GitHub.");
    } catch (error) {
      app.log.warn(error, "GitHub publish failed after newsletter export");
      await ctx.reply("Đã tạo ZIP, nhưng chưa push được GitHub.");
    }
  } catch (error) {
    app.log.error(error);
    await saveOrder({ ...order, status: "waiting_confirmation", updatedAt: new Date() });
    await ctx.reply("Không thể export. Kiểm tra URL/ảnh, hoặc bấm Sửa content để thử lại.");
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

bot.command("start", (ctx) => ctx.reply("Bấm /new để chọn loại newsletter, hoặc kiểm tra order WWK từ Gmail.", { reply_markup: new InlineKeyboard().text("Kiểm tra mail WWK", "gmail:check") }));
bot.command("new", async (ctx) => {
  const parts = ctx.match.trim().split(/\s+/);
  if (!ctx.match.trim()) {
    const keyboard = new InlineKeyboard()
      .text("WWK", "new:wwk")
      .text("Jewelry · Template 1", "new:jewelry-1")
      .row().text("Jewelry · Template 2", "new:jewelry-2");
    return ctx.reply("Bạn muốn tạo newsletter nào?", { reply_markup: keyboard });
  }
  const template = parts[0] === "jewelry-1" || parts[0] === "jewelry-2" ? parts[0] : "wwk";
  const folderName = template.startsWith("jewelry-") ? parts[1] : parts[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(folderName)) return ctx.reply("Cú pháp nhanh: /new 2026-07-26 hoặc bấm /new để chọn bằng nút.");
  return createOrder(ctx, template, folderName);
});
bot.callbackQuery(/^new:(wwk|jewelry-1|jewelry-2)$/, async (ctx) => {
  const template = ctx.match[1] as "wwk" | "jewelry-1" | "jewelry-2";
  await saveOrder({ chatId: ctx.chat!.id, folderName: "", template, status: "waiting_date", updatedAt: new Date() });
  const dates = folderDateOptions();
  const keyboard = new InlineKeyboard();
  dates.forEach((date, index) => {
    keyboard.text(date.label, `newdate:${template}:${date.value}`);
    if (index % 2 === 1 && index < dates.length - 1) keyboard.row();
  });
  await ctx.answerCallbackQuery();
  return ctx.reply(`Đã chọn ${template === "wwk" ? "WWK" : `Jewelry · Template ${template.at(-1)}`}. Chọn ngày tạo folder trong tuần này, hoặc gửi ngày theo dạng YYYY-MM-DD.`, { reply_markup: keyboard });
});
bot.callbackQuery(/^newdate:(wwk|jewelry-1|jewelry-2):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  const template = ctx.match[1] as "wwk" | "jewelry-1" | "jewelry-2";
  const folderName = ctx.match[2];
  await ctx.answerCallbackQuery();
  return createOrder(ctx as never, template, folderName);
});
bot.command("cancel", async (ctx) => { await clearOrder(ctx.chat.id); return ctx.reply("Đã hủy order hiện tại."); });
bot.command("clean", async (ctx) => {
  await clearOrder(ctx.chat.id);
  return ctx.reply("Đã xóa order hiện tại. Bạn có thể dùng /new YYYY-MM-DD để làm lại.");
});

bot.on("message:text", async (ctx) => {
  const order = await getOrder(ctx.chat.id);
  if (!order) return;
  if (order.status === "waiting_date") {
    const folderName = ctx.message.text.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(folderName)) return ctx.reply("Ngày chưa đúng. Hãy gửi theo dạng YYYY-MM-DD, ví dụ 2026-08-01.");
    return createOrder(ctx, order.template ?? "wwk", folderName);
  }
  if (order.status !== "waiting_content") return;
  if (order.template?.startsWith("jewelry-")) {
    const parsed = order.template === "jewelry-1" ? parseJewelryTemplate1(ctx.message.text) : parseJewelryTemplate2(ctx.message.text);
    if ("error" in parsed) return ctx.reply(`Chưa đọc được Jewelry template 1: ${parsed.error}`);
    await saveOrder({ ...order, content: ctx.message.text, status: "waiting_file", updatedAt: new Date() });
    if (order.template === "jewelry-2") return ctx.reply("Đã nhận Jewelry template 2: featured, 2 topic và 2 Your Pick. Gửi ZIP ảnh (tối đa 20 MB) nhé.");
    const template1 = parseJewelryTemplate1(ctx.message.text);
    if ("error" in template1) return ctx.reply(`Chưa đọc được Jewelry template 1: ${template1.error}`);
    const pairs = template1.value.blocks.filter((block) => block.type === "imagePair").length;
    return ctx.reply(`Đã nhận Jewelry template 1: hero ảnh ${template1.value.heroImage}, ${pairs} cụm ảnh đôi, ${template1.value.credits.length} credit. Gửi ZIP ảnh (tối đa 20 MB) nhé.`);
  }
  const articles = parseContent(ctx.message.text);
  if (!articles.length) return ctx.reply("Không đọc được block hợp lệ. Mỗi block cần category, title, URL và mô tả.");
  await saveOrder({ ...order, content: ctx.message.text, status: "waiting_image_source", updatedAt: new Date() });
  const keyboard = new InlineKeyboard()
    .text("Gửi ZIP ảnh", "images:zip")
    .text("Lấy ảnh từ Payload", "images:payload");
  return ctx.reply(`Đã nhận ${articles.length} bài. Chọn nguồn ảnh:`, { reply_markup: keyboard });
});

bot.callbackQuery("images:zip", async (ctx) => {
  const order = await getOrder(ctx.chat!.id);
  if (!order || order.template === "jewelry-1" || order.status !== "waiting_image_source") return ctx.answerCallbackQuery({ text: "Order này không còn chờ chọn nguồn ảnh." });
  await saveOrder({ ...order, status: "waiting_file", updatedAt: new Date() });
  await ctx.answerCallbackQuery();
  return ctx.reply("Gửi ZIP ảnh (tối đa 20 MB) nhé.");
});

bot.callbackQuery("images:payload", async (ctx) => {
  const order = await getOrder(ctx.chat!.id);
  if (!order || order.template === "jewelry-1" || order.status !== "waiting_image_source") return ctx.answerCallbackQuery({ text: "Order này không còn chờ chọn nguồn ảnh." });
  await ctx.answerCallbackQuery();
  // Lock the order before fetching. Callback queries can be delivered twice when
  // the button is tapped again while the Payload requests are still in flight.
  await saveOrder({ ...order, status: "processing", updatedAt: new Date() });
  await ctx.reply("Đang lấy ảnh preview từ Payload…");
  try {
    const articles = parseContent(order.content!);
    const images = await fetchPayloadImages(articles);
    for (const [index, image] of images.entries()) {
      await ctx.replyWithPhoto(new InputFile(image, `preview-${index + 1}.jpg`), {
        caption: `${index + 1}. ${articles[index].title}`,
      });
    }
    const prepared = { ...order, imageSource: "payload" as const, status: "waiting_confirmation" as const, updatedAt: new Date() };
    await saveOrder(prepared);
    return sendWwkConfirmation(ctx, prepared);
  } catch (error) {
    app.log.error(error, "Payload preview failed");
    await saveOrder({ ...order, status: "waiting_image_source", updatedAt: new Date() });
    return ctx.reply("Không thể lấy preview từ Payload. Kiểm tra URL/featured image hoặc chọn gửi ZIP ảnh.");
  }
});

bot.callbackQuery("export:edit", async (ctx) => {
  const order = await getOrder(ctx.chat!.id);
  if (!order || order.template === "jewelry-1" || order.status !== "waiting_confirmation") return ctx.answerCallbackQuery({ text: "Order này không còn chờ xác nhận." });
  await saveOrder({ ...order, status: "waiting_content", updatedAt: new Date() });
  await ctx.answerCallbackQuery();
  return ctx.reply("Hãy gửi lại toàn bộ content WWK. Bạn sẽ chọn lại nguồn ảnh sau đó.");
});

bot.callbackQuery("export:confirm", async (ctx) => {
  const order = await getOrder(ctx.chat!.id);
  if (!order || order.template === "jewelry-1" || order.status !== "waiting_confirmation") return ctx.answerCallbackQuery({ text: "Order này không còn chờ xác nhận." });
  await saveOrder({ ...order, status: "processing", updatedAt: new Date() });
  await ctx.answerCallbackQuery();
  await ctx.reply("Đang tạo preview và ZIP…");
  return exportWwk(ctx, order);
});

bot.callbackQuery("gmail:reply", async (ctx) => {
  const draft = await getGmailReplyDraft(ctx.chat!.id);
  if (!draft) return ctx.answerCallbackQuery({ text: "Không có mail nào đang chờ reply." });
  await ctx.answerCallbackQuery();
  try {
    await sendGmailOrderReply(draft);
    await clearGmailReplyDraft(draft.chatId);
    return ctx.reply("Đã reply mail gốc với link e-news.");
  } catch (error) {
    app.log.error(error, "Gmail order reply failed");
    return ctx.reply("Không gửi được mail. Kiểm tra Gmail OAuth scope rồi thử lại.");
  }
});

bot.callbackQuery("gmail:cancel", async (ctx) => {
  await clearGmailReplyDraft(ctx.chat!.id);
  await ctx.answerCallbackQuery();
  return ctx.reply("Đã hủy gửi mail báo e-news.");
});

bot.on("message:document", async (ctx) => {
  const order = await getOrder(ctx.chat.id);
  const document = ctx.message.document;
  if (!order || order.status !== "waiting_file") return ctx.reply("Hãy bắt đầu bằng /new, rồi gửi content trước.");
  if (!document.file_name?.toLowerCase().endsWith(".zip")) return ctx.reply("Backend hiện chỉ nhận ZIP.");
  if (document.file_size && document.file_size > 20 * 1024 * 1024) return ctx.reply("Telegram Bot API chỉ cho bot tải file tối đa 20 MB. Hãy dùng link upload riêng cho archive này.");

  if (!order.template?.startsWith("jewelry-")) {
    const prepared = { ...order, archiveFileId: document.file_id, imageSource: "zip" as const, status: "waiting_confirmation" as const, updatedAt: new Date() };
    await saveOrder(prepared);
    return sendWwkConfirmation(ctx, prepared);
  }

  await saveOrder({ ...order, archiveFileId: document.file_id, status: "processing", updatedAt: new Date() });
  await ctx.reply("Đang xử lý ZIP…");
  const workDir = await makeWorkDir(ctx.chat.id);
  try {
    const file = await ctx.api.getFile(document.file_id);
    if (!file.file_path) throw new Error("Telegram did not return a file path");
    const download = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!download.ok || !download.body) throw new Error("Could not download archive from Telegram");
    const inputPath = join(workDir, "input.zip");
    const outputPath = join(workDir, `${order.folderName}.zip`);
    await pipeline(download.body as never, createWriteStream(inputPath));
    const isJewelry = order.template?.startsWith("jewelry-");
    const jewelry1 = order.template === "jewelry-1" ? parseJewelryTemplate1(order.content!) : undefined;
    const jewelry2 = order.template === "jewelry-2" ? parseJewelryTemplate2(order.content!) : undefined;
    if (jewelry1 && "error" in jewelry1) throw new Error(jewelry1.error);
    if (jewelry2 && "error" in jewelry2) throw new Error(jewelry2.error);
    const articles = isJewelry ? [] : parseContent(order.content!);
    const html = isJewelry
      ? (jewelry2 ? renderJewelryTemplate2(order.folderName, jewelry2.value) : renderJewelryTemplate1(order.folderName, jewelry1!.value))
      : renderNewsletter(order.folderName, articles);
    const count = await buildExportZip(inputPath, outputPath, order.folderName, html, isJewelry
      ? { indexPath: "index.html", imageName: (number) => `banner_${number}.jpg` }
      : undefined);
    if (!count) throw new Error("Không tìm thấy ảnh có tên dạng 1.jpg, 2.jpg… trong ZIP.");
    if ((await fs.stat(outputPath)).size > 50 * 1024 * 1024) throw new Error("Output archive exceeds Telegram's 50 MB send limit");
    const previewHtml = isJewelry
      ? (jewelry2 ? await buildJewelryTemplate2PreviewHtml(inputPath, order.folderName, jewelry2.value) : await buildJewelryPreviewHtml(inputPath, order.folderName, jewelry1!.value))
      : await buildPreviewHtml(inputPath, order.folderName, articles);
    await ctx.replyWithDocument(new InputFile(Buffer.from(previewHtml), `${order.folderName}-preview.html`), { caption: "Preview newsletter (ảnh được nhúng Base64)." });
    await ctx.replyWithDocument(new InputFile(outputPath, `${order.folderName}.zip`), { caption: `Hoàn tất: ${count} ảnh.` });
    await clearOrder(ctx.chat.id);
    try {
      const publishStatus = await publishExportToGitHub(outputPath, order.folderName, workDir);
      if (publishStatus === "pushed") await ctx.reply("Đã push folder newsletter lên GitHub.");
    } catch (error) {
      app.log.warn(error, "GitHub publish failed after newsletter export");
      await ctx.reply("Đã tạo ZIP, nhưng chưa push được GitHub.");
    }
  } catch (error) {
    app.log.error(error);
    await saveOrder({ ...order, status: "waiting_file", updatedAt: new Date() });
    await ctx.reply("Không thể xử lý file. Kiểm tra ZIP và thử gửi lại.");
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
});

app.get("/health", async () => ({ ok: true }));
app.post("/telegram/webhook", async (request, reply) => {
  if (webhookSecret && request.headers["x-telegram-bot-api-secret-token"] !== webhookSecret) {
    return reply.code(401).send({ error: "Invalid Telegram webhook secret" });
  }
  return webhookCallback(bot, "fastify")(request, reply);
});

async function checkWwkOrders(chatId: number): Promise<string> {
  try {
    const processed = await checkGmailOrders(async ({ messageId, threadId, text, subject, from, rfcMessageId }) => {
    if (await wasEmailProcessed(messageId)) return false;
    const folderName = folderNameFromEmailSubject(subject);
    if (!folderName) {
      await bot.api.sendMessage(chatId, `Mail WWK có subject không chứa ngày dạng d/m/yyyy: ${subject}`);
      await markEmailProcessed(messageId);
      return false;
    }
    const accepted = await preparePayloadOrder(chatId, text, folderName, { messageId, threadId, from, subject, rfcMessageId });
    if (accepted) await markEmailProcessed(messageId);
    return accepted;
    });
    return processed ? `Đã tạo ${processed} order WWK từ Gmail.` : "Không có mail WWK mới cần xử lý.";
  } catch (error) {
    app.log.error(error, "Manual Gmail order check failed");
    return "Không thể kiểm tra Gmail. Kiểm tra cấu hình OAuth/Gmail rồi thử lại.";
  }
}

bot.command("checkwwk", async (ctx) => {
  await ctx.reply("Đang kiểm tra Gmail order WWK…");
  return ctx.reply(await checkWwkOrders(ctx.chat.id));
});

bot.callbackQuery("gmail:check", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Đang kiểm tra Gmail order WWK…");
  return ctx.reply(await checkWwkOrders(ctx.chat!.id));
});

const port = Number(process.env.PORT ?? 8080);
await app.listen({ port, host: "0.0.0.0" });
