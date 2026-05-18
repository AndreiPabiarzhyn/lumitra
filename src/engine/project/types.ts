import { BrushSettings } from '../brush/types';
import { Viewport } from '../viewport/types';
import { LayerSnapshot } from '../layers/types';
import { SerializedTextObject } from '../text/TextObject';
import { GradientBlendMode, GradientStop, GradientType } from '../../app/gradientStore';

export type LumitraLayerData = LayerSnapshot;

export type LumitraProject = {
  format: 'lumitra-project';
  version: 1;
  metadata: {
    name: string;
    createdAt: string;
    updatedAt: string;
    width: number;
    height: number;
  };
  viewport: Viewport;
  brush: BrushSettings;
  gradient?: {
    type: GradientType;
    opacity: number;
    blendAmount: number;
    reverse: boolean;
    blendMode: GradientBlendMode;
    stops: GradientStop[];
  };
  colors: {
    active: string;
  };
  activeLayerId: string;
  layers: LumitraLayerData[];
  textObjects?: SerializedTextObject[];
};
