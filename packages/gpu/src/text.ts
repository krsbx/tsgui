/**
 * Text via the SDL3_ttf tier — white glyph runs rendered to surfaces,
 * uploaded as textures, tinted at draw time, cached per string.
 */
import { sdl, ttf, type TtfExtensionSymbols } from "@tsgui/bindings";
import type {
  RendererHandle,
  TextureDrawOptions,
  TextureHandle,
} from "./types.ts";

type FontHandle = NonNullable<ReturnType<TtfExtensionSymbols["TTF_OpenFont"]>>;
export interface TextDrawOptions {
  x: number;
  y: number;
  text: string;
  /** Packed tint — defaults to opaque white. */
  tint?: number;
}

interface CachedRun {
  texture: TextureHandle;
  w: number;
  h: number;
}

export class TtfFont {
  readonly font: FontHandle;
  private readonly renderer: RendererHandle;
  private readonly cache = new Map<string, CachedRun>();

  constructor(
    renderer: RendererHandle,
    fontPath: string,
    /** Point size. */
    pt: number
  ) {
    if (!ttf.TTF_Init()) {
      throw new Error(`TTF_Init: ${sdl.SDL_GetError()}`);
    }
    const font = ttf.TTF_OpenFont({ file: fontPath, ptsize: pt });
    if (!font) {
      throw new Error(`TTF_OpenFont(${fontPath}): ${sdl.SDL_GetError()}`);
    }
    this.font = font;
    this.renderer = renderer;
  }

  /** Rendered size of a string at this font's size. */
  measure(text: string): { width: number; height: number } {
    const w = new Int32Array(1);
    const h = new Int32Array(1);
    if (!ttf.TTF_GetStringSize({ font: this.font, text, length: 0, w, h })) {
      throw new Error(`TTF_GetStringSize: ${sdl.SDL_GetError()}`);
    }
    return { width: w[0]!, height: h[0]! };
  }

  /**
   * Queue a text run. White glyphs are rendered once per unique string,
   * uploaded as a texture, and tinted per draw — UI strings repeat every
   * frame, so the cache absorbs nearly all of the cost after frame one.
   */
  draw(
    gpu: { drawTexture(opts: TextureDrawOptions): void },
    opts: TextDrawOptions
  ): void {
    const { x, y, text, tint = 0xffffffff } = opts;
    let run = this.cache.get(text);
    if (!run) {
      run = this.renderRun(text);
      this.cache.set(text, run);
    }
    gpu.drawTexture({ texture: run.texture, x, y, w: run.w, h: run.h, tint });
  }

  private renderRun(text: string): CachedRun {
    // White glyphs — tint carries the color.
    const surface = ttf.TTF_RenderText_Blended({
      font: this.font,
      text,
      color: 0xffffffff,
    });
    if (!surface) {
      throw new Error(`TTF_RenderText_Blended: ${sdl.SDL_GetError()}`);
    }
    const texture = sdl.SDL_CreateTextureFromSurface({
      renderer: this.renderer,
      surface,
    });
    sdl.SDL_DestroySurface({ surface });
    if (!texture) {
      throw new Error(`SDL_CreateTextureFromSurface: ${sdl.SDL_GetError()}`);
    }
    const measured = this.measure(text);
    return { texture, w: measured.width, h: measured.height };
  }

  destroy(): void {
    for (const run of this.cache.values()) {
      sdl.SDL_DestroyTexture({ texture: run.texture });
    }
    this.cache.clear();
    ttf.TTF_CloseFont({ font: this.font });
  }
}
