import { AssetExtension, Platform } from "./enums.ts";

export function getPlatform(): Platform {
  switch (process.platform) {
    case "win32":
      return Platform.Windows;

    case "darwin":
      return Platform.MacOS;

    case "linux":
      return Platform.Linux;

    default:
      throw new Error(`Unsupported platform: ${process.platform}!`);
  }
}

export function getAssetExtension(
  platform: Platform = getPlatform()
): AssetExtension {
  switch (platform) {
    case Platform.Windows:
      return AssetExtension.Windows;

    case Platform.Linux:
      return AssetExtension.Linux;

    case Platform.MacOS:
      return AssetExtension.MacOS;

    default:
      throw new Error(`Unsupported platform: ${platform}!`);
  }
}
