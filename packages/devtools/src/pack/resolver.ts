import { Platform } from "../shared/enums.ts";
import { resolvePlatform } from "../shared/utils";
import { LibraryExtension, LibraryPathResolution } from "./enums.ts";

export function resolveLibraryPath(
  platform: Platform = resolvePlatform()
): LibraryPathResolution {
  switch (platform) {
    case Platform.Windows:
      return LibraryPathResolution.Windows;

    case Platform.Linux:
      return LibraryPathResolution.Linux;

    case Platform.MacOS:
      return LibraryPathResolution.MacOS;

    default:
      throw new Error(`Unsupported platform: ${platform}!`);
  }
}

export function resolveLibraryExtension(
  platform: Platform = resolvePlatform()
): LibraryExtension {
  switch (platform) {
    case Platform.Windows:
      return LibraryExtension.Windows;

    case Platform.Linux:
      return LibraryExtension.Linux;

    case Platform.MacOS:
      return LibraryExtension.MacOS;

    default:
      throw new Error(`Unsupported platform: ${platform}!`);
  }
}
