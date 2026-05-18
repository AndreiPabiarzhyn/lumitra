import { TextObject } from './TextObject';

export const insertText = (object: TextObject, value: string) => ({
  content: object.content === 'Text' ? value : `${object.content}${value}`,
});

export const insertTextAt = (content: string, caret: number, value: string) => {
  const index = clampCaret(content, caret);

  return {
    content: `${content.slice(0, index)}${value}${content.slice(index)}`,
    caret: index + value.length,
  };
};

export const deleteBeforeCaret = (content: string, caret: number) => {
  const index = clampCaret(content, caret);

  if (index <= 0) {
    return { content, caret: index };
  }

  return {
    content: `${content.slice(0, index - 1)}${content.slice(index)}`,
    caret: index - 1,
  };
};

export const deleteAfterCaret = (content: string, caret: number) => {
  const index = clampCaret(content, caret);

  if (index >= content.length) {
    return { content, caret: index };
  }

  return {
    content: `${content.slice(0, index)}${content.slice(index + 1)}`,
    caret: index,
  };
};

export const clampCaret = (content: string, caret: number) => Math.min(content.length, Math.max(0, caret));

export const getLineStart = (content: string, caret: number) => {
  const index = clampCaret(content, caret);
  const lineStart = content.lastIndexOf('\n', Math.max(0, index - 1));

  return lineStart < 0 ? 0 : lineStart + 1;
};

export const getLineEnd = (content: string, caret: number) => {
  const index = clampCaret(content, caret);
  const lineEnd = content.indexOf('\n', index);

  return lineEnd < 0 ? content.length : lineEnd;
};

export const moveCaretVertical = (content: string, caret: number, direction: -1 | 1) => {
  const index = clampCaret(content, caret);
  const start = getLineStart(content, index);
  const column = index - start;

  if (direction < 0) {
    if (start === 0) {
      return index;
    }

    const previousEnd = start - 1;
    const previousStart = getLineStart(content, previousEnd);
    return Math.min(previousStart + column, previousEnd);
  }

  const end = getLineEnd(content, index);

  if (end >= content.length) {
    return index;
  }

  const nextStart = end + 1;
  const nextEnd = getLineEnd(content, nextStart);
  return Math.min(nextStart + column, nextEnd);
};
