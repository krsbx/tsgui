/**
 * Main/cross-axis selectors. Flexbox math is written once per axis and
 * parameterized by `isRow` — these helpers replace the repeated ternaries
 * that previously hand-rolled the same selection in five places.
 */
import type { ChildMeasurements } from "./types.ts";

/** The measurement's size along the main axis. */
export function mainSize(m: ChildMeasurements, isRow: boolean): number {
  return isRow ? m.width : m.height;
}

/** Summed margins along the main axis. */
export function mainMargin(m: ChildMeasurements, isRow: boolean): number {
  return isRow
    ? m.margin.left + m.margin.right
    : m.margin.top + m.margin.bottom;
}

/** Summed margins along the cross axis. */
export function crossMargin(m: ChildMeasurements, isRow: boolean): number {
  return isRow
    ? m.margin.top + m.margin.bottom
    : m.margin.left + m.margin.right;
}
