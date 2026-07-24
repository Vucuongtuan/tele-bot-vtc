import "dotenv/config";
import { createWriteStream, promises as fs } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import Fastify from "fastify";
import { Bot, InputFile, webhookCallback } from "grammy";
import { buildExportZip, makeWorkDir } from "./archive.js";
import { parseContent } from "./parser.js";
import { clearOrder, getOrder, saveOrder } from "./store.js";
import { renderNewsletter } from "./template.js";
import type { Order } from "./types.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const bot = new Bot(token);
const app = Fastify({ logger: true });

try {
  await bot.api.setMyCommands([
    { command: "start", description: "Xem hướng dẫn sử dụng bot" },
    { command: "new", description: "Tạo newsletter mới: /new YYYY-MM-DD" },
    { command: "clean", description: "Xóa toàn bộ order hiện tại để làm lại" },
    { command: "cancel", description: "Hủy order hiện tại" },
  ]);
} catch (error) {
  app.log.warn(error, "Could not update Telegram command menu");
}

bot.command("start", (ctx) => ctx.reply("Dùng /new YYYY-MM-DD, dán content, sau đó gửi file ZIP ảnh. Dùng /clean để xóa order hiện tại và làm lại."));
bot.command("new", async (ctx) => {
  const folderName = ctx.match.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(folderName)) return ctx.reply("Cú pháp: /new 2026-07-26");
  await saveOrder({ chatId: ctx.chat.id, folderName, status: "waiting_content", updatedAt: new Date() });
  return ctx.reply("Đã tạo order. Hãy gửi nội dung newsletter.");
});
bot.command("cancel", async (ctx) => { await clearOrder(ctx.chat.id); return ctx.reply("Đã hủy order hiện tại."); });
bot.command("clean", async (ctx) => {
  await clearOrder(ctx.chat.id);
  return ctx.reply("Đã xóa order hiện tại. Bạn có thể dùng /new YYYY-MM-DD để làm lại.");
});

bot.on("message:text", async (ctx) => {
  const order = await getOrder(ctx.chat.id);
  if (!order || order.status !== "waiting_content") return;
  const articles = parseContent(ctx.message.text);
  if (!articles.length) return ctx.reply("Không đọc được block hợp lệ. Mỗi block cần category, title, URL và mô tả.");
  await saveOrder({ ...order, content: ctx.message.text, status: "waiting_file", updatedAt: new Date() });
  return ctx.reply(`Đã nhận ${articles.length} bài. Gửi ZIP ảnh (tối đa 20 MB) nhé.`);
});

bot.on("message:document", async (ctx) => {
  const order = await getOrder(ctx.chat.id);
  const document = ctx.message.document;
  if (!order || order.status !== "waiting_file") return ctx.reply("Hãy bắt đầu bằng /new, rồi gửi content trước.");
  if (!document.file_name?.toLowerCase().endsWith(".zip")) return ctx.reply("Backend hiện chỉ nhận ZIP.");
  if (document.file_size && document.file_size > 20 * 1024 * 1024) return ctx.reply("Telegram Bot API chỉ cho bot tải file tối đa 20 MB. Hãy dùng link upload riêng cho archive này.");

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
    const count = await buildExportZip(inputPath, outputPath, order.folderName, renderNewsletter(order.folderName, parseContent(order.content!)));
    if (!count) throw new Error("Không tìm thấy ảnh có tên dạng 1.jpg, 2.jpg… trong ZIP.");
    if ((await fs.stat(outputPath)).size > 50 * 1024 * 1024) throw new Error("Output archive exceeds Telegram's 50 MB send limit");
    await ctx.replyWithDocument(new InputFile(outputPath, `${order.folderName}.zip`), { caption: `Hoàn tất: ${count} ảnh.` });
    await clearOrder(ctx.chat.id);
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

const port = Number(process.env.PORT ?? 8080);
await app.listen({ port, host: "0.0.0.0" });
