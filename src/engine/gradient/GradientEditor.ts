import { GradientObject } from './GradientTypes';

export const moveGradient = (object: GradientObject, dx: number, dy: number): GradientObject => ({
  ...object,
  startX: object.startX + dx,
  startY: object.startY + dy,
  endX: object.endX + dx,
  endY: object.endY + dy,
});
