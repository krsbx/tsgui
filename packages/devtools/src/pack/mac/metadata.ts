import type { MacOSMetadata } from "../types.ts";
import { Plist } from "./plist/index.ts";

export function metadataToPlist(metadata: MacOSMetadata): string {
  const plist = new Plist({
    CFBundleExecutable: metadata.name,
    CFBundleIdentifier: metadata.bundleId,
    CFBundleName: metadata.displayName,
    CFBundleDisplayName: metadata.displayName,
    CFBundlePackageType: "APPL",
    CFBundleShortVersionString: metadata.version,
    CFBundleIconFile: metadata.icon,
    LSUIElement: false,
    NSHighResolutionCapable: true,
    LSMinimumSystemVersion: metadata.minimumSystemVersion ?? "11.0",
  });

  return plist.toString();
}
