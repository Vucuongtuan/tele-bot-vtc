import { createWriteStream, promises as fs } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import archiver from "archiver";
import unzipper from "unzipper";

const imageName = /^(\d+)\.jpe?g$/i;
interface ArchiveEntry {
  path: string;
  type: "File" | "Directory";
  stream(): Readable;
}

export async function buildExportZip(inputPath: string, outputPath: string, folderName: string, html: string): Promise<number> {
  const directory = await unzipper.Open.file(inputPath);
  const candidates = (directory.files as ArchiveEntry[])
    .map((file: ArchiveEntry) => ({ file, match: basename(file.path).match(imageName) }))
    .filter((item): item is { file: ArchiveEntry; match: RegExpMatchArray } => Boolean(item.match && item.file.type === "File"))
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

  const archive = archiver("zip", { zlib: { level: 9 } });
  const output = createWriteStream(outputPath);
  archive.pipe(output);
  archive.append(html, { name: "vi/index.html" });
  for (const { file, match } of candidates) {
    archive.append(file.stream(), { name: `assets/img/banner${Number(match[1])}_2x.jpg` });
  }
  await archive.finalize();
  await finished(output);
  return candidates.length;
}

export async function makeWorkDir(chatId: number): Promise<string> {
  return fs.mkdtemp(join("/tmp", `newsletter-${chatId}-`));
}
