export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function channel(value: number): number {
  const normalized = Math.max(0, Math.min(1, value));
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function composite(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

export function relativeLuminance(color: Rgba): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

export function contrastRatio(foreground: Rgba, background: Rgba): number {
  // A translucent background is not a measured consumer surface. Callers must
  // resolve it against actual rendering evidence before computing a ratio.
  if (background.a < 1) return Number.NaN;
  const fg = foreground.a < 1 ? composite(foreground, background) : foreground;
  const bg = background;
  const light = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const dark = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (light + 0.05) / (dark + 0.05);
}

export function isLargeText(fontSize: number | undefined, fontWeight: number | undefined): boolean {
  if (fontSize === undefined) return false;
  return fontSize >= 24 || (fontSize >= 18.66 && (fontWeight ?? 400) >= 700);
}
