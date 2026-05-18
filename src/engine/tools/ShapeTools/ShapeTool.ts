import { Graphics } from 'pixi.js';
import { Tool, ToolContext, ToolPointer } from '../Tool';

export type ShapeKind = 'line' | 'rectangle' | 'ellipse';

export class ShapeTool implements Tool {
  readonly id: ShapeKind;

  readonly cursor = 'crosshair';

  private start: ToolPointer | null = null;

  private localStart: ToolPointer | null = null;

  private preview = new Graphics();

  constructor(private readonly context: ToolContext, kind: ShapeKind) {
    this.id = kind;
    this.preview.eventMode = 'none';
    this.context.overlay.addChild(this.preview);
  }

  onPointerDown(point: ToolPointer) {
    if (this.context.layers.getActiveLayer()?.locked) {
      return;
    }

    this.context.history.capture();
    this.start = point;
    const localStart = this.context.layers.getActiveLayer()?.worldToLocal(point);
    this.localStart = localStart ? { ...point, ...localStart } : null;
    this.drawPreview(point);
  }

  onPointerMove(point: ToolPointer) {
    if (!this.start || !this.localStart) {
      return;
    }

    this.drawPreview(point);
  }

  onPointerUp(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!this.start || !layer || layer.locked) {
      this.clear();
      return;
    }

    const settings = this.context.getBrushSettings();
    const localEnd = layer.worldToLocal(point);
    const path = this.getShapePath({ ...point, ...localEnd });

    layer.context.save();
    layer.context.globalAlpha = settings.opacity;
    layer.context.globalCompositeOperation = layer.alphaLocked ? 'source-atop' : 'source-over';
    layer.context.strokeStyle = settings.color;
    layer.context.lineWidth = settings.size;
    layer.context.lineCap = 'round';
    layer.context.lineJoin = 'round';
    layer.context.beginPath();
    path(layer.context);
    layer.context.stroke();
    layer.context.restore();
    layer.markDirty();
    this.clear();
  }

  onCancel() {
    this.clear();
  }

  private drawPreview(point: ToolPointer) {
    if (!this.start || !this.localStart) {
      return;
    }

    const settings = this.context.getBrushSettings();
    const width = Math.max(1, settings.size);
    const color = Number.parseInt(settings.color.replace('#', ''), 16);
    const layer = this.context.layers.getActiveLayer();
    const localPoint = layer?.worldToLocal(point);

    this.preview.clear();
    if (localPoint) {
      this.drawPixiShape({ ...point, ...localPoint }, color, width);
    }
  }

  private drawPixiShape(point: ToolPointer, color: number, width: number) {
    if (!this.start || !this.localStart) {
      return;
    }

    const { x, y, w, h } = this.getBounds(point);

    if (this.id === 'line') {
      this.preview.moveTo(this.localStart.x, this.localStart.y)
        .lineTo(point.x, point.y)
        .stroke({ color, alpha: 0.75, width, cap: 'round', join: 'round' });
      return;
    }

    if (this.id === 'rectangle') {
      this.preview.rect(x, y, w, h)
        .stroke({ color, alpha: 0.75, width, cap: 'round', join: 'round' });
      return;
    }

    this.preview.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2))
      .stroke({ color, alpha: 0.75, width, cap: 'round', join: 'round' });
  }

  private getShapePath(point: ToolPointer) {
    const { x, y, w, h } = this.getBounds(point);

    return (ctx: CanvasRenderingContext2D) => {
      if (!this.localStart) {
        return;
      }

      if (this.id === 'line') {
        ctx.moveTo(this.localStart.x, this.localStart.y);
        ctx.lineTo(point.x, point.y);
        return;
      }

      if (this.id === 'rectangle') {
        ctx.rect(x, y, w, h);
        return;
      }

      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    };
  }

  private getBounds(point: ToolPointer) {
    if (!this.localStart) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }

    let w = point.x - this.localStart.x;
    let h = point.y - this.localStart.y;

    if (point.shiftKey && this.id !== 'line') {
      const side = Math.max(Math.abs(w), Math.abs(h));
      w = side * Math.sign(w || 1);
      h = side * Math.sign(h || 1);
    }

    return {
      x: this.localStart.x,
      y: this.localStart.y,
      w,
      h,
    };
  }

  private clear() {
    this.start = null;
    this.localStart = null;
    this.preview.clear();
  }
}
