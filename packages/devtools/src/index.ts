/**
 * @vulcania/devtools — the developer umbrella apps install alongside the
 * toolkit: the FFI setup helpers (dylib download/unpack, moved from
 * tools/devtools) and the live inspector (`inspect(app)` — node:http +
 * SSE widget tree, selection highlight, frame graph).
 */
export { nodeDetail, type NodeDetail } from "./inspect/detail.ts";
export {
  inspect,
  type InspectHandle,
  type InspectOptions,
} from "./inspect/server.ts";
export { snapshotWindow } from "./inspect/snapshot.ts";
export {
  type InspectableApp,
  type InspectableWindow,
  type SnapshotNode,
  type TreeSnapshot,
  type WindowSnapshot,
} from "./inspect/types.ts";

// FFI setup — moved from tools/devtools, code unchanged.
export { setupFfiCopy } from "./ffi/core/setup.ts";
export { getLibraryAssetLink } from "./ffi/core/shared.ts";
export { downloadFile } from "./ffi/downloader.ts";
export { getReleases } from "./ffi/release/index.ts";
export { unpack } from "./ffi/unpack.ts";

export { LibraryExtension, LibraryPathResolution } from "./pack/enums.ts";
export {
  resolveLibraryExtension,
  resolveLibraryPath,
} from "./pack/resolver.ts";
export { Library, Platform } from "./shared/enums.ts";
export { resolveAssetExtension, resolvePlatform } from "./shared/utils.ts";
