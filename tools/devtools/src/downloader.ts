import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export async function downloadFile(
  url: string,
  dest: string,
  abortSignal?: AbortSignal
): Promise<void> {
  let res: Response | undefined;

  try {
    res = await fetch(url, { signal: abortSignal });

    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`.trimEnd());
    }

    await mkdir(dirname(dest), { recursive: true });

    // Stream to disk instead of buffering the whole archive in memory
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest), {
      signal: abortSignal,
    });

    console.log(`downloaded ${url}`);
  } catch (error) {
    // Don't leave a truncated file behind for the caller to mistake as valid
    await rm(dest, { force: true });

    throw new Error(`failed to download ${url}`, { cause: error });
  } finally {
    // An unread body (e.g. a 404 page) keeps the connection open until GC
    if (res && !res.bodyUsed) {
      await res.body?.cancel().catch(() => {});
    }
  }
}
