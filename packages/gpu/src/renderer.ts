/** The GpuRenderer — frame lifecycle and geometry batching. */
import { SdlDefines, sdlRaw } from "@tsgui/bindings";
import type {
  RectOptions,
  RendererHandle,
  Rgba,
  TextureDrawOptions,
  TextureHandle,
  WindowHandle,
} from "./types.ts";

// Prop names are string #defines — invisible to the codegen's numeric
// scanner, so they live here verbatim (documented in SDL_render.h).
const PROP_RENDERER_CREATE_NAME = "SDL.renderer.create.name";

const FLOATS_PER_VERTEX = 5;
const BYTES_PER_VERTEX = 20; // 2f pos + 4×u8 color + 2f uv
const INITIAL_VERTICES = 1 << 16;

export class GpuRenderer {
  readonly renderer: RendererHandle;
  readonly name: string;

  private vertexData: Uint8Array;
  private vertexF32: Float32Array;
  private vertexU32: Uint32Array;
  private indexData: Int32Array;

  private vertexCount = 0;
  private indexCount = 0;
  /** Texture of the open batch; null = untextured batch. */
  private batchTexture: TextureHandle | null = null;

  /** Scissor stack; empty = no clip. Applied at batch flush boundaries. */
  private readonly clipStack: Array<{ x: number; y: number; w: number; h: number }> = [];
  private readonly clipData = new Int32Array(4);

  clearColor: Rgba = { r: 32, g: 36, b: 48, a: 255 };

  constructor(window: WindowHandle) {
    // Prefer the GPU backend; fall back to SDL's default choice.
    const props = sdlRaw.SDL_CreateProperties();
    sdlRaw.SDL_SetStringProperty(props, PROP_RENDERER_CREATE_NAME, "gpu");
    const renderer = sdlRaw.SDL_CreateRendererWithProperties(props);
    sdlRaw.SDL_DestroyProperties(props);

    if (renderer) {
      this.renderer = renderer;
    } else {
      const fallback = sdlRaw.SDL_CreateRenderer(window, null);
      if (!fallback) {
        throw new Error(`GpuRenderer: ${sdlRaw.SDL_GetError()}`);
      }
      this.renderer = fallback;
    }
    this.name = sdlRaw.SDL_GetRendererName(this.renderer) ?? "";
    sdlRaw.SDL_SetRenderDrawBlendMode(
      this.renderer,
      SdlDefines.SDL_BLENDMODE_BLEND
    );

    this.vertexData = new Uint8Array(INITIAL_VERTICES * BYTES_PER_VERTEX);
    this.vertexF32 = new Float32Array(this.vertexData.buffer);
    this.vertexU32 = new Uint32Array(this.vertexData.buffer);
    this.indexData = new Int32Array(INITIAL_VERTICES * 3);
  }

  /**
   * Start a frame: clear to the clear color and discard last frame's
   * geometry. SDL queues the clear before anything drawn this frame.
   */
  beginFrame(): void {
    this.vertexCount = 0;
    this.indexCount = 0;
    this.batchTexture = null;
    const c = this.clearColor;
    sdlRaw.SDL_SetRenderDrawColor(this.renderer, c.r, c.g, c.b, c.a);
    if (!sdlRaw.SDL_RenderClear(this.renderer)) {
      throw new Error(`SDL_RenderClear: ${sdlRaw.SDL_GetError()}`);
    }
  }

  private applyClip(): void {
    const top = this.clipStack[this.clipStack.length - 1];
    if (top) {
      this.clipData[0] = top.x;
      this.clipData[1] = top.y;
      this.clipData[2] = top.w;
      this.clipData[3] = top.h;
      if (!sdlRaw.SDL_SetRenderClipRect(this.renderer, this.clipData)) {
        throw new Error(`SDL_SetRenderClipRect: ${sdlRaw.SDL_GetError()}`);
      }
    } else if (!sdlRaw.SDL_SetRenderClipRect(this.renderer, null)) {
      throw new Error(`SDL_SetRenderClipRect: ${sdlRaw.SDL_GetError()}`);
    }
  }

  /** Intersect the scissor with the given rect. Flushes the open batch. */
  pushClip(clip: { x: number; y: number; w: number; h: number }): void {
    this.flushBatch();
    this.clipStack.push(clip);
    this.applyClip();
  }

  /** Restore the previous scissor (disables clipping when the stack empties). */
  popClip(): void {
    if (this.clipStack.length === 0) return;
    this.flushBatch();
    this.clipStack.pop();
    this.applyClip();
  }

  private ensureCapacity(vertices: number, indices: number): void {
    const neededVerts = this.vertexCount + vertices;
    if (neededVerts > this.vertexData.byteLength / BYTES_PER_VERTEX) {
      let capacity = this.vertexData.byteLength / BYTES_PER_VERTEX;
      while (capacity < neededVerts) capacity *= 2;
      const data = new Uint8Array(capacity * BYTES_PER_VERTEX);
      data.set(this.vertexData);
      this.vertexData = data;
      this.vertexF32 = new Float32Array(data.buffer);
      this.vertexU32 = new Uint32Array(data.buffer);
      this.indexData = new Int32Array(capacity * 3);
    }
    if (this.indexCount + indices > this.indexData.length) {
      this.indexData = new Int32Array(
        Math.max(this.indexData.length * 2, this.indexCount + indices)
      );
    }
  }

  /**
   * Queue an axis-aligned solid-color rectangle for the current frame.
   * Single-object params per the toolkit convention (docs/ARCHITECTURE.md).
   */
  fillRect({ x, y, w, h, color }: RectOptions): void {
    this.ensureCapacity(4, 6);
    const base = this.vertexCount;
    const f = this.vertexF32;
    const u32 = this.vertexU32;

    let vi = base * FLOATS_PER_VERTEX;
    f[vi] = x; f[vi + 1] = y; u32[vi + 2] = color; f[vi + 3] = 0; f[vi + 4] = 0;
    vi += FLOATS_PER_VERTEX;
    f[vi] = x + w; f[vi + 1] = y; u32[vi + 2] = color; f[vi + 3] = 0; f[vi + 4] = 0;
    vi += FLOATS_PER_VERTEX;
    f[vi] = x + w; f[vi + 1] = y + h; u32[vi + 2] = color; f[vi + 3] = 0; f[vi + 4] = 0;
    vi += FLOATS_PER_VERTEX;
    f[vi] = x; f[vi + 1] = y + h; u32[vi + 2] = color; f[vi + 3] = 0; f[vi + 4] = 0;

    let ii = this.indexCount;
    this.indexData[ii++] = base;
    this.indexData[ii++] = base + 1;
    this.indexData[ii++] = base + 2;
    this.indexData[ii++] = base;
    this.indexData[ii++] = base + 2;
    this.indexData[ii++] = base + 3;

    this.vertexCount += 4;
    this.indexCount = ii;
  }

  /**
   * Queue a textured quad (uv 0..1, white tint). Starts a new batch when the
   * texture differs from the open batch's texture.
   */
  drawTexture({ texture, x, y, w, h, tint = 0xffffffff }: TextureDrawOptions): void {
    if (this.batchTexture !== null && this.batchTexture !== texture) {
      this.flushBatch();
    }
    this.batchTexture = texture;
    this.ensureCapacity(4, 6);
    const base = this.vertexCount;
    const f = this.vertexF32;
    const u32 = this.vertexU32;

    let vi = base * FLOATS_PER_VERTEX;
    f[vi] = x; f[vi + 1] = y; u32[vi + 2] = tint; f[vi + 3] = 0; f[vi + 4] = 0;
    vi += FLOATS_PER_VERTEX;
    f[vi] = x + w; f[vi + 1] = y; u32[vi + 2] = tint; f[vi + 3] = 1; f[vi + 4] = 0;
    vi += FLOATS_PER_VERTEX;
    f[vi] = x + w; f[vi + 1] = y + h; u32[vi + 2] = tint; f[vi + 3] = 1; f[vi + 4] = 1;
    vi += FLOATS_PER_VERTEX;
    f[vi] = x; f[vi + 1] = y + h; u32[vi + 2] = tint; f[vi + 3] = 0; f[vi + 4] = 1;

    let ii = this.indexCount;
    this.indexData[ii++] = base;
    this.indexData[ii++] = base + 1;
    this.indexData[ii++] = base + 2;
    this.indexData[ii++] = base;
    this.indexData[ii++] = base + 2;
    this.indexData[ii++] = base + 3;

    this.vertexCount += 4;
    this.indexCount = ii;
  }

  /**
   * Queue an axis-aligned rounded rectangle (CPU-tessellated triangle fan
   * from the center — convex, so one fan covers the shape). Aliased edges;
   * the SDF upgrade lands via SDL_SetGPURenderState later.
   */
  fillRoundedRect({
    x,
    y,
    w,
    h,
    radius,
    color,
    segments = 8,
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    /** Packed color — see {@link rgba}. */
    color: number;
    /** Arc segments per corner (8 ≈ smooth at UI sizes). */
    segments?: number;
  }): void {
    const r = Math.min(radius, w / 2, h / 2);
    const P = 4 * (segments + 1); // perimeter points
    this.ensureCapacity(1 + P, P * 3);

    const base = this.vertexCount;
    const f = this.vertexF32;
    const u32 = this.vertexU32;

    const cx = x + w / 2;
    const cy = y + h / 2;
    let vi = base * FLOATS_PER_VERTEX;
    f[vi] = cx;
    f[vi + 1] = cy;
    u32[vi + 2] = color;
    vi += FLOATS_PER_VERTEX;

    const corners = [
      { cx: x + w - r, cy: y + r, a0: -Math.PI / 2 }, // TR
      { cx: x + w - r, cy: y + h - r, a0: 0 }, // BR
      { cx: x + r, cy: y + h - r, a0: Math.PI / 2 }, // BL
      { cx: x + r, cy: y + r, a0: Math.PI }, // TL
    ];
    for (const { cx: ccx, cy: ccy, a0 } of corners) {
      for (let i = 0; i <= segments; i++) {
        const a = a0 + (i / segments) * (Math.PI / 2);
        f[vi] = ccx + r * Math.cos(a);
        f[vi + 1] = ccy + r * Math.sin(a);
        u32[vi + 2] = color;
        vi += FLOATS_PER_VERTEX;
      }
    }

    let ii = this.indexCount;
    for (let i = 1; i <= P; i++) {
      this.indexData[ii++] = base;
      this.indexData[ii++] = base + i;
      this.indexData[ii++] = base + (i === P ? 1 : i + 1);
    }

    this.vertexCount += 1 + P;
    this.indexCount = ii;
  }

  private flushBatch(): void {
    if (this.indexCount === 0) return;
    const ok = sdlRaw.SDL_RenderGeometry(
      this.renderer,
      this.batchTexture,
      new Uint8Array(this.vertexData.buffer, 0, this.vertexCount * BYTES_PER_VERTEX),
      this.vertexCount,
      new Int32Array(this.indexData.buffer, 0, this.indexCount),
      this.indexCount
    );
    if (!ok) {
      throw new Error(`SDL_RenderGeometry: ${sdlRaw.SDL_GetError()}`);
    }
  }

  /** Flush remaining batches and present the frame. */
  present(): void {
    this.flushBatch();
    if (!sdlRaw.SDL_RenderPresent(this.renderer)) {
      throw new Error(`SDL_RenderPresent: ${sdlRaw.SDL_GetError()}`);
    }
  }

  destroy(): void {
    sdlRaw.SDL_DestroyRenderer(this.renderer);
  }
}
