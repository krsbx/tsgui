/** Transition contracts — ported from flying-pan's animation/types. */
import type { AnimatableProperty, EasingName } from "@vulcania/layout";

export interface TransitionConfig {
  /** Which property to animate. Default: 'all' */
  property?: AnimatableProperty | "all";
  /** Duration in milliseconds. */
  duration: number;
  /** Easing curve name. Default: 'ease'. */
  easing?: EasingName;
}

export type ActiveTransition = {
  from: string | number;
  to: string | number;
  startTime: number;
  duration: number;
  easing: EasingName;
};

export type { Transition } from "@vulcania/layout";
