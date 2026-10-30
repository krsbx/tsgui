/** Texture creation/destruction over the SDL3 properties API. */
import { SdlDefines, sdlRaw } from "@tsgui/bindings";
import type { TextureFromPixelsOptions, TextureHandle } from "./types.ts";

// Prop names are string #defines — invisible to the codegen's numeric
// scanner, so they live here verbatim (documented in SDL_render.h).
const PROP_TEXTURE_CREATE_FORMAT = "SDL.texture.create.format";
const PROP_TEXTURE_CREATE_ACCESS = "SDL.texture.create.access";
const PROP_TEXTURE_CREATE_WIDTH = "SDL.texture.create.width";
const PROP_TEXTURE_CREATE_HEIGHT = "SDL.texture.create.height";

/**
 * Create an RGBA texture from raw pixels (Uint8Array, RGBA byte order).
 * Uses the properties API because SDL3 removed SDL_CreateTexture.
 */
export function createTextureFromPixels({
  renderer,
  width,
  height,
  pixels,
  format,
}: TextureFromPixelsOptions): TextureHandle {
  const props = sdlRaw.SDL_CreateProperties();

  sdlRaw.SDL_SetNumberProperty(props, PROP_TEXTURE_CREATE_FORMAT, format);
  sdlRaw.SDL_SetNumberProperty(
    props,
    PROP_TEXTURE_CREATE_ACCESS,
    0 /* static */
  );
  sdlRaw.SDL_SetNumberProperty(props, PROP_TEXTURE_CREATE_WIDTH, width);
  sdlRaw.SDL_SetNumberProperty(props, PROP_TEXTURE_CREATE_HEIGHT, height);

  const texture = sdlRaw.SDL_CreateTextureWithProperties(renderer, props);
  sdlRaw.SDL_DestroyProperties(props);

  if (!texture) {
    throw new Error(`createTextureFromPixels: ${sdlRaw.SDL_GetError()}`);
  }

  if (!sdlRaw.SDL_UpdateTexture(texture, null, pixels, width * 4)) {
    throw new Error(`SDL_UpdateTexture: ${sdlRaw.SDL_GetError()}`);
  }

  sdlRaw.SDL_SetTextureBlendMode(texture, SdlDefines.SDL_BLENDMODE_BLEND);

  return texture;
}

export function destroyTexture(texture: TextureHandle): void {
  sdlRaw.SDL_DestroyTexture(texture);
}
