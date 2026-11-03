/**
 * AppWindow — one OS window plus the full toolkit stack bound to it.
 * SDL3 scopes renderers, textures, and font texture caches per renderer
 * (no shared GL context like flying-pan), so every window carries its
 * own GpuRenderer + TtfFont. Reconciler/StateStore/dispatchers are
 * per-window too: stableIds are per-tree namespaces and hover/focus/
 * capture state must not leak across windows. The AnimationManager is
 * per-window only because transition keys are stableIds.
 */
import { AnimationManager } from "@vulcania/animation";
import { sdl } from "@vulcania/bindings";
import {
  type ReconcilableWidget,
  type ReconciledNode,
  StateStore,
} from "@vulcania/core";
import { type FontManager, type WindowFonts } from "@vulcania/fonts";
import { GpuRenderer, TtfFont, type WindowHandle } from "@vulcania/gpu";
import {
  FocusDispatcher,
  type KeyboardInputEvent,
  PointerDispatcher,
  type PointerInputEvent,
  ScrollDispatcher,
  type WheelInputEvent,
} from "@vulcania/interactions";
import { type LayoutContext, layoutFlex, type LayoutNode } from "@vulcania/layout";
import { paintTree } from "@vulcania/paint";
import { Reconciler, widgetPainters } from "@vulcania/widgets";

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface AppWindowOptions {
  title: string;
  width: number;
  height: number;
  /** Resizable — the root usually; child windows stay fixed-size. */
  resizable?: boolean;
  /** Frame clear color (flying-pan's window backgroundColor). */
  backgroundColor?: RGBA;
}

export class AppWindow {
  public readonly id: number;
  public readonly handle: WindowHandle;
  public readonly title: string;

  /** The widget tree the app body assigns every frame. */
  public widget: ReconcilableWidget | null = null;

  /** The reconciled tree — reconcile() populates, layout() consumes. */
  public reconciled: ReconciledNode | null = null;

  /** Last laid-out root — dispatch and paint operate on it. */
  public root: LayoutNode | null = null;

  public readonly renderer: GpuRenderer;
  public readonly fonts: WindowFonts;
  /** The default font — alias of fonts.default. */
  public readonly font: TtfFont;
  public readonly stateStore = new StateStore();
  public readonly reconciler = new Reconciler(this.stateStore);
  public readonly pointer = new PointerDispatcher();
  public readonly focus = new FocusDispatcher();
  public readonly scroll = new ScrollDispatcher();
  public readonly animation = new AnimationManager();
  public readonly layoutIndex = new Map<number, LayoutNode>();
  public readonly layoutCtx: LayoutContext;

  private readonly sizeW = new Int32Array(1);
  private readonly sizeH = new Int32Array(1);
  private readonly posX = new Int32Array(1);
  private readonly posY = new Int32Array(1);

  public constructor(
    options: AppWindowOptions,
    handle: WindowHandle,
    fontManager: FontManager
  ) {
    this.handle = handle;
    this.title = options.title;
    this.id = sdl.SDL_GetWindowID({ window: handle });

    this.renderer = new GpuRenderer(handle);

    if (options.backgroundColor)
      this.renderer.clearColor = options.backgroundColor;
    this.fonts = fontManager.materialize(this.renderer.renderer);
    this.font = this.fonts.default;

    this.layoutCtx = {
      layoutIndex: this.layoutIndex,
      focusableNodes: [],
      scrollOffsetOf: (node) => this.scroll.offset(node),
      getStableId: this.reconciler.getStableId,
      // Named fonts resolve through the window's font set — label
      // layout and label paint measure the same font.
      measureText: (text, _style, fontName) =>
        fontName
          ? this.fonts.get(fontName).measure(text)
          : this.fonts.default.measure(text),
      getImageSize: () => null,
    };

    sdl.SDL_StartTextInput({ window: handle });
  }

  /** Current window size in points — queried fresh each frame. */
  public get size(): { width: number; height: number } {
    sdl.SDL_GetWindowSize({
      window: this.handle,
      w: this.sizeW,
      h: this.sizeH,
    });
    return { width: this.sizeW[0]!, height: this.sizeH[0]! };
  }

  /** Move the window (placing child windows beside the root). */
  public move(to: { x: number; y: number }): void {
    sdl.SDL_SetWindowPosition({ window: this.handle, x: to.x, y: to.y });
  }

  /** Current window position in points — for placing child windows. */
  public get position(): { x: number; y: number } {
    sdl.SDL_GetWindowPosition({
      window: this.handle,
      x: this.posX,
      y: this.posY,
    });
    return { x: this.posX[0]!, y: this.posY[0]! };
  }

  /** Reconcile the assigned widget (identity short-circuit included). */
  public reconcile(): void {
    if (!this.widget) return;
    this.reconciled = this.reconciler.reconcile(this.widget);
  }

  /** Layout the reconciled tree at the current window size. */
  public layout(): void {
    if (!this.reconciled) return;
    this.layoutIndex.clear();
    const { width, height } = this.size;
    this.root = layoutFlex({
      node: this.reconciled.widget,
      x: 0,
      y: 0,
      availableWidth: width,
      availableHeight: height,
      ctx: this.layoutCtx,
    });
  }

  /** Dispatch this window's (already-routed) input queues. */
  public dispatch(
    pointerEvents: (PointerInputEvent & { windowId: number })[],
    keyboardEvents: (KeyboardInputEvent & { windowId: number })[],
    wheelEvents: (WheelInputEvent & { windowId: number })[]
  ): void {
    if (!this.root) return;
    this.pointer.dispatch({
      events: pointerEvents,
      root: this.root,
      layoutIndex: this.layoutIndex,
      stateStore: this.stateStore,
    });
    this.focus.dispatch({
      pointerEvents,
      keyboardEvents,
      root: this.root,
      layoutIndex: this.layoutIndex,
      focusableNodes: this.layoutCtx.focusableNodes,
      stateStore: this.stateStore,
    });
    this.scroll.dispatch({
      wheelEvents,
      root: this.root,
      layoutIndex: this.layoutIndex,
    });
  }

  /** Advance the animation clock, then paint the frame. */
  public paint(now: number): void {
    if (!this.root) return;
    this.animation.tick(now);
    this.renderer.beginFrame();
    paintTree(
      {
        gpu: this.renderer,
        font: this.font,
        statesOf: (node) => ({
          ...this.pointer.statesOf(node),
          ...this.focus.statesOf(node),
        }),
        stateStore: this.stateStore,
        painters: widgetPainters,
        animationManager: this.animation,
      },
      this.root
    );
    this.renderer.present();
  }

  private tornDown = false;

  /** Idempotent — a window destroyed mid-frame by a handler must not
   *  double-destroy its SDL handles (deferred teardown flushes later). */
  public destroy(): void {
    if (this.tornDown) return;
    this.tornDown = true;
    this.fonts.destroy();
    this.renderer.destroy();
    sdl.SDL_DestroyWindow({ window: this.handle });
  }
}
