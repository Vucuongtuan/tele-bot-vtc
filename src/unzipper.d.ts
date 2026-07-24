declare module "unzipper" {
  import { Readable } from "node:stream";
  interface ZipEntry {
    path: string;
    type: "File" | "Directory";
    stream(): Readable;
  }
  const unzipper: {
    Open: { file(path: string): Promise<{ files: ZipEntry[] }> };
  };
  export default unzipper;
}
