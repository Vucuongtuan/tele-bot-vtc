import { execFile } from "node:child_process";
import { createWriteStream, promises as fs } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";

const executeFile = promisify(execFile);
const repositoryName = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const branchName = /^[A-Za-z0-9._/-]+$/;

async function git(args: string[], cwd: string): Promise<void> {
  await executeFile("git", args, { cwd, maxBuffer: 1024 * 1024 });
}

async function extractExport(zipPath: string, destination: string): Promise<void> {
  const directory = await unzipper.Open.file(zipPath);
  const root = resolve(destination);
  for (const file of directory.files) {
    if (file.type !== "File") continue;
    const outputPath = resolve(root, file.path);
    if (relative(root, outputPath).startsWith("..")) throw new Error("Invalid export archive path");
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await pipeline(file.stream(), createWriteStream(outputPath));
  }
}

/** Publishes only the generated YYYY-MM-DD folder, never this backend's source code. */
export async function publishExportToGitHub(zipPath: string, folderName: string, workDir: string): Promise<"pushed" | "skipped"> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.NEWSLETTER_GITHUB_REPOSITORY;
  const branch = process.env.NEWSLETTER_GITHUB_BRANCH ?? "main";
  if (!token || !repository) return "skipped";
  if (!repositoryName.test(repository) || !branchName.test(branch)) throw new Error("Invalid GitHub repository or branch configuration");

  try {
    const checkout = join(workDir, "newsletter-repository");
    const remote = `https://x-access-token:${encodeURIComponent(token)}@github.com/${repository}.git`;
    await git(["clone", "--depth", "1", "--branch", branch, remote, checkout], workDir);
    await git(["pull", "--ff-only", "origin", branch], checkout);

    const destination = join(checkout, folderName);
    await fs.rm(destination, { recursive: true, force: true });
    await fs.mkdir(destination, { recursive: true });
    await extractExport(zipPath, destination);

    await git(["config", "user.name", "WOWWEEKEND Newsletter Bot"], checkout);
    await git(["config", "user.email", "newsletter-bot@users.noreply.github.com"], checkout);
    await git(["add", "--", folderName], checkout);
    try {
      await git(["diff", "--cached", "--quiet", "--", folderName], checkout);
      return "skipped";
    } catch {
      await git(["commit", "-m", `Publish newsletter ${folderName}`], checkout);
      await git(["push", "origin", branch], checkout);
      return "pushed";
    }
  } catch {
    // Do not expose the authenticated repository URL or GitHub token in application logs.
    throw new Error("GitHub publish failed");
  }
}
