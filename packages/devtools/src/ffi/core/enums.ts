export const Library = {
  SDL3: "SDL3",
  SDL3Image: "SDL3_image",
  SDL3Mixer: "SDL3_mixer",
  SDL3Ttf: "SDL3_ttf",
} as const;

export type Library = (typeof Library)[keyof typeof Library];

export const Platform = {
  Windows: "windows",
  Linux: "linux",
  MacOS: "macos",
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];
