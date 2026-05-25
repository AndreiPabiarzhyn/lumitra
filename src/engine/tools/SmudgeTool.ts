import { Graphics } from 'pixi.js';
import { BrushPoint } from '../brush/types';
import { Tool, ToolContext, ToolPointer } from './Tool';

const distance = (a: BrushPoint, b: BrushPoint) => Math.hypot(b.x - a.x, b.y - a.y);

const lerpPoint = (a: BrushPoint, b: BrushPoint, amount: number): BrushPoint => ({
  x: a.x + (b.x - a.x) * amount,
  y: a.y + (b.y - a.y) * amount,
  pressure: a.pressure + (b.pressure - a.pressure) * amount,
  time: a.time + (b.time - a.time) * amount,
});

export class SmudgeTool implements Tool {
  readonly id = 'smudge';

  readonly cursor = 'none';

  private readonly cursorPreview = new Graphics();

  private last: BrushPoint | null = null;

  private buffer: HTMLCanvasElement | null = null;

  private mask: HTMLCanvasElement | null = null;

  constructor(private readonly context: ToolContext) {
    this.cursorPreview.eventMode = 'none';
    this.context.overlay.addChild(this.cursorPreview);
  }

  onPointerDown(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer || layer.locked) {
      return;
    }

    this.context.history.capture();
    this.prepareBuffers();
    this.last = layer.worldToLocal(point);
    this.pick(layer.context, this.last);
    this.drawCursor(point);
  }

  onPointerMove(point: ToolPointer) {
    this.drawCursor(point);
    const layer = this.context.layers.getActiveLayer();

    if (!this.last || !layer || layer.locked || !this.buffer || !this.mask) {
      return;
    }

    const local = layer.worldToLocal(point);
    const smudge = this.context.getSmudgeSettings();
    const spacing = Math.max(1, this.context.getBrushSettings().size * smudge.spacing);
    const steps = Math.max(1, Math.ceil(distance(this.last, local) / spacing));

    for (let index = 1; index <= steps; index += 1) {
      const sample = lerpPoint(this.last, local, index / steps);
      this.stamp(layer.context, sample, layer.alphaLocked);
      this.pick(layer.context, sample);
    }

    layer.markDirty();
    this.last = local;
  }

  onPointerUp() {
    this.last = null;
    this.buffer = null;
    this.mask = null;
  }

  onCancel() {
    this.last = null;
    this.buffer = null;
    this.mask = null;
    this.cursorPreview.clear();
  }

  onPointerLeave() {
    this.context.app.canvas.style.cursor = 'default';
    this.cursorPreview.clear();
  }

  private prepareBuffers() {
    const size = Math.max(4, Math.ceil(this.context.getBrushSettings().size * 2));
    this.buffer = document.createElement('canvas');
    this.mask = document.createElement('canvas');
    this.buffer.width = size;
    this.buffer.height = size;
    this.mask.width = size;
    this.mask.height = size;

    const maskContext = this.mask.getContext('2d');

    if (!maskContext) {
      return;
    }

    const radius = size / 2;
    const smudge = this.context.getSmudgeSettings();
    const gradient = maskContext.createRadialGradient(radius, radius, radius * (1 - smudge.softness) * 0.65, radius, radius, radius);
    gradient.addColorStop(0, `rgba(255,255,255,${smudge.amount})`);
    gradient.addColorStop(0.72, `rgba(255,255,255,${smudge.amount * 0.62})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    maskContext.fillStyle = gradient;
    maskContext.fillRect(0, 0, size, size);
  }

  private pick(ctx: CanvasRenderingContext2D, point: BrushPoint) {
    if (!this.buffer || !this.mask) {
      return;
    }

    const size = this.buffer.width;
    const radius = size / 2;
    const bufferContext = this.buffer.getContext('2d');

    if (!bufferContext) {
      return;
    }

    bufferContext.clearRect(0, 0, size, size);
    bufferContext.drawImage(ctx.canvas, point.x - radius, point.y - radius, size, size, 0, 0, size, size);
    bufferContext.globalCompositeOperation = 'destination-in';
    bufferContext.drawImage(this.mask, 0, 0);
    bufferContext.globalCompositeOperation = 'source-over';
  }

  private stamp(ctx: CanvasRenderingContext2D, point: BrushPoint, alphaLocked: boolean) {
    if (!this.buffer) {
      return;
    }

    const size = this.buffer.width;
    const radius = size / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = this.context.getSmudgeSettings().strength;
    ctx.globalCompositeOperation = alphaLocked ? 'source-atop' : 'source-over';
    ctx.drawImage(this.buffer, point.x - radius, point.y - radius);
    ctx.restore();
  }

  private drawCursor(point: ToolPointer) {
    if (!this.isInsideLayer(point)) {
      this.context.app.canvas.style.cursor = 'default';
      this.cursorPreview.clear();
      return;
    }

    this.context.app.canvas.style.cursor = this.cursor;
    const radius = this.context.getBrushSettings().size / 2;
    const scale = this.context.viewport.getState().scale;

    this.cursorPreview.clear()
      .circle(point.x, point.y, radius)
      .stroke({ color: 0x05070d, alpha: 0.82, width: 3 / scale })
      .circle(point.x, point.y, radius)
      .stroke({ color: 0xffffff, alpha: 0.9, width: 1.2 / scale });
  }

  private isInsideLayer(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer) {
      return false;
    }

    const local = layer.worldToLocal(point);

    return local.x >= 0 && local.y >= 0 && local.x <= layer.canvas.width && local.y <= layer.canvas.height;
  }
}
