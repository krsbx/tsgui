/**
 * Focus dispatcher — ported from flying-pan's
 * interactions/dispatcher/focus, adapted to event-fed input.
 *
 * Focusable nodes come from layout (tree order = tab order). Clicking a
 * focusable widget (or its nearest focusable ancestor) focuses it;
 * clicking dead space blurs, HTML-style. Tab / shift-Tab cycles focus.
 * Key and char events route to the focused widget; Enter / Space
 * synthesize a click on activable widgets (fresh press only).
 */
import { WidgetType, type LayoutNode } from "@tsgui/layout";
import { hitTest } from "./hit-test.ts";
import {
  KeyboardInputKind,
  PointerInputKind,
  type KeyboardInputEvent,
  type PointerInputEvent,
} from "./types.ts";
import {
  KeyCode,
  MouseButton,
  type KeyModifiers,
  type ReconcilableWidget,
} from "../types.ts";

/** Blur/focus payloads are built inline; the handlers define the shape. */
type Widget = ReconcilableWidget;

function blurOf(node: LayoutNode, relatedStableId: number | null): void {
  (node.widget as Widget).onBlur?.({ stableId: node.stableId, relatedStableId });
}

/** Widgets that synthesize onClick from Enter / Space while focused. */
const ACTIVABLE = new Set<string>([
  WidgetType.Button,
  WidgetType.Checkbox,
  WidgetType.Radio,
  WidgetType.Toggle,
]);

export interface FocusDispatchOptions {
  /** Same decoded pointer events the pointer dispatcher consumes. */
  pointerEvents: readonly PointerInputEvent[];
  /** Decoded keyboard events — key down/up/char. */
  keyboardEvents: readonly KeyboardInputEvent[];
  root: LayoutNode;
  layoutIndex: Map<number, LayoutNode>;
  /** Focusable nodes collected during layout — tree order = tab order. */
  focusableNodes: LayoutNode[];
}

export class FocusDispatcher {
  private focusedId: number | null = null;
  private pendingFocusStableId: number | null = null;
  private pendingBlur = false;

  public dispatch(options: FocusDispatchOptions): void {
    const { pointerEvents, keyboardEvents, root, layoutIndex, focusableNodes } =
      options;

    // 1. Validate current focus — blur if unmounted or no longer focusable.
    if (this.focusedId !== null) {
      const node = layoutIndex.get(this.focusedId) ?? null;
      if (!node || node.widget.style?.focusable !== true) {
        const old = node;
        this.focusedId = null;
        if (old) blurOf(old, null);
      }
    }

    // 2. Programmatic focus / blur requests.
    this.applyPending(layoutIndex);

    // 3. Tab cycling (intercepted — never forwarded).
    for (const event of keyboardEvents) {
      if (event.kind === KeyboardInputKind.KeyDown && event.key === KeyCode.Tab) {
        this.cycleTab(event.modifiers, focusableNodes, layoutIndex);
        break;
      }
    }

    // 4. Click-to-focus on the left-button down edge.
    for (const event of pointerEvents) {
      if (event.kind === PointerInputKind.Down && event.button === MouseButton.Left) {
        this.handleClick(event.x, event.y, root, layoutIndex);
        break;
      }
    }

    // 5. Route keyboard events to the (possibly newly) focused widget.
    if (this.focusedId !== null) {
      const node = layoutIndex.get(this.focusedId) ?? null;
      if (node) {
        for (const event of keyboardEvents) {
          this.route(event, node);
        }
      }
    }
  }

  public reset(): void {
    this.focusedId = null;
    this.pendingFocusStableId = null;
    this.pendingBlur = false;
  }

  /** Interaction flags for the paint walk — the :focus pseudo-state. */
  public statesOf(node: LayoutNode): { focused: boolean } {
    return { focused: node.stableId === this.focusedId };
  }

  /** Programmatic focus — applied on the next dispatch, HTML-style. */
  public focus(target: number | { stableId: number }): void {
    this.pendingFocusStableId =
      typeof target === "number" ? target : target.stableId;
    this.pendingBlur = false;
  }

  public blur(): void {
    this.pendingBlur = true;
    this.pendingFocusStableId = null;
  }

  public get focusedStableId(): number | null {
    return this.focusedId;
  }

  private applyPending(layoutIndex: Map<number, LayoutNode>): void {
    if (this.pendingBlur) {
      this.pendingBlur = false;

      if (this.focusedId !== null) {
        const old = layoutIndex.get(this.focusedId) ?? null;
        this.focusedId = null;
        if (old) blurOf(old, null);
      }
    }

    if (this.pendingFocusStableId !== null) {
      const id = this.pendingFocusStableId;
      this.pendingFocusStableId = null;

      const node = layoutIndex.get(id) ?? null;
      if (node && node.widget.style?.focusable === true) {
        this.moveFocus(node, layoutIndex);
      }
    }
  }

  private cycleTab(
    modifiers: KeyModifiers,
    focusableNodes: LayoutNode[],
    layoutIndex: Map<number, LayoutNode>
  ): void {
    if (focusableNodes.length === 0) return;

    const shift = (modifiers & 1) !== 0; // KeyModifiers.Shift
    const currentIndex = this.focusedId
      ? focusableNodes.findIndex((n) => n.stableId === this.focusedId)
      : -1;

    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = shift ? focusableNodes.length - 1 : 0;
    } else if (shift) {
      nextIndex = (currentIndex - 1 + focusableNodes.length) % focusableNodes.length;
    } else {
      nextIndex = (currentIndex + 1) % focusableNodes.length;
    }

    const target = focusableNodes[nextIndex];
    if (target) this.moveFocus(target, layoutIndex);
  }

  private handleClick(
    x: number,
    y: number,
    root: LayoutNode,
    layoutIndex: Map<number, LayoutNode>
  ): void {
    const hit = hitTest({ node: root, x, y });
    const target = hit ? this.nearestFocusableAncestor(root, hit) : null;

    if (target) {
      this.moveFocus(target, layoutIndex);
      return;
    }

    // Clicked dead space → blur, HTML-style.
    if (this.focusedId !== null) {
      const old = layoutIndex.get(this.focusedId) ?? null;
      this.focusedId = null;
      if (old) blurOf(old, null);
    }
  }

  private moveFocus(node: LayoutNode, layoutIndex: Map<number, LayoutNode>): void {
    if (this.focusedId === node.stableId) return;

    const relatedStableId = this.focusedId;
    const oldNode =
      relatedStableId !== null ? (layoutIndex.get(relatedStableId) ?? null) : null;

    this.focusedId = node.stableId;

    if (oldNode) blurOf(oldNode, node.stableId);

    (node.widget as ReconcilableWidget).onFocus?.({
      stableId: node.stableId,
      relatedStableId,
    });
  }

  private route(event: KeyboardInputEvent, node: LayoutNode): void {
    const widget = node.widget as ReconcilableWidget;

    if (event.kind === KeyboardInputKind.Char) {
      widget.onChar?.({ text: event.text ?? "", stableId: node.stableId, node });
      return;
    }

    // Tab is intercepted for cycling and never forwarded.
    if (event.key === KeyCode.Tab) return;

    const payload = {
      key: event.key,
      modifiers: event.modifiers,
      repeat: event.repeat ?? false,
      stableId: node.stableId,
      node,
    };

    if (event.kind === KeyboardInputKind.KeyDown) {
      widget.onKeyDown?.(payload);

      // Enter / Space activate the focused widget (HTML semantics) —
      // fresh press only, auto-repeat must not re-click.
      const fresh = !payload.repeat;
      if (
        fresh &&
        (event.key === KeyCode.Enter || event.key === KeyCode.Space) &&
        ACTIVABLE.has(node.widget.type)
      ) {
        widget.onClick?.({
          x: 0,
          y: 0,
          button: MouseButton.Left,
          count: 1,
          stableId: node.stableId,
          node,
          captured: false,
        });
      }
      return;
    }

    if (event.kind === KeyboardInputKind.KeyUp) {
      widget.onKeyUp?.(payload);
    }
  }

  private nearestFocusableAncestor(
    root: LayoutNode,
    target: LayoutNode
  ): LayoutNode | null {
    const path: LayoutNode[] = [];
    this.findPath(root, target, path);

    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (node && node.widget.style?.focusable) return node;
    }

    return null;
  }

  private findPath(node: LayoutNode, target: LayoutNode, path: LayoutNode[]): boolean {
    path.push(node);

    if (node === target) return true;

    for (const child of node.children) {
      if (this.findPath(child, target, path)) return true;
    }

    path.pop();
    return false;
  }
}
