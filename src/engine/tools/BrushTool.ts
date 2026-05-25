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

  private strokeSnapshot: ImageData | null = null;

  private isStraightStroke = false;

  private lastLocalPoint: BrushPoint | null = null;

  constructor(protected readonly context: ToolContext) {
    this.cursorPreview.eventMode = 'none';
    this.context.overlay.addChild(this.cursorPreview);
  }

  onActivate() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  onDeactivate() {
    window.removeEventListener('keydown', this.handleKeyDown);
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
    this.lastLocalPoint = localPoint;
    this.strokeSnapshot = layer.context.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    this.isStraightStroke = false;
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
    const localPoint = layer.worldToLocal(point);
    this.lastLocalPoint = localPoint;

    if (point.shiftKey && this.localStrokeStart && this.strokeSnapshot) {
      this.renderStraightStroke(layer, localPoint);
      return;
    }

    if (this.isStraightStroke) {
      this.brush.end();
      this.brush.begin(layer.context, localPoint, settings, this.getCompositeMode(layer.alphaLocked));
      this.stabilizer.reset(localPoint);
      this.isStraightStroke = false;
      layer.markDirty();
      return;
    }

    const stabilized = this.stabilizer.add(localPoint, settings.stabilizer, settings.size);
    this.brush.move(layer.context, stabilized, settings, this.getCompositeMode(layer.alphaLocked));
    layer.markDirty();
  }

  onPointerUp(point: ToolPointer) {
    if (!this.isStraightStroke || point.shiftKey) {
      this.onPointerMove(point);
    }

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
    this.lastLocalPoint = null;
    this.strokeSnapshot = null;
    this.isStraightStroke = false;
  }

  onCancel() {
    this.brush.end();
    this.isDrawing = false;
    this.stabilizer.reset();
    this.localStrokeStart = null;
    this.lastLocalPoint = null;
    this.strokeSnapshot = null;
    this.isStraightStroke = false;
    this.cursorPreview.clear();
  }

  onPointerLeave() {
    this.context.app.canvas.style.cursor = 'default';
    this.cursorPreview.clear();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Shift' || !this.isDrawing || !this.lastLocalPoint) {
      return;
    }

    const layer = this.context.layers.getActiveLayer();

    if (layer && this.strokeSnapshot && this.localStrokeStart) {
      this.renderStraightStroke(layer, this.lastLocalPoint);
    }
  };

  private getCompositeMode(alphaLocked: boolean): GlobalCompositeOperation {
    return alphaLocked && this.compositeMode === 'source-over' ? 'source-atop' : this.compositeMode;
  }

  private renderStraightStroke(layer: ReturnType<ToolContext['layers']['getActiveLayer']>, endPoint: BrushPoint) {
    if (!layer || !this.localStrokeStart || !this.strokeSnapshot) {
      return;
    }

    const settings = this.context.getBrushSettings();
    const mode = this.getCompositeMode(layer.alphaLocked);
    const ctx = layer.context;

    ctx.putImageData(this.strokeSnapshot, 0, 0);
    this.brush.end();

    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = settings.opacity;
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = Math.max(1, settings.size);
    ctx.lineCap = settings.presetId === 'pixel' ? 'butt' : 'round';
    ctx.lineJoin = settings.presetId === 'pixel' ? 'miter' : 'round';
    ctx.imageSmoothingEnabled = settings.presetId !== 'pixel';
    ctx.beginPath();
    ctx.moveTo(this.localStrokeStart.x, this.localStrokeStart.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
    ctx.restore();

    this.isStraightStroke = true;
    layer.markDirty();
  }

  protected drawCursor(point: ToolPointer) {
    const settings = this.context.getBrushSettings();
    const layer = this.context.layers.getActiveLayer();

    if (!layer || !this.isInsideLayer(point)) {
      this.context.app.canvas.style.cursor = 'default';
      this.cursorPreview.clear();
      return;
    }

    this.context.app.canvas.style.cursor = this.cursor;
    const radius = settings.size / 2;
    const strokeWidth = 1 / this.context.viewport.getState().scale;

    this.cursorPreview.clear();

    if (settings.presetId === 'pixel') {
      const side = Math.max(1, Math.round(settings.size));
      const x = Math.round(point.x - side / 2);
      const y = Math.round(point.y - side / 2);
      this.cursorPreview
        .rect(x, y, side, side)
        .stroke({ color: 0x05070d, alpha: 0.86, width: strokeWidth * 3 })
        .rect(x, y, side, side)
        .stroke({ color: 0xffffff, alpha: 0.92, width: strokeWidth * 1.2 });
      return;
    }

    this.cursorPreview
      .circle(point.x, point.y, radius)
      .stroke({ color: 0x05070d, alpha: 0.86, width: strokeWidth * 3 })
      .circle(point.x, point.y, radius)
      .stroke({ color: 0xffffff, alpha: 0.92, width: strokeWidth * 1.2 });
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
