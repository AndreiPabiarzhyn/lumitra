export type { BrushPreset, BrushPresetId, BrushSettings } from './BrushSettings';

export type BrushPoint = {
  x: number;
  y: number;
  pressure: number;
  time: number;
};

export type BrushDynamics = {
  pressureSize: number;
  pressureOpacity: number;
};

export type BrushSample = BrushPoint & {
  radius: number;
  alpha: number;
  angle?: number;
  strokeDistance?: number;
  strokeIndex?: number;
  endTaper?: number;
};

export type PointerStrokeEvent = {
  point: BrushPoint;
  shiftKey: boolean;
};
