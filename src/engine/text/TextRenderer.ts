import { normalizeAlign, TextObject, textObjectFont } from './TextObject';

export class TextRenderer {
  private readonly lineCache = new Map<string, string[]>();

  render(ctx: CanvasRenderingContext2D, object: TextObject, options: { caret?: boolean; caretIndex?: number } = {}) {
    const lines = this.wrapLines(ctx, object);

    ctx.save();
    ctx.translate(object.x, object.y);
    ctx.rotate(object.rotation);
    ctx.scale(object.scaleX, object.scaleY);
    ctx.globalAlpha = object.opacity;
    ctx.font = textObjectFont(object);
    ctx.textBaseline = 'top';
    ctx.textAlign = normalizeAlign(object.align);
    ctx.fillStyle = object.color;

    const x = object.align === 'center' ? object.width / 2 : object.align === 'right' ? object.width : 0;
    const lineHeight = object.fontSize * object.lineHeight;

    lines.forEach((line, index) => {
      const y = index * lineHeight;
      this.fillTextWithLetterSpacing(ctx, line, x, y, object, index < lines.length - 1);

      if (object.underline) {
        this.drawUnderline(ctx, line, x, y + object.fontSize * 1.04, object);
      }
    });

    if (options.caret) {
      const caret = Math.min(object.content.length, Math.max(0, options.caretIndex ?? object.content.length));
      const beforeCaret = object.content.slice(0, caret);
      const caretLineIndex = beforeCaret.split('\n').length - 1;
      const lineStart = beforeCaret.lastIndexOf('\n') + 1;
      const lineText = beforeCaret.slice(lineStart);
      const wrappedLineIndex = Math.min(lines.length - 1, caretLineIndex);
      const caretY = wrappedLineIndex * lineHeight;
      ctx.strokeStyle = object.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      const caretX = this.measureLine(ctx, lineText, object);
      ctx.moveTo((object.align === 'left' || object.align === 'justify' ? caretX : x) + 2, caretY);
      ctx.lineTo((object.align === 'left' || object.align === 'justify' ? caretX : x) + 2, caretY + object.fontSize);
      ctx.stroke();
    }

    ctx.restore();
  }

  wrapLines(ctx: CanvasRenderingContext2D, object: TextObject) {
    const cacheKey = [
      object.content,
      object.fontFamily,
      object.fontSize,
      object.fontWeight,
      object.bold,
      object.italic,
      object.letterSpacing,
      object.boxMode,
      object.width,
    ].join('|');
    const cached = this.lineCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    ctx.save();
    ctx.font = textObjectFont(object);
    const result: string[] = [];

    object.content.split('\n').forEach((paragraph) => {
      const words = paragraph.split(' ');
      let line = '';

      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        const width = ctx.measureText(candidate).width + Math.max(0, candidate.length - 1) * object.letterSpacing;

        if (object.boxMode === 'fixed' && line && width > object.width) {
          result.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      result.push(line);
    });

    ctx.restore();
    const lines = result.length ? result : ['Text'];

    if (this.lineCache.size > 120) {
      this.lineCache.clear();
    }

    this.lineCache.set(cacheKey, lines);
    return lines;
  }

  private fillTextWithLetterSpacing(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    object: TextObject,
    justifyLine = false,
  ) {
    if (object.align === 'justify' && justifyLine && text.includes(' ')) {
      this.fillJustifiedText(ctx, text, y, object);
      return;
    }

    if (!object.letterSpacing) {
      ctx.fillText(text, x, y, object.width);
      return;
    }

    let offset = 0;
    [...text].forEach((char) => {
      ctx.fillText(char, x + offset, y);
      offset += ctx.measureText(char).width + object.letterSpacing;
    });
  }

  private fillJustifiedText(ctx: CanvasRenderingContext2D, text: string, y: number, object: TextObject) {
    const words = text.split(' ');
    const wordsWidth = words.reduce((sum, word) => sum + ctx.measureText(word).width, 0);
    const gap = words.length > 1 ? Math.max(4, (object.width - wordsWidth) / (words.length - 1)) : 0;
    let x = 0;

    words.forEach((word) => {
      ctx.fillText(word, x, y);
      x += ctx.measureText(word).width + gap;
    });
  }

  private drawUnderline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, object: TextObject) {
    const width = object.align === 'justify' ? object.width : this.measureLine(ctx, text, object);
    const startX = object.align === 'center' ? x - width / 2 : object.align === 'right' ? x - width : x;

    ctx.save();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = Math.max(1, object.fontSize / 18);
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + width, y);
    ctx.stroke();
    ctx.restore();
  }

  private measureLine(ctx: CanvasRenderingContext2D, text: string, object: TextObject) {
    return ctx.measureText(text).width + Math.max(0, text.length - 1) * object.letterSpacing;
  }
}
