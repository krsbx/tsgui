/**
 * Branded handle types + shared option types for @tsgui/gpu.
 * Handles are derived from the generated symbols surface, so a window can
 * no longer be passed where a renderer or texture is expected.
 */
import type { SdlSymbols } from "@tsgui/bindings";

export type WindowHandle = NonNullable<
  ReturnType<SdlSymbols["SDL_CreateWindow"]>
>;
export type RendererHandle = NonNullable<
  ReturnType<SdlSymbols["SDL_CreateRendererWithProperties"]>
>;
export type TextureHandle = NonNullable<
  ReturnType<SdlSymbols["SDL_CreateTextureWithProperties"]>
>;

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface RectOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Packed color — see {@link rgba}. */
  color: number;
}

export interface TextureDrawOptions {
  texture: TextureHandle;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Packed tint — defaults to opaque white. */
  tint?: number;
}

export interface TextureFromPixelsOptions {
  renderer: RendererHandle;
  width: number;
  height: number;
  /** RGBA byte order, `width * 4` bytes per row. */
  pixels: Uint8Array;
  /** A SDL_PixelFormat value. */
  format: number;
}

/** Pack 0–255 channels into the u32 SDL_Color writes little-endian. */
export function rgba({
  r,
  g,
  b,
  a = 255,
}: {
  r: number;
  g: number;
  b: number;
  a?: number;
}): number {
  return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
}
