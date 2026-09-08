export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function maximumDelta(before: readonly Bounds[], after: readonly Bounds[]): number {
  if (before.length !== after.length) return Number.POSITIVE_INFINITY;
  let maximum = 0;
  for (let index = 0; index < before.length; index += 1) {
    const a = before[index];
    const b = after[index];
    if (!a || !b) return Number.POSITIVE_INFINITY;
    maximum = Math.max(maximum, Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.width - b.width), Math.abs(a.height - b.height));
  }
  return maximum;
}

function overlaps(left: Bounds, right: Bounds): boolean {
  return left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
}

function overlapPairs(values: readonly Bounds[]): Set<string> {
  const pairs = new Set<string>();
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const leftBounds = values[left];
      const rightBounds = values[right];
      if (leftBounds && rightBounds && overlaps(leftBounds, rightBounds)) pairs.add(`${left}:${right}`);
    }
  }
  return pairs;
}

function introducesOverlap(before: readonly Bounds[], after: readonly Bounds[]): boolean {
  const original = overlapPairs(before);
  return [...overlapPairs(after)].some((pair) => !original.has(pair));
}

function introducesClipping(container: { width: number; height: number }, before: readonly Bounds[], after: readonly Bounds[], tolerance: number): boolean {
  const wasInside = before.every((item) => item.x >= -tolerance && item.y >= -tolerance && item.x + item.width <= container.width + tolerance && item.y + item.height <= container.height + tolerance);
  if (!wasInside) return false;
  return after.some((item) => item.x < -tolerance || item.y < -tolerance || item.x + item.width > container.width + tolerance || item.y + item.height > container.height + tolerance);
}

export function assessGeometryChange(before: readonly Bounds[], after: readonly Bounds[], container: { width: number; height: number }, tolerance: number): {
  valid: boolean;
  maximumDelta: number;
  introducedOverlap: boolean;
  introducedClipping: boolean;
} {
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error("Geometry tolerance must be a finite non-negative number");
  const delta = maximumDelta(before, after);
  const introducedOverlap = introducesOverlap(before, after);
  const introducedClipping = introducesClipping(container, before, after, tolerance);
  return { valid: delta <= tolerance && !introducedOverlap && !introducedClipping, maximumDelta: delta, introducedOverlap, introducedClipping };
}
