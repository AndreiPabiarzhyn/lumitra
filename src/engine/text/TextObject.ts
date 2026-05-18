import { TextAlign, TextSettings } from '../../app/textStore';
import { LayerTransform } from '../layers/types';

export type TextObject = TextSettings & {
  id: string;
  layerId: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export type SerializedTextObject = TextObject;

export const createTextObject = (
  layerId: string,
  x: number,
  y: number,
  settings: TextSettings,
): TextObject => ({
  id: `text-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  layerId,
  content: '',
  x,
  y,
  width: 460,
  height: 120,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  ...settings,
});

export const getTextObjectTransform = (object: TextObject): LayerTransform => ({
  x: object.x,
  y: object.y,
  scaleX: object.scaleX,
  scaleY: object.scaleY,
  rotation: object.rotation,
});

export const measureTextHeight = (object: Pick<TextObject, 'content' | 'fontSize' | 'lineHeight' | 'height'>) => (
  object.height || Math.max(1, object.content.split('\n').length) * object.fontSize * object.lineHeight
);

export const normalizeAlign = (align: TextAlign): CanvasTextAlign => (
  align === 'justify' ? 'left' : align
);

export const textObjectFont = (object: Pick<TextObject, 'italic' | 'bold' | 'fontWeight' | 'fontSize' | 'fontFamily'>) => {
  const weight = object.bold ? 700 : (object.fontWeight ?? 400);

  return `${object.italic ? 'italic ' : ''}${weight} ${object.fontSize}px ${object.fontFamily}, Arial, sans-serif`;
};
