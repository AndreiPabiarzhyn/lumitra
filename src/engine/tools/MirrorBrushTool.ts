import { Graphics } from 'pixi.js';
import { BrushEngine } from '../brush/BrushEngine';
import { BrushPoint } from '../brush/types';
import { Layer } from '../layers/Layer';
import { Stabilizer } from '../brush/Stabilizer';
import { Tool, ToolContext, ToolPointer } from './Tool';

export class MirrorBrushTool implements Tool {
  readonly id = 'mirror-brush';

  readonly cursor = 'none';

  private readonly brush = new BrushEngine();

  private readonly mirroredBrush = new BrushEngine();

  private readonly stabilizer = new Stabilizer();

  private readonly mirroredStabilizer = new Stabilizer();

  private readonly cursorPreview = new Graphics();

  private isDrawing = false;

  constructor(private readonly context: ToolContext) {
    this.cursorPreview.eventMode = 'none';
    this.context.overlay.addChild(this.cursorPreview);
  }

  onPointerDown(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer || layer.locked || !this.isInsideLayer(point, layer)) {
      return;
    }

    const localPoint = layer.worldToLocal(point);
    const mirroredPoint = this.mirrorLocalPoint(layer, localPoint);

    this.context.history.capture();
    this.isDrawing = true;
    this.stabilizer.reset(localPoint);
    this.mirroredStabilizer.reset(mirroredPoint);
    this.brush.begin(layer.context, localPoint, this.context.getBrushSettings(), this.getCompositeMode(layer.alphaLocked));
    this.mirroredBrush.begin(layer.context, mirroredPoint, this.context.getBrushSettings(), this.getCompositeMode(layer.alphaLocked));
    layer.markDirty();
    this.drawCursor(point, layer);
  }

  onPointerMove(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (layer) {
      this.drawCursor(point, layer);
    }

    if (!this.isDrawing || !layer || layer.locked) {
      return;
    }

    const settings = this.context.getBrushSettings();
    const localPoint = layer.worldToLocal(point);
    const mirroredPoint = this.mirrorLocalPoint(layer, localPoint);
    const stabilized = this.stabilizer.add(localPoint, settings.stabilizer);
    const mirroredStabilized = this.mirroredStabilizer.add(mirroredPoint, settings.stabilizer);

    this.brush.move(layer.context, stabilized, settings, this.getCompositeMode(layer.alphaLocked));
    this.mirroredBrush.move(layer.context, mirroredStabilized, settings, this.getCompositeMode(layer.alphaLocked));
    layer.markDirty();
  }

  onPointerUp(point: ToolPointer) {
    this.onPointerMove(point);
    this.isDrawing = false;
    const layer = this.context.layers.getActiveLayer();

    if (layer) {
      const settings = this.context.getBrushSettings();
      const mode = this.getCompositeMode(layer.alphaLocked);
      this.brush.end(layer.context, settings, mode);
      this.mirroredBrush.end(layer.context, settings, mode);
      layer.markDirty();
    } else {
      this.brush.end();
      this.mirroredBrush.end();
    }

    this.stabilizer.reset();
    this.mirroredStabilizer.reset();
  }

  onCancel() {
    this.isDrawing = false;
    this.brush.end();
    this.mirroredBrush.end();
    this.stabilizer.reset();
    this.mirroredStabilizer.reset();
    this.cursorPreview.clear();
  }

  private mirrorLocalPoint(layer: Layer, point: BrushPoint): BrushPoint {
    return {
      ...point,
      x: layer.canvas.width - point.x,
    };
  }

  private getCompositeMode(alphaLocked: boolean): GlobalCompositeOperation {
    return alphaLocked ? 'source-atop' : 'source-over';
  }

  private localToWorld(layer: Layer, point: BrushPoint) {
    const cos = Math.cos(layer.transform.rotation);
    const sin = Math.sin(layer.transform.rotation);
    const scaledX = point.x * layer.transform.scaleX;
    const scaledY = point.y * layer.transform.scaleY;

    return {
      x: layer.transform.x + scaledX * cos - scaledY * sin,
      y: layer.transform.y + scaledX * sin + scaledY * cos,
    };
  }

  private drawCursor(point: ToolPointer, layer: Layer) {
    const settings = this.context.getBrushSettings();

    if (!this.isInsideLayer(point, layer)) {
      this.cursorPreview.clear();
      return;
    }

    const radius = settings.size / 2;
    const scale = this.context.viewport.getState().scale;
    const mirrored = this.localToWorld(layer, this.mirrorLocalPoint(layer, layer.worldToLocal(point)));

    this.cursorPreview.clear();

    if (settings.presetId === 'pixel') {
      const side = Math.max(1, Math.round(settings.size));
      this.cursorPreview
        .rect(Math.round(point.x - side / 2), Math.round(point.y - side / 2), side, side)
        .stroke({ color: 0xf5f7ff, alpha: 0.72, width: 1 / scale })
        .rect(Math.round(mirrored.x - side / 2), Math.round(mirrored.y - side / 2), side, side)
        .stroke({ color: 0x5ed7ff, alpha: 0.72, width: 1 / scale });
      return;
    }

    this.cursorPreview
      .circle(point.x, point.y, radius)
      .stroke({ color: 0xf5f7ff, alpha: 0.72, width: 1 / scale })
      .circle(mirrored.x, mirrored.y, radius)
      .stroke({ color: 0x5ed7ff, alpha: 0.72, width: 1 / scale });
  }

  private isInsideLayer(point: ToolPointer, layer: Layer) {
    const local = layer.worldToLocal(point);

    return local.x >= 0 && local.y >= 0 && local.x <= layer.canvas.width && local.y <= layer.canvas.height;
  }
}
