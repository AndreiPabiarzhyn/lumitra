import { Application, Container } from 'pixi.js';
import { FillSettings } from '../../app/fillStore';
import { GradientState } from '../../app/gradientStore';
import { SmudgeState } from '../../app/smudgeStore';
import { TextSettings } from '../../app/textStore';
import { BrushSettings } from '../brush/types';
import { HistoryManager } from '../history/HistoryManager';
import { LayerManager } from '../layers/LayerManager';
import { TextManager } from '../text/TextManager';
import { ViewportController } from '../viewport/ViewportController';

export type ToolPointer = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  pressure: number;
  time: number;
  shiftKey: boolean;
  button: number;
};

export type ToolContext = {
  app: Application;
  overlay: Container;
  layers: LayerManager;
  text: TextManager;
  history: HistoryManager;
  viewport: ViewportController;
  getBrushSettings: () => BrushSettings;
  getFillSettings: () => FillSettings;
  getGradientSettings: () => GradientState;
  getSmudgeSettings: () => SmudgeState;
  getTextSettings: () => TextSettings;
  setBrushColor: (color: string) => void;
  requestLayerSync: () => void;
};

export interface Tool {
  id: string;
  cursor: string;
  onPointerDown?(point: ToolPointer): void | Promise<void>;
  onPointerMove?(point: ToolPointer): void | Promise<void>;
  onPointerUp?(point: ToolPointer): void | Promise<void>;
  onPointerLeave?(): void;
  onWheel?(event: WheelEvent): void;
  onCancel?(): void;
  onActivate?(): void;
  onDeactivate?(): void;
  destroy?(): void;
}
