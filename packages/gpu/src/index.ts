/**
 * @tsgui/gpu — the batched renderer over SDL_Renderer's GPU backend.
 *
 * One frame = ~6 FFI calls, constant regardless of geometry volume:
 *   SetRenderDrawColor, RenderClear, RenderGeometry (per texture batch),
 *   RenderPresent — plus event polling in the app loop.
 *
 * Geometry accumulates into reused buffers (SDL3's 32-byte SDL_Vertex:
 * 2f position, SDL_FColor 4×f32, 2f uv); switching texture starts a batch.
 */
export { GpuRenderer } from "./renderer.ts";
export { type TextDrawOptions, TtfFont } from "./text.ts";
export { createTextureFromPixels, destroyTexture } from "./textures.ts";
export * from "./types.ts";
