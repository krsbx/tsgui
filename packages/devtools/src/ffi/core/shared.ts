import type { ReleaseListResponse } from "../release/types.ts";
import { type Library, Platform } from "./enums.ts";

type LibraryAsset =
  | {
      found: false;
      timestamp: string | null;
      url: string | null;
    }
  | {
      found: true;
      timestamp: string;
      url: string;
    };

export function getPlatform(): Platform {
  const platform =
    process.platform === "win32"
      ? Platform.Windows
      : process.platform === "darwin"
        ? Platform.MacOS
        : Platform.Linux;

  return platform;
}

export function getAssetExtension(): string {
  return getPlatform() === Platform.Windows ? ".zip" : ".tar.gz";
}

export function getLibraryAssetLink(
  library: Library,
  releases: ReleaseListResponse
): LibraryAsset {
  // Tags look like `SDL3_ttf-3.2.2`; the trailing `-` keeps `SDL3` from
  // matching `SDL3_image-*` / `SDL3_ttf-*` releases
  const release = releases.find((release) =>
    release.tag_name.startsWith(`${library}-`)
  );
  const platform = getPlatform();
  const extension = getAssetExtension();

  const result = {
    found: false,
    timestamp: null,
    url: null,
  } as LibraryAsset;

  if (!release) return result;

  const url = release.assets.find((asset) =>
    asset.name.endsWith(`${platform}${extension}`)
  )?.browser_download_url;

  if (!url) return result;

  result.found = true;
  result.timestamp = release.published_at;
  result.url = url;

  return result;
}
