import { BrushPoint, BrushSample, BrushSettings } from './types';

export const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

export const distance = (a: BrushPoint, b: BrushPoint): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return Math.hypot(dx, dy);
};

export const lerp = (from: number, to: number, amount: number): number => (
  from + (to - from) * amount
);

export const lerpPoint = (from: BrushPoint, to: BrushPoint, amount: number): BrushPoint => ({
  x: lerp(from.x, to.x, amount),
  y: lerp(from.y, to.y, amount),
  pressure: lerp(from.pressure, to.pressure, amount),
  time: lerp(from.time, to.time, amount),
});

export const hexToNumber = (color: string): number => Number.parseInt(color.replace('#', ''), 16);

export const getBrushSpacing = (settings: BrushSettings): number => clamp(
  settings.size * settings.spacing,
  1,
  18,
);

export const createBrushSample = (
  point: BrushPoint,
  settings: BrushSettings,
): BrushSample => {
  const pressure = clamp(point.pressure || 1, 0.05, 1);

  return {
    ...point,
    radius: Math.max(0.5, (settings.size * pressure) / 2),
    alpha: clamp(settings.opacity, 0.02, 1),
  };
};

export const forEachInterpolatedSample = (
  from: BrushPoint,
  to: BrushPoint,
  settings: BrushSettings,
  draw: (sample: BrushSample) => void,
) => {
  const spacing = getBrushSpacing(settings);
  const segmentLength = distance(from, to);
  const count = Math.max(1, Math.ceil(segmentLength / spacing));

  for (let index = 1; index <= count; index += 1) {
    const amount = index / count;
    draw(createBrushSample(lerpPoint(from, to, amount), settings));
  }
};
