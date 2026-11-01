/** The GpuRenderer — frame lifecycle and geometry batching. */
import { sdl, SdlDefines } from "@tsgui/bindings";
import type {
  ArcOptions,
  Rect,
  RectOptions,
  RendererHandle,
  RendererOptions,
  Rgba,
  RingOptions,
  RoundedRectOptions,
  TextureDrawOptions,
  TextureHandle,
  WindowHandle,
} from "./types.ts";

// Prop names are string #defines — invisible to the codegen's numeric
// scanner, so they live here verbatim (documented in SDL_render.h).
const PROP_RENDERER_CREATE_NAME = "SDL.renderer.create.name";
const PROP_RENDERER_CREATE_WINDOW = "SDL.renderer.create.window";

// SDL3's SDL_Vertex is 2f position + SDL_FColor (4×f32) + 2f uv — the SDL2
// 20-byte layout with a packed-u32 color silently draws nothing.
const FLOATS_PER_VERTEX = 8;
const BYTES_PER_VERTEX = 32;
const INITIAL_VERTICES = 1 << 16;

export class GpuRenderer {
  public readonly renderer: RendererHandle;
  public readonly name: string;

  private vertexData: Uint8Array;
  private vertexF32: Float32Array;
  private indexData: Int32Array;

  private vertexCount = 0;
  private indexCount = 0;
  /** Texture of the open batch; null = untextured batch. */
  private batchTexture: TextureHandle | null = null;

  /** Scissor stack; empty = no clip. Applied at batch flush boundaries. */
  private readonly clipStack: Array<Rect> = [];
  private readonly clipData = new Int32Array(4);

  public clearColor: Rgba = { r: 32, g: 36, b: 48, a: 255 };

  public constructor(window: WindowHandle, options: RendererOptions = {}) {
    // Prefer the GPU backend; fall back to SDL's default choice. Tests pin
    // `driver` (e.g. "software") for deterministic pixel readback.
    const props = sdl.SDL_CreateProperties();
    sdl.SDL_SetStringProperty({
      props,
      name: PROP_RENDERER_CREATE_NAME,
      value: options.driver ?? "gpu",
    });
    sdl.SDL_SetPointerProperty({
      props,
      name: PROP_RENDERER_CREATE_WINDOW,
      value: window,
    });
    const renderer = sdl.SDL_CreateRendererWithProperties({ props });
    sdl.SDL_DestroyProperties({ props });

    if (renderer) {
      this.renderer = renderer;
    } else {
      // SDL_GetError is sticky from the props attempt — clear so the throw
      // names the fallback's own failure.
      sdl.SDL_ClearError();
      const fallback = sdl.SDL_CreateRenderer({ window, name: null });
      if (!fallback) {
        throw new Error(`GpuRenderer: ${sdl.SDL_GetError()}`);
      }
      this.renderer = fallback;
    }
    this.name = sdl.SDL_GetRendererName({ renderer: this.renderer }) ?? "";
    sdl.SDL_SetRenderDrawBlendMode({
      renderer: this.renderer,
      blendMode: SdlDefines.SDL_BLENDMODE_BLEND,
    });

    this.vertexData = new Uint8Array(INITIAL_VERTICES * BYTES_PER_VERTEX);
    this.vertexF32 = new Float32Array(this.vertexData.buffer);
    this.indexData = new Int32Array(INITIAL_VERTICES * 3);
  }

  /**
   * Start a frame: clear to the clear color and discard last frame's
   * geometry. SDL queues the clear before anything drawn this frame.
   */
  public beginFrame(): void {
    this.vertexCount = 0;
    this.indexCount = 0;
    this.batchTexture = null;
    const c = this.clearColor;
    sdl.SDL_SetRenderDrawColor({
      renderer: this.renderer,
      r: c.r,
      g: c.g,
      b: c.b,
      a: c.a,
    });
    if (!sdl.SDL_RenderClear({ renderer: this.renderer })) {
      throw new Error(`SDL_RenderClear: ${sdl.SDL_GetError()}`);
    }
  }

  private applyClip(): void {
    const top = this.clipStack[this.clipStack.length - 1];
    if (top) {
      this.clipData[0] = top.x;
      this.clipData[1] = top.y;
      this.clipData[2] = top.w;
      this.clipData[3] = top.h;
      if (
        !sdl.SDL_SetRenderClipRect({
          renderer: this.renderer,
          rect: this.clipData,
        })
      ) {
        throw new Error(`SDL_SetRenderClipRect: ${sdl.SDL_GetError()}`);
      }
    } else if (
      !sdl.SDL_SetRenderClipRect({ renderer: this.renderer, rect: null })
    ) {
      throw new Error(`SDL_SetRenderClipRect: ${sdl.SDL_GetError()}`);
    }
  }

  /** Intersect the scissor with the given rect. Flushes the open batch. */
  public pushClip(clip: Rect): void {
    this.flushBatch();
    this.clipStack.push(clip);
    this.applyClip();
  }

  /** Restore the previous scissor (disables clipping when the stack empties). */
  public popClip(): void {
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
      this.indexData = new Int32Array(capacity * 3);
    }
    if (this.indexCount + indices > this.indexData.length) {
      this.indexData = new Int32Array(
        Math.max(this.indexData.length * 2, this.indexCount + indices)
      );
    }
  }

  /**
   * Write one SDL_Vertex: 2f position, SDL_FColor (packed ABGR → 4 floats),
   * 2f uv. `vi` is the float index of the vertex start.
   */
  private writeVertex(
    vi: number,
    x: number,
    y: number,
    color: number,
    u: number,
    v: number
  ): void {
    const f = this.vertexF32;
    f[vi] = x;
    f[vi + 1] = y;
    f[vi + 2] = (color & 255) / 255;
    f[vi + 3] = ((color >>> 8) & 255) / 255;
    f[vi + 4] = ((color >>> 16) & 255) / 255;
    f[vi + 5] = ((color >>> 24) & 255) / 255;
    f[vi + 6] = u;
    f[vi + 7] = v;
  }

  /**
   * Queue an axis-aligned solid-color rectangle for the current frame.
   * Single-object params per the toolkit convention (docs/ARCHITECTURE.md).
   */
  public fillRect({ x, y, w, h, color }: RectOptions): void {
    // Untextured geometry can't join an open textured batch.
    if (this.batchTexture !== null) this.flushBatch();
    this.ensureCapacity(4, 6);
    const base = this.vertexCount;
    const S = FLOATS_PER_VERTEX;
    const vi = base * S;

    this.writeVertex(vi, x, y, color, 0, 0);
    this.writeVertex(vi + S, x + w, y, color, 0, 0);
    this.writeVertex(vi + S * 2, x + w, y + h, color, 0, 0);
    this.writeVertex(vi + S * 3, x, y + h, color, 0, 0);

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
  public drawTexture({
    texture,
    x,
    y,
    w,
    h,
    tint = 0xffffffff,
  }: TextureDrawOptions): void {
    // Any texture change — including untextured → textured — starts a batch.
    if (this.batchTexture !== texture) {
      this.flushBatch();
    }
    this.batchTexture = texture;
    this.ensureCapacity(4, 6);
    const base = this.vertexCount;
    const S = FLOATS_PER_VERTEX;
    const vi = base * S;

    this.writeVertex(vi, x, y, tint, 0, 0);
    this.writeVertex(vi + S, x + w, y, tint, 1, 0);
    this.writeVertex(vi + S * 2, x + w, y + h, tint, 1, 1);
    this.writeVertex(vi + S * 3, x, y + h, tint, 0, 1);

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
  public fillRoundedRect({
    x,
    y,
    w,
    h,
    radius,
    color,
    segments = 8,
  }: RoundedRectOptions): void {
    // Untextured geometry can't join an open textured batch.
    if (this.batchTexture !== null) this.flushBatch();
    const r = Math.min(radius, w / 2, h / 2);
    const P = 4 * (segments + 1); // perimeter points
    this.ensureCapacity(1 + P, P * 3);

    const base = this.vertexCount;
    const S = FLOATS_PER_VERTEX;
    let vi = base * S;

    const cx = x + w / 2;
    const cy = y + h / 2;
    this.writeVertex(vi, cx, cy, color, 0, 0);
    vi += S;

    const corners = [
      { cx: x + w - r, cy: y + r, a0: -Math.PI / 2 }, // TR
      { cx: x + w - r, cy: y + h - r, a0: 0 }, // BR
      { cx: x + r, cy: y + h - r, a0: Math.PI / 2 }, // BL
      { cx: x + r, cy: y + r, a0: Math.PI }, // TL
    ];
    for (const { cx: ccx, cy: ccy, a0 } of corners) {
      for (let i = 0; i <= segments; i++) {
        const a = a0 + (i / segments) * (Math.PI / 2);
        this.writeVertex(
          vi,
          ccx + r * Math.cos(a),
          ccy + r * Math.sin(a),
          color,
          0,
          0
        );
        vi += S;
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

  /**
   * Queue a filled circular sector (pie slice) — tessellated fan from the
   * center. A zero sweep draws nothing; negative sweeps run backwards.
   */
  public fillArc({
    cx,
    cy,
    radius,
    startAngle,
    endAngle,
    color,
    segments = 64,
  }: ArcOptions): void {
    // Untextured geometry can't join an open textured batch.
    if (this.batchTexture !== null) this.flushBatch();

    const sweep = endAngle - startAngle;
    if (sweep === 0) return;
    const count = Math.max(
      2,
      Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * segments)
    );
    this.ensureCapacity(2 + count, count * 3);

    const base = this.vertexCount;
    const S = FLOATS_PER_VERTEX;
    let vi = base * S;
    this.writeVertex(vi, cx, cy, color, 0, 0);
    vi += S;
    for (let i = 0; i <= count; i++) {
      const a = startAngle + (sweep * i) / count;
      this.writeVertex(
        vi,
        cx + radius * Math.cos(a),
        cy + radius * Math.sin(a),
        color,
        0,
        0
      );
      vi += S;
    }

    let ii = this.indexCount;
    for (let i = 1; i <= count; i++) {
      this.indexData[ii++] = base;
      this.indexData[ii++] = base + i;
      this.indexData[ii++] = base + i + 1;
    }

    this.vertexCount += 2 + count;
    this.indexCount = ii;
  }

  /**
   * Queue an annular sector (ring segment) — tessellated quad strip between
   * the outer and inner radii. `innerRadius: 0` degenerates to a pie; use
   * {@link fillArc} for that.
   */
  public fillRing({
    cx,
    cy,
    innerRadius,
    radius,
    startAngle,
    endAngle,
    color,
    segments = 64,
  }: RingOptions): void {
    // Untextured geometry can't join an open textured batch.
    if (this.batchTexture !== null) this.flushBatch();

    const sweep = endAngle - startAngle;
    if (sweep === 0) return;
    const count = Math.max(
      2,
      Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * segments)
    );
    this.ensureCapacity((count + 1) * 2, count * 6);

    const base = this.vertexCount;
    const S = FLOATS_PER_VERTEX;
    let vi = base * S;
    for (let i = 0; i <= count; i++) {
      const a = startAngle + (sweep * i) / count;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      this.writeVertex(vi, cx + radius * cos, cy + radius * sin, color, 0, 0);
      vi += S;
      this.writeVertex(
        vi,
        cx + innerRadius * cos,
        cy + innerRadius * sin,
        color,
        0,
        0
      );
      vi += S;
    }

    let ii = this.indexCount;
    for (let i = 0; i < count; i++) {
      const outer = base + i * 2;
      const inner = outer + 1;
      const nextOuter = outer + 2;
      const nextInner = outer + 3;
      this.indexData[ii++] = outer;
      this.indexData[ii++] = inner;
      this.indexData[ii++] = nextOuter;
      this.indexData[ii++] = nextOuter;
      this.indexData[ii++] = inner;
      this.indexData[ii++] = nextInner;
    }

    this.vertexCount += (count + 1) * 2;
    this.indexCount = ii;
  }

  private flushBatch(): void {
    if (this.indexCount === 0) return;
    const ok = sdl.SDL_RenderGeometry({
      renderer: this.renderer,
      texture: this.batchTexture,
      vertices: new Uint8Array(
        this.vertexData.buffer,
        0,
        this.vertexCount * BYTES_PER_VERTEX
      ),
      num_vertices: this.vertexCount,
      indices: new Int32Array(this.indexData.buffer, 0, this.indexCount),
      num_indices: this.indexCount,
    });
    if (!ok) {
      throw new Error(`SDL_RenderGeometry: ${sdl.SDL_GetError()}`);
    }
    // The batch is sent — restart accumulation, or the next flush re-renders
    // every earlier quad under the newer batch's texture.
    this.vertexCount = 0;
    this.indexCount = 0;
    this.batchTexture = null;
  }

  /** Send all queued geometry to SDL without presenting. */
  public flush(): void {
    this.flushBatch();
  }

  /** Flush remaining batches and present the frame. */
  public present(): void {
    this.flushBatch();
    if (!sdl.SDL_RenderPresent({ renderer: this.renderer })) {
      throw new Error(`SDL_RenderPresent: ${sdl.SDL_GetError()}`);
    }
  }

  public destroy(): void {
    sdl.SDL_DestroyRenderer({ renderer: this.renderer });
  }
}
