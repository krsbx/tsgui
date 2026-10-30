/**
 * @tsgui/gpu — the batched renderer over SDL_Renderer's GPU backend.
 *
 * One frame = ~6 FFI calls, constant regardless of geometry volume:
 *   SetRenderDrawColor, RenderClear, RenderGeometry (per texture batch),
 *   RenderPresent — plus event polling in the app loop.
 *
 * Geometry accumulates into reused buffers (20-byte SDL_Vertex layout:
 * 2f position, 4×u8 color, 2f uv); switching texture starts a new batch.
 */
export * from "./types.ts";
export { GpuRenderer } from "./renderer.ts";
export { createTextureFromPixels, destroyTexture } from "./textures.ts";
