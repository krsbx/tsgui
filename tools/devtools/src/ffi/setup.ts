import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { downloadFile } from "../downloader.ts";
import { getReleases } from "../release/index.ts";
import { unpack } from "../unpack.ts";
import { Library } from "./enums.ts";
import { getAssetExtension, getLibraryAssetLink } from "./shared.ts";

/**
 * Matches an installed shared library for `library`, e.g. `libSDL3.0.dylib`,
 * `libSDL3.so.0` or `SDL3.dll` — but not `libSDL3_image...` nor a leftover
 * archive from an interrupted run.
 */
function isInstalled(library: string, files: string[]) {
  const pattern = new RegExp(
    `^(lib)?${library}\\.(.*\\.)?(dylib|so|dll)(\\.|$)`
  );

  return files.some((file) => pattern.test(file));
}

export async function setupFfiCopy(
  dest: string,
  owner: string = "krsbx",
  repo: string = "tsgui"
) {
  const releases = await getReleases(owner, repo);

  const assets = Object.fromEntries(
    Object.values(Library).map((library) => [
      library,
      getLibraryAssetLink(library, releases),
    ])
  );

  await mkdir(dest, { recursive: true });

  const files = await readdir(dest);

  await Promise.all(
    Object.entries(assets).map(async ([library, asset]) => {
      if (!asset.found) {
        console.warn(
          `${library} has no release asset for this platform, skipping`
        );
        return;
      }

      if (isInstalled(library, files)) {
        console.log(`${library} already exists in ${dest}, skipping`);
        return;
      }

      const archive = join(dest, `${library}${getAssetExtension()}`);

      try {
        await downloadFile(asset.url, archive);
        await unpack(archive, dest);
      } finally {
        await rm(archive, { force: true });
      }
    })
  );

  return assets;
}
