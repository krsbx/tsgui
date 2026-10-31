/**
 * Slider geometry — position↔value mapping and handle hit tests, ported
 * from flying-pan's widget/slider/{utility,constant}.
 */
import { CircularProgressDirection, valueToRatio } from "@tsgui/layout";
import type { CircularSliderProps } from "./types.ts";

export const TRACK_THICKNESS = 4;
export const HANDLE_SIZE = 16;
export const TICK_SIZE = 3;
export const TICK_LABEL_FONT_SIZE = 10;

export const DEFAULT_CIRCULAR_SIZE = 48;
export const DEFAULT_CIRCULAR_THICKNESS = 0.15;
export const DEFAULT_START_ANGLE = -Math.PI / 2;
export const DEFAULT_SWEEP = Math.PI * 2;

const TAU = Math.PI * 2;

export interface CircularGeometry {
  cx: number;
  cy: number;
  startAngle: number;
  sweep: number;
  /** +1 clockwise, −1 counter-clockwise. */
  direction: 1 | -1;
  min: number;
  max: number;
}

/** Screen position along the track → value, honoring step and HANDLE inset. */
export function pointerToValue(options: {
  coord: number;
  start: number;
  length: number;
  flip?: boolean;
  min: number;
  max: number;
  step?: number;
}): number {
  const { coord, start, length, flip, min, max, step } = options;

  const usable = length - HANDLE_SIZE;
  const rel = flip
    ? start + length - HANDLE_SIZE / 2 - coord
    : coord - start - HANDLE_SIZE / 2;

  const ratio = Math.min(1, Math.max(0, rel / usable));
  const raw = min + ratio * (max - min);

  return step ? Math.round(raw / step) * step : raw;
}

/** Angle under the pointer → value along the circular sweep. */
export function pointerToAngleValue(
  options: CircularGeometry & {
    pointerX: number;
    pointerY: number;
    step?: number;
  }
): number {
  const {
    pointerX,
    pointerY,
    cx,
    cy,
    startAngle,
    sweep,
    direction,
    min,
    max,
    step,
  } = options;

  const raw = Math.atan2(pointerY - cy, pointerX - cx);
  let rel = direction * (raw - startAngle);
  rel = ((rel % TAU) + TAU) % TAU;

  const clamped = Math.min(rel, sweep);
  const ratio = sweep > 0 ? clamped / sweep : 0;
  const rawValue = min + ratio * (max - min);

  return step ? Math.round(rawValue / step) * step : rawValue;
}

export function resolveGeometry(
  props: CircularSliderProps,
  node: { screenX: number; screenY: number; width: number; height: number }
): CircularGeometry {
  return {
    cx: node.screenX + node.width / 2,
    cy: node.screenY + node.height / 2,
    startAngle: props.startAngle ?? DEFAULT_START_ANGLE,
    sweep: props.sweep ?? DEFAULT_SWEEP,
    direction:
      props.direction === CircularProgressDirection.CounterClockwise ? -1 : 1,
    min: props.min ?? 0,
    max: props.max ?? 100,
  };
}

/** Is the pointer inside the handle square for `ratio`? */
export function isOnBarHandle(options: {
  x: number;
  y: number;
  node: { screenX: number; screenY: number; width: number; height: number };
  ratio: number;
  isVertical: boolean;
}): boolean {
  const { x, y, node, ratio, isVertical } = options;
  const hx = isVertical
    ? node.screenX + (node.width - HANDLE_SIZE) / 2
    : node.screenX + ratio * (node.width - HANDLE_SIZE);
  const hy = isVertical
    ? node.screenY + (1 - ratio) * (node.height - HANDLE_SIZE)
    : node.screenY + (node.height - HANDLE_SIZE) / 2;

  return x >= hx && x <= hx + HANDLE_SIZE && y >= hy && y <= hy + HANDLE_SIZE;
}

/** Is the pointer on the circular handle dot for `value`? */
export function isOnCircularHandle(options: {
  x: number;
  y: number;
  geo: CircularGeometry;
  value: number;
  size: number;
  thickness: number;
}): boolean {
  const { x, y, geo, value, size, thickness } = options;
  const ratio = valueToRatio({ value, min: geo.min, max: geo.max });
  const handleAngle = geo.startAngle + geo.direction * geo.sweep * ratio;
  const radius = size / 2;
  const innerRadius = radius * (1 - thickness);
  const midRadius = (radius + innerRadius) / 2;
  const handleCx = geo.cx + Math.cos(handleAngle) * midRadius;
  const handleCy = geo.cy + Math.sin(handleAngle) * midRadius;

  return Math.hypot(x - handleCx, y - handleCy) <= HANDLE_SIZE / 2;
}

/** Current slider value from props — controlled (batch 2 convention). */
export function sliderValue(props: { value?: number; min?: number }): number {
  return props.value ?? props.min ?? 0;
}
