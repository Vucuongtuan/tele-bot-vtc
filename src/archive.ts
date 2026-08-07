import { createWriteStream, promises as fs } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import archiver from "archiver";
import unzipper from "unzipper";
import type { Article } from "./types.js";
import { renderNewsletter } from "./template.js";
import { renderJewelryTemplate1, renderJewelryTemplate2 } from "./jewelry.js";
import type { JewelryTemplate1Content, JewelryTemplate2Content } from "./types.js";

const imageName = /^1040x584\.jpe?g$/i;
const numberedFolder = /^(\d+)\./;
interface ArchiveEntry {
  path: string;
  type: "File" | "Directory";
  stream(): Readable;
}

async function getImageCandidates(inputPath: string): Promise<Array<{ file: ArchiveEntry; order: number }>> {
  const directory = await unzipper.Open.file(inputPath);
  return (directory.files as ArchiveEntry[])
    .map((file: ArchiveEntry) => {
      const folder = file.path.split("/").find((part) => numberedFolder.test(part));
      const match = folder?.match(numberedFolder);
      return { file, order: match ? Number(match[1]) : undefined };
    })
    .filter((item): item is { file: ArchiveEntry; order: number } =>
      item.file.type === "File" && imageName.test(basename(item.file.path)) && item.order !== undefined,
    )
    .sort((a, b) => a.order - b.order);
}

export interface ExportOptions {
  indexPath?: string;
  imageName?: (order: number) => string;
}

export async function buildExportZip(inputPath: string, outputPath: string, folderName: string, html: string, options: ExportOptions = {}): Promise<number> {
  const candidates = await getImageCandidates(inputPath);
  return writeExportZip(outputPath, html, candidates.map(({ file, order }) => ({ order, source: file.stream() })), options);
}

export async function buildExportZipFromImages(outputPath: string, html: string, images: Buffer[], options: ExportOptions = {}): Promise<number> {
  return writeExportZip(outputPath, html, images.map((source, index) => ({ order: index + 1, source })), options);
}

async function writeExportZip(outputPath: string, html: string, images: Array<{ order: number; source: Readable | Buffer }>, options: ExportOptions): Promise<number> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const output = createWriteStream(outputPath);
  archive.pipe(output);
  archive.append(html, { name: options.indexPath ?? "vi/index.html" });
  for (const { source, order } of images) {
    archive.append(source, { name: `assets/img/${options.imageName?.(order) ?? `banner${order}_2x.jpg`}` });
  }
  await archive.finalize();
  await finished(output);
  return images.length;
}

export async function buildPreviewHtml(inputPath: string, folderName: string, articles: Article[]): Promise<string> {
  return renderNewsletter(folderName, articles, await getImageSources(inputPath, (order) => `data:image/jpeg;base64,${order}`));
}

async function getImageSources(inputPath: string, makeSource: (data: string) => string): Promise<string[]> {
  const candidates = await getImageCandidates(inputPath);
  const imageSources: string[] = [];
  for (const { file, order } of candidates) {
    const chunks: Buffer[] = [];
    for await (const chunk of file.stream()) chunks.push(Buffer.from(chunk));
    imageSources[order - 1] = makeSource(Buffer.concat(chunks).toString("base64"));
  }
  return imageSources;
}

export async function buildJewelryPreviewHtml(inputPath: string, folderName: string, content: JewelryTemplate1Content): Promise<string> {
  const imageSources = await getImageSources(inputPath, (data) => `data:image/jpeg;base64,${data}`);
  return renderJewelryTemplate1(folderName, content, imageSources);
}

export async function buildJewelryTemplate2PreviewHtml(inputPath: string, folderName: string, content: JewelryTemplate2Content): Promise<string> {
  const imageSources = await getImageSources(inputPath, (data) => `data:image/jpeg;base64,${data}`);
  return renderJewelryTemplate2(folderName, content, imageSources);
}

export async function makeWorkDir(chatId: number): Promise<string> {
  return fs.mkdtemp(join("/tmp", `newsletter-${chatId}-`));
}
