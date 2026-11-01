/**
 * Scroll dispatcher — ported from flying-pan's
 * interactions/dispatcher/scroll, adapted to event-fed input.
 *
 * Wheel events scroll the nearest scrollable ancestor
 * (`overflow: scroll/auto`) of whatever is under the cursor; after the
 * last wheel event the scroll **coasts** — velocity (EMA of the applied
 * deltas) decays by friction each tick until it drops below the
 * threshold or hits an edge.
 *
 * Offsets are keyed by stableId and exposed through `offsetOf` — that is
 * what `LayoutContext.scrollOffsetOf` delegates to, so the layout
 * threads them into `screenX`/`screenY` on the next pass (one-frame
 * latency, documented in LAYOUT.md).
 */
import {
  clamp,
  type Coordinate2D,
  type LayoutNode,
  Overflow,
} from "@tsgui/layout";
import { hitTest } from "./hit-test.ts";
import type { WheelInputEvent } from "./types.ts";

const VELOCITY_ALPHA = 0.35;
const FRICTION = 0.97;
const VELOCITY_THRESHOLD = 0.3;
const FRAME_MS = 1000 / 60;

export interface ScrollDispatchOptions {
  /** Decoded wheel events — may be empty on coasting frames. */
  wheelEvents: readonly WheelInputEvent[];
  root: LayoutNode;
  layoutIndex: Map<number, LayoutNode>;
  /** Frame time in ms — drives coasting. Defaults to the frame rate. */
  time?: number;
}

export class ScrollDispatcher {
  private offsetsById = new Map<number, Coordinate2D>();
  private velocities = new Map<number, Coordinate2D>();
  private lastTime = 0;

  public dispatch(options: ScrollDispatchOptions): void {
    const {
      wheelEvents,
      root,
      layoutIndex,
      time = this.lastTime + FRAME_MS,
    } = options;

    // Framerate-normalized delta time, clamped against stalls.
    const dt = this.lastTime > 0 ? time - this.lastTime : FRAME_MS;
    const dtNorm = clamp({ value: dt / FRAME_MS, min: 0, max: 4 });
    this.lastTime = time;

    if (wheelEvents.length > 0) {
      for (const event of wheelEvents) {
        this.handleWheel(event, root);
      }
      return;
    }

    // No wheel input this frame — coast on remaining velocity.
    this.coast(layoutIndex, dtNorm);
  }

  public reset(): void {
    this.offsetsById.clear();
    this.velocities.clear();
    this.lastTime = 0;
  }

  /** Committed scroll offset — delegate `LayoutContext.scrollOffsetOf` here. */
  public offset = (node: LayoutNode): Coordinate2D => {
    return this.offsetsById.get(node.stableId) ?? { x: 0, y: 0 };
  };

  public get offsetCount(): number {
    return this.offsetsById.size;
  }

  private isScrollable(node: LayoutNode): boolean {
    const overflow = node.widget.style?.overflow;
    return overflow === Overflow.Scroll || overflow === Overflow.Auto;
  }

  private nearestScrollableAncestor(
    root: LayoutNode,
    target: LayoutNode
  ): LayoutNode | null {
    const path: LayoutNode[] = [];
    this.findPath(root, target, path);

    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (node && this.isScrollable(node)) return node;
    }

    return null;
  }

  private findPath(
    node: LayoutNode,
    target: LayoutNode,
    path: LayoutNode[]
  ): boolean {
    path.push(node);

    if (node === target) return true;

    for (const child of node.children) {
      if (this.findPath(child, target, path)) return true;
    }

    path.pop();
    return false;
  }

  private handleWheel(event: WheelInputEvent, root: LayoutNode): void {
    const hit = hitTest({ node: root, x: event.mouseX, y: event.mouseY });
    if (!hit) return;

    const target = this.nearestScrollableAncestor(root, hit);
    if (!target) return;

    const current = this.offsetsById.get(target.stableId) ?? { x: 0, y: 0 };
    const { contentWidth, contentHeight } = measureContent(target);
    const maxScrollX = Math.max(0, contentWidth - target.width);
    const maxScrollY = Math.max(0, contentHeight - target.height);

    // SDL: positive y = wheel up; browsers: positive = down. Negate so
    // wheel-down grows the offset — matches browser feel.
    const nextX = clamp({
      value: current.x + event.scrollX,
      min: 0,
      max: maxScrollX,
    });
    const nextY = clamp({
      value: current.y - event.scrollY,
      min: 0,
      max: maxScrollY,
    });

    this.offsetsById.set(target.stableId, { x: nextX, y: nextY });

    // Velocity via EMA (y negated into offset space). Zero on a clamped
    // axis — hitting the edge while scrolling must not coast past it.
    const vel = this.velocities.get(target.stableId) ?? { x: 0, y: 0 };
    vel.x = vel.x * (1 - VELOCITY_ALPHA) + event.scrollX * VELOCITY_ALPHA;
    vel.y = vel.y * (1 - VELOCITY_ALPHA) + -event.scrollY * VELOCITY_ALPHA;
    if (nextX === current.x) vel.x = 0;
    if (nextY === current.y) vel.y = 0;
    this.velocities.set(target.stableId, vel);
  }

  private coast(layoutIndex: Map<number, LayoutNode>, dtNorm: number): void {
    if (this.velocities.size === 0) return;

    const friction = Math.pow(FRICTION, dtNorm);

    for (const [stableId, vel] of this.velocities) {
      const target = layoutIndex.get(stableId);

      if (!target) {
        // Scrollable widget unmounted — drop its scroll bookkeeping.
        this.offsetsById.delete(stableId);
        this.velocities.delete(stableId);
        continue;
      }

      const current = this.offsetsById.get(stableId) ?? { x: 0, y: 0 };
      const { contentWidth, contentHeight } = measureContent(target);
      const maxScrollX = Math.max(0, contentWidth - target.width);
      const maxScrollY = Math.max(0, contentHeight - target.height);

      const nextX = clamp({
        value: current.x + vel.x * dtNorm,
        min: 0,
        max: maxScrollX,
      });
      const nextY = clamp({
        value: current.y + vel.y * dtNorm,
        min: 0,
        max: maxScrollY,
      });

      this.offsetsById.set(stableId, { x: nextX, y: nextY });

      if (nextX <= 0 || nextX >= maxScrollX) vel.x = 0;
      if (nextY <= 0 || nextY >= maxScrollY) vel.y = 0;

      vel.x *= friction;
      vel.y *= friction;

      if (
        Math.abs(vel.x) < VELOCITY_THRESHOLD &&
        Math.abs(vel.y) < VELOCITY_THRESHOLD
      ) {
        this.velocities.delete(stableId);
      }
    }
  }
}

/** Content-space extent of a laid-out node's children (excludes scroll). */
export function measureContent(node: LayoutNode): {
  contentWidth: number;
  contentHeight: number;
} {
  let maxX = node.x;
  let maxY = node.y;

  for (const child of node.children) {
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }

  return {
    contentWidth: Math.max(0, maxX - node.x),
    contentHeight: Math.max(0, maxY - node.y),
  };
}
