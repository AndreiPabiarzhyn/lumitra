import { Graphics } from 'pixi.js';
import { BrushEngine } from '../brush/BrushEngine';
import { BrushPoint } from '../brush/types';
import { Stabilizer } from '../brush/Stabilizer';
import { Tool, ToolContext, ToolPointer } from './Tool';

export class BrushTool implements Tool {
  readonly id: string = 'brush';

  readonly cursor = 'none';

  protected readonly brush = new BrushEngine();

  protected readonly stabilizer = new Stabilizer();

  protected readonly cursorPreview = new Graphics();

  protected compositeMode: GlobalCompositeOperation = 'source-over';

  private isDrawing = false;

  private localStrokeStart: BrushPoint | null = null;

  constructor(protected readonly context: ToolContext) {
    this.cursorPreview.eventMode = 'none';
    this.context.overlay.addChild(this.cursorPreview);
  }

  onPointerDown(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer || layer.locked || !this.isInsideLayer(point)) {
      return;
    }

    this.context.history.capture();
    this.isDrawing = true;
    const localPoint = layer.worldToLocal(point);
    this.localStrokeStart = localPoint;
    this.stabilizer.reset(localPoint);
    this.brush.begin(layer.context, localPoint, this.context.getBrushSettings(), this.getCompositeMode(layer.alphaLocked));
    layer.markDirty();
    this.drawCursor(point);
  }

  onPointerMove(point: ToolPointer) {
    this.drawCursor(point);
    const layer = this.context.layers.getActiveLayer();

    if (!this.isDrawing || !layer || layer.locked) {
      return;
    }

    const settings = this.context.getBrushSettings();
    const localPoint = this.applyStraightConstraint(layer.worldToLocal(point), point.shiftKey);
    const stabilized = this.stabilizer.add(localPoint, settings.stabilizer);
    this.brush.move(layer.context, stabilized, settings, this.getCompositeMode(layer.alphaLocked));
    layer.markDirty();
  }

  onPointerUp(point: ToolPointer) {
    this.onPointerMove(point);
    this.isDrawing = false;
    const layer = this.context.layers.getActiveLayer();

    if (layer) {
      this.brush.end(layer.context, this.context.getBrushSettings(), this.getCompositeMode(layer.alphaLocked));
      layer.markDirty();
    } else {
      this.brush.end();
    }

    this.stabilizer.reset();
    this.localStrokeStart = null;
  }

  onCancel() {
    this.brush.end();
    this.isDrawing = false;
    this.stabilizer.reset();
    this.localStrokeStart = null;
    this.cursorPreview.clear();
  }

  private getCompositeMode(alphaLocked: boolean): GlobalCompositeOperation {
    return alphaLocked && this.compositeMode === 'source-over' ? 'source-atop' : this.compositeMode;
  }

  private applyStraightConstraint(point: BrushPoint, shiftKey: boolean): BrushPoint {
    if (!shiftKey || !this.localStrokeStart) {
      return point;
    }

    const dx = point.x - this.localStrokeStart.x;
    const dy = point.y - this.localStrokeStart.y;

    return Math.abs(dx) > Math.abs(dy)
      ? { ...point, y: this.localStrokeStart.y }
      : { ...point, x: this.localStrokeStart.x };
  }

  protected drawCursor(point: ToolPointer) {
    const settings = this.context.getBrushSettings();
    const layer = this.context.layers.getActiveLayer();

    if (!layer || !this.isInsideLayer(point)) {
      this.cursorPreview.clear();
      return;
    }

    const radius = settings.size / 2;
    const strokeWidth = 1 / this.context.viewport.getState().scale;

    this.cursorPreview.clear();

    if (settings.presetId === 'pixel') {
      const side = Math.max(1, Math.round(settings.size));
      this.cursorPreview
        .rect(Math.round(point.x - side / 2), Math.round(point.y - side / 2), side, side)
        .stroke({ color: 0xf5f7ff, alpha: 0.78, width: strokeWidth })
        .rect(Math.round(point.x - side / 2) + strokeWidth, Math.round(point.y - side / 2) + strokeWidth, Math.max(1, side - strokeWidth * 2), Math.max(1, side - strokeWidth * 2))
        .stroke({ color: 0x8f7cff, alpha: 0.45, width: strokeWidth });
      return;
    }

    this.cursorPreview
      .circle(point.x, point.y, radius)
      .stroke({ color: 0xf5f7ff, alpha: 0.7, width: strokeWidth })
      .circle(point.x, point.y, Math.max(1, radius - 1.5))
      .stroke({ color: 0x8f7cff, alpha: 0.4, width: strokeWidth });
  }

  protected isInsideLayer(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer) {
      return false;
    }

    const local = layer.worldToLocal(point);

    return local.x >= 0 && local.y >= 0 && local.x <= layer.canvas.width && local.y <= layer.canvas.height;
  }
}
