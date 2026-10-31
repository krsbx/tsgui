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

/** Channels for {@link rgba} — alpha defaults to opaque. */
export interface RgbaChannels {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/** Paint-space rectangle — positions and sizes in logical units. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RectOptions extends Rect {
  /** Packed color — see {@link rgba}. */
  color: number;
}

export interface RoundedRectOptions extends RectOptions {
  /** Corner radius, clamped to half the shortest side at draw time. */
  radius: number;
  /** Arc segments per corner (8 ≈ smooth at UI sizes). */
  segments?: number;
}

export interface ArcOptions {
  cx: number;
  cy: number;
  /** Outer radius. */
  radius: number;
  /** Radians; a negative sweep draws counter-clockwise. */
  startAngle: number;
  endAngle: number;
  /** Packed color — see {@link rgba}. */
  color: number;
  /** Tessellation density per full circle. */
  segments?: number;
}

export interface RingOptions extends ArcOptions {
  /** Hole radius — `0` degenerates to a pie via {@link ArcOptions}. */
  innerRadius: number;
}

export interface TextureDrawOptions extends Rect {
  texture: TextureHandle;
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

export interface RendererOptions {
  /**
   * Preferred SDL render driver ("gpu", "software", …). Defaults to "gpu"
   * with SDL's default choice as fallback; tests pin "software" for
   * deterministic pixel readback.
   */
  driver?: string;
}

/** Pack 0–255 channels into the u32 SDL_Color writes little-endian. */
export function rgba({ r, g, b, a = 255 }: RgbaChannels): number {
  return (
    (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0
  );
}
