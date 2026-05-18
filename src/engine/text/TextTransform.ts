import { TextObject } from './TextObject';

export const resizeTextBox = (object: TextObject, width: number, height: number): Partial<TextObject> => ({
  width: Math.max(32, width),
  height: Math.max(object.fontSize, height),
});
