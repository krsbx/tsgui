export const Library = {
  SDL3: "SDL3",
  SDL3Image: "SDL3_image",
  SDL3Mixer: "SDL3_mixer",
  SDL3Ttf: "SDL3_ttf",
  SDL3Shadercross: "SDL_shadercross",
} as const;

export type Library = (typeof Library)[keyof typeof Library];

export const Platform = {
  Windows: "windows",
  Linux: "linux",
  MacOS: "macos",
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

export const AssetExtension = {
  Windows: ".zip",
  Linux: ".tar.gz",
  MacOS: ".tar.gz",
} as const;

export type AssetExtension =
  (typeof AssetExtension)[keyof typeof AssetExtension];
