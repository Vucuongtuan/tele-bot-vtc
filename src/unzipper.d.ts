declare module "unzipper" {
  import { Readable } from "node:stream";
  interface ZipEntry {
    path: string;
    type: "File" | "Directory";
    stream(): Readable;
  }
  interface ZipDirectory {
    files: ZipEntry[];
  }
  const unzipper: {
    Open: { file(path: string): Promise<ZipDirectory> };
  };
  export default unzipper;
}
