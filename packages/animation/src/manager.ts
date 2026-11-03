/**
 * AnimationManager — the transition engine, ported from flying-pan's
 * animation/manager. The paint walk feeds every resolved style through
 * `applyOverlay`; changed properties transition from their currently
 * displayed value (retargeting mid-flight) and the overlay overrides the
 * resolved style until the transition completes.
 *
 * One deliberate change from flying-pan: `tick` TAKES the frame time so
 * headless tests drive the clock deterministically (production passes
 * `performance.now()`).
 */
import {
  AnimatableProperty,
  EasingName,
  type Transition,
  type ViewStyle,
} from "@vulcania/layout";
import { parseColor } from "./color.ts";
import { easings } from "./easing.ts";
import { interpolate } from "./interpolate.ts";
import type { ActiveTransition, TransitionConfig } from "./types.ts";

const ALL_ANIMATABLE = Object.values(AnimatableProperty);

export class AnimationManager {
  /** key → property → ActiveTransition. Key = `${stableId}` or `${stableId}:${subKey}` */
  private active = new Map<string, Map<string, ActiveTransition>>();
  /** key → property → last displayed value (change detection + first-snap). */
  private lastValue = new Map<string, Map<string, string | number>>();
  private timeValue = 0;

  public tick(now: number = performance.now()): void {
    this.timeValue = now;
    this.cull();
  }

  public get time(): number {
    return this.timeValue;
  }

  /**
   * Overlay any in-flight transitions onto a resolved style. Reads the
   * target values from `resolved` itself — the caller resolves
   * pseudo-states first, so a hover color change animates like a
   * prop change would.
   */
  public applyOverlay(
    stableId: number,
    resolved: ViewStyle,
    transition: Transition,
    subKey?: string
  ): ViewStyle {
    const key = subKey !== undefined ? `${stableId}:${subKey}` : `${stableId}`;
    const configs = Array.isArray(transition) ? transition : [transition];
    const now = this.timeValue;

    let overlay = resolved;
    let dirty = false;

    for (const config of configs) {
      for (const prop of this.resolveProps(config, resolved)) {
        const target = resolved[prop as keyof ViewStyle] as
          string | number | undefined;
        if (target === undefined) continue;

        let lvMap = this.lastValue.get(key);
        if (!lvMap) {
          lvMap = new Map();
          this.lastValue.set(key, lvMap);
        }

        let aMap = this.active.get(key);
        if (!aMap) {
          aMap = new Map();
          this.active.set(key, aMap);
        }

        const prev = lvMap.get(prop);

        // First time seeing this property — snap, no transition.
        if (prev === undefined) {
          lvMap.set(prop, target);
          continue;
        }

        // No change — drop any completed transition, nothing to override.
        // Color values compare parse-normalized: an interpolated #ffffffff
        // must settle against a style target written #ffffff, or the
        // overlay would re-anchor every frame forever.
        if (this.sameValue(prev, target)) {
          aMap.delete(prop);
          continue;
        }

        // Target changed — start or retarget from the displayed value.
        let active = aMap.get(prop);
        if (!active || !this.sameValue(active.to, target)) {
          active = {
            from: active ? this.sampleAt(active, now) : prev,
            to: target,
            startTime: now,
            duration: config.duration,
            easing: config.easing ?? EasingName.Ease,
          };
          aMap.set(prop, active);
        }

        const value = this.sampleAt(active, now);
        lvMap.set(prop, value);

        if ((now - active.startTime) / Math.max(1, active.duration) >= 1) {
          aMap.delete(prop);
        }

        if (value !== target) {
          if (!dirty) {
            overlay = { ...resolved };
            dirty = true;
          }
          (overlay as Record<string, unknown>)[prop] = value;
        }
      }
    }

    return overlay;
  }

  /** Release every transition for a widget (call from unmount paths). */
  public destroy(stableId: number): void {
    const prefix = `${stableId}`;
    const prefixColon = `${stableId}:`;

    for (const key of this.lastValue.keys()) {
      if (key === prefix || key.startsWith(prefixColon)) {
        this.lastValue.delete(key);
        this.active.delete(key);
      }
    }
  }

  private sameValue(a: string | number, b: string | number): boolean {
    if (a === b) return true;
    if (typeof a === "string" && typeof b === "string") {
      return parseColor(a) === parseColor(b);
    }
    return false;
  }

  private resolveProps(
    config: TransitionConfig,
    resolved: ViewStyle
  ): AnimatableProperty[] {
    const prop = config.property ?? "all";

    if (prop === "all") {
      return ALL_ANIMATABLE.filter(
        (p) => resolved[p as keyof ViewStyle] !== undefined
      );
    }

    return [prop];
  }

  private sampleAt(t: ActiveTransition, now: number): string | number {
    const raw = Math.min(
      1,
      Math.max(0, (now - t.startTime) / Math.max(1, t.duration))
    );

    const easingFn = easings[t.easing] ?? easings[EasingName.Ease];

    return interpolate(t.from, t.to, easingFn(raw));
  }

  private cull(): void {
    // Safety cap — clear everything if too many orphaned entries.
    if (this.active.size > 1000) {
      this.active.clear();
      this.lastValue.clear();
      return;
    }

    const now = this.timeValue;

    // Strictly-expired only: an active at exactly raw 1 still owes the
    // walk its final sample (the frame where the value lands on the
    // target), which applyOverlay takes and then deletes itself.
    for (const [, propMap] of this.active) {
      for (const [prop, t] of propMap) {
        if ((now - t.startTime) / Math.max(1, t.duration) > 1) {
          propMap.delete(prop);
        }
      }
    }
  }
}
