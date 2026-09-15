import { composite, type Rgba } from "../../core/contrast";

export interface TextBackgroundResolution {
  color?: Rgba;
  foregroundColor?: Rgba;
  resolvable: boolean;
  sourceNodeIds: string[];
  reason?: string;
}

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const EPSILON = 1e-6;

function isScene(node: BaseNode): node is SceneNode {
  return node.type !== "PAGE" && node.type !== "DOCUMENT";
}

function visiblePaints(value: readonly Paint[] | symbol): readonly Paint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((paint) => paint.visible !== false && (paint.opacity ?? 1) > 0);
}

function normalBlend(node: SceneNode): boolean {
  return !("blendMode" in node) || node.blendMode === undefined || node.blendMode === "NORMAL" || node.blendMode === "PASS_THROUGH";
}

function fillStack(node: SceneNode): Rgba | undefined {
  if (!("fills" in node)) return TRANSPARENT;
  const paints = visiblePaints(node.fills);
  if (!paints) return undefined;
  let result = TRANSPARENT;
  // Figma's fill list is front-to-back, unlike its children array.
  for (const paint of [...paints].reverse()) {
    if (paint.type !== "SOLID" || (paint.blendMode && paint.blendMode !== "NORMAL")) return undefined;
    result = composite({ ...paint.color, a: paint.opacity ?? 1 }, result);
  }
  return result;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function contains(a: Rect, b: Rect): boolean {
  return a.x <= b.x + EPSILON && a.y <= b.y + EPSILON && a.x + a.width >= b.x + b.width - EPSILON && a.y + a.height >= b.y + b.height - EPSILON;
}

function roundedCornerIntersection(node: SceneNode, target: Rect, bounds: Rect): boolean {
  if (!("topLeftRadius" in node)) return false;
  const corners = [
    { radius: node.topLeftRadius, x: bounds.x, y: bounds.y },
    { radius: node.topRightRadius, x: bounds.x + bounds.width - node.topRightRadius, y: bounds.y },
    { radius: node.bottomLeftRadius, x: bounds.x, y: bounds.y + bounds.height - node.bottomLeftRadius },
    { radius: node.bottomRightRadius, x: bounds.x + bounds.width - node.bottomRightRadius, y: bounds.y + bounds.height - node.bottomRightRadius },
  ];
  return corners.some((corner) => corner.radius > 0 && overlaps(target, { x: corner.x, y: corner.y, width: corner.radius, height: corner.radius }));
}

function hasVisiblePaint(node: SceneNode): boolean {
  if ("fills" in node && (!Array.isArray(node.fills) || node.fills.some((paint: Paint) => paint.visible !== false && (paint.opacity ?? 1) > 0))) return true;
  if ("strokes" in node && node.strokes.some((paint) => paint.visible !== false && (paint.opacity ?? 1) > 0)) return true;
  if ("effects" in node && node.effects.some((effect) => effect.visible !== false)) return true;
  return "children" in node && node.children.length > 0;
}

function overlappingSibling(parent: BaseNode, branch: BaseNode, target: Rect | null): boolean {
  if (!("children" in parent)) return false;
  for (const sibling of parent.children) {
    if (sibling.id === branch.id || sibling === branch || !isScene(sibling) || !sibling.visible || ("opacity" in sibling && sibling.opacity === 0)) continue;
    if (!("isMask" in sibling && sibling.isMask) && !hasVisiblePaint(sibling)) continue;
    const bounds = ("absoluteRenderBounds" in sibling ? sibling.absoluteRenderBounds : undefined) ?? sibling.absoluteBoundingBox;
    if (!target || !bounds || overlaps(target, bounds)) return true;
  }
  return false;
}

/** Resolve the two rendered pixels (text and adjacent background) through the
 * same supported ancestor stack. Applying opacity to both pixels at each level
 * preserves group-opacity semantics; multiplying only text alpha does not. */
export function resolveTextBackground(node: TextNode): TextBackgroundResolution {
  const sourceNodeIds: string[] = [];
  const unknown = (reason: string): TextBackgroundResolution => ({ resolvable: false, sourceNodeIds, reason });
  let foreground = fillStack(node);
  let background = TRANSPARENT;
  if (!foreground || foreground.a === 0) return unknown("Text has mixed, unsupported, or invisible paint.");
  if (!normalBlend(node) || node.isMask || node.effects?.some((effect) => effect.visible !== false)) return unknown("Text uses unsupported blending, masks, or effects.");
  foreground = { ...foreground, a: foreground.a * (node.opacity ?? 1) };
  const target = node.absoluteBoundingBox ?? null;
  let current: BaseNode = node;
  const visited = new Set<BaseNode>();
  while (current.parent) {
    const parent: BaseNode = current.parent;
    if (visited.has(parent)) return unknown("The ancestor chain could not be resolved.");
    visited.add(parent);
    if (!isScene(parent)) break;
    if (parent.type === "COMPONENT_SET") return unknown("A component-set canvas is an authoring surface, not a consumer background.");
    if (parent.visible === false || ("opacity" in parent && parent.opacity === 0)) return unknown("Text is hidden by an ancestor.");
    if (!normalBlend(parent) || ("isMask" in parent && parent.isMask)) return unknown("An ancestor uses an unsupported blend or mask.");
    if ("effects" in parent && parent.effects.some((effect) => effect.visible !== false)) return unknown("An ancestor effect requires rendered contrast review.");
    if (overlappingSibling(parent, current, target)) return unknown("Overlapping sibling content or a mask prevents a uniform background measurement.");
    if ("clipsContent" in parent && parent.clipsContent && target && parent.absoluteBoundingBox
      && (!contains(parent.absoluteBoundingBox, target) || roundedCornerIntersection(parent, target, parent.absoluteBoundingBox))) {
      return unknown("A clipping boundary intersects the text bounds.");
    }
    const surface = fillStack(parent);
    if (!surface) return unknown("An ancestor has mixed paint, a gradient, an image, or an unsupported fill blend.");
    if (surface.a > 0) {
      const bounds = parent.absoluteBoundingBox;
      if (target && bounds && (!contains(bounds, target) || roundedCornerIntersection(parent, target, bounds) || ("rotation" in parent && parent.rotation !== 0))) {
        return unknown("The ancestor surface does not uniformly cover the text bounds.");
      }
      if (parent.id) sourceNodeIds.push(parent.id);
      foreground = composite(foreground, surface);
      background = composite(background, surface);
    }
    const opacity = "opacity" in parent ? parent.opacity ?? 1 : 1;
    if (opacity !== 1 && parent.id && !sourceNodeIds.includes(parent.id)) sourceNodeIds.push(parent.id);
    foreground = { ...foreground, a: foreground.a * opacity };
    background = { ...background, a: background.a * opacity };
    if (parent.type === "COMPONENT") {
      // Definition placement belongs to the authoring file. Its own opaque
      // surface is evidence; an external consumer backdrop is not.
      if (background.a < 1 - EPSILON) return unknown("The component definition needs an evidenced consumer background.");
      return { color: { ...background, a: 1 }, foregroundColor: { ...foreground, a: 1 }, resolvable: true, sourceNodeIds };
    }
    current = parent;
  }
  if (background.a < 1 - EPSILON) return unknown("No opaque consumer background was evidenced; canvas white is not assumed.");
  return { color: { ...background, a: 1 }, foregroundColor: { ...foreground, a: 1 }, resolvable: true, sourceNodeIds };
}
