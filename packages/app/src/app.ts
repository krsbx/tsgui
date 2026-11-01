/**
 * App — the multi-window application shell, ported from flying-pan's
 * App/WindowManager. Owns SDL init, the window registry, event decode
 * + window routing, and the run loop: per frame the app body assigns
 * each window's widget, then every window reconciles → lays out →
 * dispatches → paints (SDL has no GL context switch, so all windows
 * render every frame, unlike flying-pan's active-window-only pass).
 */
import { sdl, SdlDefines } from "@tsgui/bindings";
import { type DecodedEvents, EventDecoder } from "./events.ts";
import { AppWindow, type AppWindowOptions } from "./window.ts";

const FRAME_MS = 16; // ~60fps frame limiter

export interface AppOptions {
  title: string;
  width: number;
  height: number;
  /** Esc closes the app. Default true (the examples' behavior). */
  quitOnEscape?: boolean;
}

export class App {
  /** The root window — closing it stops the app. */
  public readonly root: AppWindow;

  private readonly windows = new Map<number, AppWindow>();
  private readonly decoder = new EventDecoder();
  private readonly quitOnEscape: boolean;
  private running = true;
  private frames_ = 0;

  public constructor(options: AppOptions) {
    this.quitOnEscape = options.quitOnEscape ?? true;

    if (!sdl.SDL_Init({ flags: SdlDefines.SDL_INIT_VIDEO })) {
      throw new Error(`SDL_Init failed: ${sdl.SDL_GetError()}`);
    }

    this.root = this.createWindow({
      title: options.title,
      width: options.width,
      height: options.height,
      resizable: true,
    });
  }

  public get frames(): number {
    return this.frames_;
  }

  /** Every live window (registry order: root first). */
  public get all(): AppWindow[] {
    return [...this.windows.values()];
  }

  public createWindow(options: AppWindowOptions): AppWindow {
    const handle = sdl.SDL_CreateWindow({
      title: options.title,
      w: options.width,
      h: options.height,
      flags: options.resizable ? SdlDefines.SDL_WINDOW_RESIZABLE : 0,
    });
    if (!handle) throw new Error(`SDL_CreateWindow: ${sdl.SDL_GetError()}`);

    const window = new AppWindow(options, handle);
    this.windows.set(window.id, window);
    return window;
  }

  public destroyWindow(window: AppWindow): void {
    if (!this.windows.has(window.id)) return;
    this.windows.delete(window.id);
    window.destroy();
  }

  /**
   * Run until the root window closes. Per frame: poll + route events,
   * then the app body assigns each window's widget, then every window
   * reconciles → lays out → dispatches → paints.
   */
  public run(frameBody: (app: App) => void): void {
    while (this.running) {
      const events = this.decoder.decode(() =>
        sdl.SDL_PollEvent({ event: this.decoder.data })
      );

      this.route(events);
      if (!this.running) break;

      frameBody(this);

      for (const window of this.windows.values()) {
        window.reconcile();
        window.layout();
        window.dispatch(
          events.pointerEvents.filter((e) => e.windowId === window.id),
          events.keyboardEvents.filter((e) => e.windowId === window.id),
          events.wheelEvents.filter((e) => e.windowId === window.id)
        );
        window.paint(performance.now());
      }

      this.frames_++;
      sdl.SDL_Delay({ ms: FRAME_MS });
    }

    this.teardown();
  }

  /** Explicit stop — the run loop exits and tears down. */
  public quit(): void {
    this.running = false;
  }

  private route(events: DecodedEvents): void {
    if (events.quit) this.running = false;

    if (events.escape && this.quitOnEscape) this.running = false;

    for (const request of events.closeRequests) {
      if (request.windowId === this.root.id) {
        this.running = false; // root close — flying-pan's exit semantics
        continue;
      }
      const window = this.windows.get(request.windowId);
      if (window) this.destroyWindow(window);
    }
  }

  private teardown(): void {
    for (const window of this.windows.values()) {
      window.destroy();
    }
    this.windows.clear();
    sdl.SDL_Quit();
  }
}

export { AppWindow, type AppWindowOptions };
export { EventDecoder, type DecodedEvents } from "./events.ts";
