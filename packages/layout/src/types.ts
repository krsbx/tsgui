/**
 * Layout contracts — ported from flying-pan with one decisive change:
 * LayoutContext is MINIMAL and injected (flying-pan aliased it to the
 * renderer's PaintContext, which is what made layout untestable without
 * a window + GPU).
 */
import type { Coordinate2D, Size, WidgetDescriptor } from "./style.ts";

export interface LayoutNode extends Coordinate2D, Size {
  stableId: number;
  widget: WidgetDescriptor;
  children: LayoutNode[];
  /** Screen-space position — x/y adjusted for ancestor scroll offsets.
   *  Set during layoutFlex via threaded scrollAccumulated. Use for
   *  pointer hit-testing, clipping, and any screen-space math. */
  screenX: number;
  screenY: number;
}

/**
 * Everything layout needs from the outside world — injected by the app
 * layer, stubbed in headless tests. Kept deliberately small: flying-pan
 * aliased this to the renderer's PaintContext, which is the coupling we
 * are undoing.
 */
export interface LayoutContext {
  getStableId(widget: WidgetDescriptor): number;
  /** stableId → node, populated pre-order during layoutFlex. */
  layoutIndex: Map<number, LayoutNode>;
  focusableNodes: LayoutNode[];
  /** Committed scroll offset of a scrollable node (previous frame). */
  scrollOffsetOf(node: LayoutNode): Coordinate2D;
  /** Intrinsic text measurement — ttf tier in production, stubs in tests. */
  measureText(text: string, style: unknown): Size;
  /** Intrinsic image size from decoded metadata (null = unknown). */
  getImageSize(src: string): Size | null;
}

export interface LayoutFlexOptions extends Coordinate2D {
  node: WidgetDescriptor;
  availableWidth: number;
  availableHeight: number;
  ctx: LayoutContext;
  scrollAccumulated?: Coordinate2D;
}

export interface LayoutFlexFn {
  (options: LayoutFlexOptions): LayoutNode;
}

export interface ChildMeasurements extends Size {
  widget: WidgetDescriptor;
  flex: number;
  flexShrink: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface MeasureChildsComponentOptions {
  children: WidgetDescriptor[];
  parentWidth: number;
  parentHeight: number;
  ctx: LayoutContext;
}

export interface MeasureChildsComponentResult {
  flow: ChildMeasurements[];
  absolute: ChildMeasurements[];
  maxH: number;
  sumH: number;
  maxW: number;
  sumW: number;
}

export interface WrapLine {
  measurements: ChildMeasurements[];
  crossSize: number;
}

export interface WrapMeasurementsOptions {
  measurements: ChildMeasurements[];
  mainAxisSize: number;
  isRow: boolean;
  gap: number;
}

export interface UpdateChildMeasurementsOptions {
  measurements: ChildMeasurements[];
  contentWidth: number;
  contentHeight: number;
  isRow: boolean;
  gap: number;
}

export interface UpdateChildMeasurementsResult {
  crossAxisSize: number;
  mainAxisSize: number;
  totalGaps: number;
  totalMainSize: number;
}

export interface CalculateMainContentSizeOptions
  extends UpdateChildMeasurementsResult {
  measurements: ChildMeasurements[];
  padding: { top: number; right: number; bottom: number; left: number };
  style: WidgetDescriptor["style"];
  isRow: boolean;
}

export interface CalculateMainContentSizeResult {
  spaceBetweenGap: number;
  spaceEvenlyGap: number;
  alignItems: string;
  justifyItems: string;
  mainPos: number;
}

export interface DistributeChildOptions {
  measurements: ChildMeasurements[];
  totalFlex: number;
  freeSpace: number;
  isRow: boolean;
}

export interface LayoutLineOptions {
  flow: ChildMeasurements[];
  style: NonNullable<WidgetDescriptor["style"]>;
  padding: { top: number; right: number; bottom: number; left: number };
  isRow: boolean;
  gap: number;
  contentWidth: number;
  contentHeight: number;
  x: number;
  y: number;
  children: LayoutNode[];
  ctx: LayoutContext;
  scrollAccumulated: Coordinate2D;
}

export interface PositionFlowChildrenOptions {
  measurements: ChildMeasurements[];
  alignItems: string;
  isRow: boolean;
  padding: { top: number; right: number; bottom: number; left: number };
  crossAxisSize: number;
  mainPos: number;
  spaceBetweenGap: number;
  spaceEvenlyGap: number;
  justifyItems: string;
  x: number;
  y: number;
  gap: number;
  children: LayoutNode[];
  ctx: LayoutContext;
  scrollAccumulated: Coordinate2D;
}

export interface PositionAbsoluteOptions {
  m: ChildMeasurements;
  padding: { top: number; right: number; bottom: number; left: number };
  contentWidth: number;
  contentHeight: number;
  x: number;
  y: number;
  children: LayoutNode[];
  ctx: LayoutContext;
  scrollAccumulated: Coordinate2D;
}
