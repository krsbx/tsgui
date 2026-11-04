export const LibraryExtension = {
  Windows: ".dll",
  Linux: ".so",
  MacOS: ".dylib",
} as const;

export type LibraryExtension =
  (typeof LibraryExtension)[keyof typeof LibraryExtension];

export const LibraryPathResolution = {
  Windows: "lib",
  Linux: "lib",
  MacOS: "../Resources/lib",
} as const;

export type LibraryPathResolution =
  (typeof LibraryPathResolution)[keyof typeof LibraryPathResolution];
