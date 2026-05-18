import { clamp } from './BrushMath';
import { BrushPoint } from './types';

const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
};

export const grainAt = (point: BrushPoint, seed = 1): number => (
  clamp(hash(Math.round(point.x * 1.7), Math.round(point.y * 1.7), seed), 0, 1)
);

export const jitterPoint = (point: BrushPoint, amount: number, seed = 1): BrushPoint => {
  const angle = hash(point.x, point.y, seed) * Math.PI * 2;
  const distance = (hash(point.y, point.x, seed + 9) - 0.5) * amount;

  return {
    ...point,
    x: point.x + Math.cos(angle) * distance,
    y: point.y + Math.sin(angle) * distance,
  };
};
