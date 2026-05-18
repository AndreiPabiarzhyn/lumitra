import { GradientBlendMode, GradientStop, GradientType } from '../../app/gradientStore';

export type GradientObject = {
  id: string;
  layerId: string;
  type: GradientType;
  blendMode: GradientBlendMode;
  opacity: number;
  blendAmount: number;
  reverse: boolean;
  stops: GradientStop[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};
