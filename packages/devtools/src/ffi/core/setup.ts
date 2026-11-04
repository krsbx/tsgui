import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Library } from "../../shared/enums.ts";
import { resolveAssetExtension } from "../../shared/utils.ts";
import { downloadFile } from "../downloader.ts";
import { getReleases } from "../release/index.ts";
import { unpack } from "../unpack.ts";
import { getLibraryAssetLink } from "./shared.ts";

/**
 * File stem of the shared library when it differs from the release tag
 * prefix (`SDL_shadercross-<sha>` ships `libSDL3_shadercross.*`).
 */
const FILE_STEM: Partial<Record<Library, string>> = {
  [Library.SDL3Shadercross]: "SDL3_shadercross",
};

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
  repo: string = "vulcania"
) {
  await mkdir(dest, { recursive: true });

  const files = await readdir(dest);

  const missing = Object.values(Library).filter((library) => {
    if (!isInstalled(FILE_STEM[library] ?? library, files)) return true;

    console.log(`${library} already exists in ${dest}, skipping`);
    return false;
  });

  // Everything is already installed, no need to hit the GitHub API
  if (!missing.length) return {};

  const releases = await getReleases(owner, repo);

  const assets = Object.fromEntries(
    missing.map((library) => [library, getLibraryAssetLink(library, releases)])
  );

  const extension = resolveAssetExtension();

  await Promise.all(
    missing.map(async (library) => {
      const asset = assets[library]!;
      if (!asset.found) {
        console.warn(
          `${library} has no release asset for this platform, skipping`
        );
        return;
      }

      const archive = join(dest, `${library}${extension}`);

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
