import { TextObject } from './TextObject';

export const getTextBoxHeight = (object: TextObject, lineCount: number) => (
  Math.max(object.height, lineCount * object.fontSize * object.lineHeight)
);
