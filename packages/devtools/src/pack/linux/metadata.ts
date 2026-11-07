import type { LinuxMetadata } from "../types.ts";
import { Toml } from "./toml/index.ts";

export function metadataToDesktop(metadata: LinuxMetadata): string {
  let desktop = "[Desktop Entry]\n";

  let categories = metadata.categories?.join?.(";") ?? "Utility;Development;";

  if (!categories.endsWith(";")) {
    categories += ";";
  }

  const toml = new Toml({
    Type: "Application",
    Name: metadata.displayName,
    Comment: metadata.description ?? "",
    Exec: `./${metadata.name}`,
    Icon: metadata.icon,
    Terminal: false,
    Categories: categories,
    GenericName: metadata.genericName ?? metadata.displayName,
    StartupNotify: true,
    StartupWMClass: metadata.name,
    "X-AppImage-Id": metadata.bundleId,
  });

  desktop += toml;

  return desktop;
}
