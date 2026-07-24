import { createWriteStream, promises as fs } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import archiver from "archiver";
import unzipper from "unzipper";

const imageName = /^1040x584\.jpe?g$/i;
const numberedFolder = /^(\d+)\./;
interface ArchiveEntry {
  path: string;
  type: "File" | "Directory";
  stream(): Readable;
}

export async function buildExportZip(inputPath: string, outputPath: string, folderName: string, html: string): Promise<number> {
  const directory = await unzipper.Open.file(inputPath);
  const candidates = (directory.files as ArchiveEntry[])
    .map((file: ArchiveEntry) => {
      const folder = file.path.split("/").find((part) => numberedFolder.test(part));
      const match = folder?.match(numberedFolder);
      return { file, order: match ? Number(match[1]) : undefined };
    })
    .filter((item): item is { file: ArchiveEntry; order: number } =>
      item.file.type === "File" && imageName.test(basename(item.file.path)) && item.order !== undefined,
    )
    .sort((a, b) => a.order - b.order);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const output = createWriteStream(outputPath);
  archive.pipe(output);
  archive.append(html, { name: "vi/index.html" });
  for (const { file, order } of candidates) {
    archive.append(file.stream(), { name: `assets/img/banner${order}_2x.jpg` });
  }
  await archive.finalize();
  await finished(output);
  return candidates.length;
}

export async function makeWorkDir(chatId: number): Promise<string> {
  return fs.mkdtemp(join("/tmp", `newsletter-${chatId}-`));
}
