import { GradientState } from '../../app/gradientStore';
import { GradientObject } from './GradientTypes';

export const createGradientObject = (
  layerId: string,
  settings: GradientState,
  start: { x: number; y: number },
  end: { x: number; y: number },
): GradientObject => ({
  id: `gradient-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  layerId,
  type: settings.type,
  blendMode: settings.blendMode,
  opacity: settings.opacity,
  blendAmount: settings.blendAmount,
  reverse: settings.reverse,
  stops: settings.stops.map((stop) => ({ ...stop })),
  startX: start.x,
  startY: start.y,
  endX: end.x,
  endY: end.y,
});
