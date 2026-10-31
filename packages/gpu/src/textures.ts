/** Texture creation/destruction over the SDL3 properties API. */
import { sdl, SdlDefines } from "@tsgui/bindings";
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
  const props = sdl.SDL_CreateProperties();

  sdl.SDL_SetNumberProperty({
    props,
    name: PROP_TEXTURE_CREATE_FORMAT,
    value: format,
  });
  sdl.SDL_SetNumberProperty({
    props,
    name: PROP_TEXTURE_CREATE_ACCESS,
    value: 0 /* static */,
  });
  sdl.SDL_SetNumberProperty({
    props,
    name: PROP_TEXTURE_CREATE_WIDTH,
    value: width,
  });
  sdl.SDL_SetNumberProperty({
    props,
    name: PROP_TEXTURE_CREATE_HEIGHT,
    value: height,
  });

  const texture = sdl.SDL_CreateTextureWithProperties({ renderer, props });
  sdl.SDL_DestroyProperties({ props });

  if (!texture) {
    throw new Error(`createTextureFromPixels: ${sdl.SDL_GetError()}`);
  }

  if (
    !sdl.SDL_UpdateTexture({ texture, rect: null, pixels, pitch: width * 4 })
  ) {
    throw new Error(`SDL_UpdateTexture: ${sdl.SDL_GetError()}`);
  }

  sdl.SDL_SetTextureBlendMode({
    texture,
    blendMode: SdlDefines.SDL_BLENDMODE_BLEND,
  });

  return texture;
}

export function destroyTexture(texture: TextureHandle): void {
  sdl.SDL_DestroyTexture({ texture });
}
