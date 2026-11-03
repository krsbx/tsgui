/**
 * @vulcania/devtools — the developer umbrella apps install alongside the
 * toolkit: the FFI setup helpers (dylib download/unpack, moved from
 * tools/devtools) and the live inspector (`inspect(app)` — node:http +
 * SSE widget tree, selection highlight, frame graph).
 */
export {
  nodeDetail,
  type NodeDetail,
} from "./inspect/detail.ts";
export {
  snapshotWindow,
} from "./inspect/snapshot.ts";
export {
  type InspectableApp,
  type InspectableWindow,
  type SnapshotNode,
  type TreeSnapshot,
  type WindowSnapshot,
} from "./inspect/types.ts";
export {
  inspect,
  type InspectHandle,
  type InspectOptions,
} from "./inspect/server.ts";

// FFI setup — moved from tools/devtools, code unchanged.
export { downloadFile } from "./ffi/downloader.ts";
export { Library, Platform } from "./ffi/core/enums.ts";
export { setupFfiCopy } from "./ffi/core/setup.ts";
export {
  getAssetExtension,
  getLibraryAssetLink,
  getPlatform,
} from "./ffi/core/shared.ts";
export { getReleases } from "./ffi/release/index.ts";
export { unpack } from "./ffi/unpack.ts";
