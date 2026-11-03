import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export async function unpack(src: string, dest: string): Promise<void> {
  const lower = src.toLowerCase();

  // execFile rejects on a non-zero exit code, so a failed extraction surfaces
  if (lower.endsWith(".zip")) {
    if (process.platform === "win32") {
      await run("powershell", [
        "-Command",
        "Expand-Archive",
        "-Path",
        src,
        "-DestinationPath",
        dest,
        "-Force",
      ]);
    } else {
      await run("unzip", ["-o", src, "-d", dest]);
    }
    return;
  }

  if ([".tar.gz", ".tgz"].some((ext) => lower.endsWith(ext))) {
    await run("tar", ["-xzf", src, "-C", dest]);
    return;
  }

  if (lower.endsWith(".tar")) {
    await run("tar", ["-xf", src, "-C", dest]);
    return;
  }

  throw new Error(`unsupported archive format: ${src}`);
}
