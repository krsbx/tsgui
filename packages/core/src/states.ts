/**
 * Interaction states — the per-node flag record the dispatchers produce
 * (hover/press/focus) and the paint walk consumes (plus checked/disabled,
 * folded in from widget state). A shared contract so `@vulcania/interactions`
 * and `@vulcania/paint` can agree on it without knowing each other.
 */
export interface InteractionStates {
  hovered: boolean;
  focused: boolean;
  pressed: boolean;
  checked: boolean;
  disabled: boolean;
}

/** The all-off record — no dispatch wired, or a bare container node. */
export const STATES_NONE: InteractionStates = {
  hovered: false,
  focused: false,
  pressed: false,
  checked: false,
  disabled: false,
};
