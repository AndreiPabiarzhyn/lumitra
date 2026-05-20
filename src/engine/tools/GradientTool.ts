import { Graphics, Sprite, Texture } from 'pixi.js';
import { createGradientObject } from '../gradient/GradientObject';
import { GradientRenderer } from '../gradient/GradientRenderer';
import { GradientObject } from '../gradient/GradientTypes';
import { Tool, ToolContext, ToolPointer } from './Tool';

type GradientHandle = 'draw' | 'move-start' | 'move-end' | 'move-body';

type Point = {
  x: number;
  y: number;
};

const MAX_PREVIEW_EDGE = 960;

export class GradientTool implements Tool {
  readonly id = 'gradient';

  readonly cursor = 'crosshair';

  private start: ToolPointer | null = null;

  private pendingObject: GradientObject | null = null;

  private activeHandle: GradientHandle | null = null;

  private dragOrigin: ToolPointer | null = null;

  private objectOrigin: GradientObject | null = null;

  private readonly handles = new Graphics();

  private previewCanvas: HTMLCanvasElement | null = null;

  private previewTexture: Texture | null = null;

  private previewSprite: Sprite | null = null;

  private previewScale = 1;

  private queuedPreviewPoint: ToolPointer | null = null;

  private queuedObjectPreview = false;

  private previewFrame: number | null = null;

  private readonly renderer = new GradientRenderer();

  constructor(private readonly context: ToolContext) {
    this.handles.eventMode = 'none';
    this.context.overlay.addChild(this.handles);
    window.addEventListener('keydown', this.onKeyDown);
  }

  onPointerDown(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer || layer.locked) {
      return;
    }

    if (this.pendingObject) {
      const handle = this.hitTestPending(point);

      if (handle) {
        this.activeHandle = handle;
        this.dragOrigin = point;
        this.objectOrigin = { ...this.pendingObject };
        return;
      }

      this.applyPending();
      return;
    }

    this.start = point;
    this.activeHandle = 'draw';
    this.ensurePreview(layer.canvas.width, layer.canvas.height);
    this.drawPreview(point);
  }

  onPointerMove(point: ToolPointer) {
    if (this.pendingObject && this.activeHandle && this.activeHandle !== 'draw') {
      this.updatePendingTransform(point);
      return;
    }

    if (!this.start) {
      return;
    }

    this.queuePreview(point);
  }

  onPointerUp(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (this.pendingObject && this.activeHandle && this.activeHandle !== 'draw') {
      this.activeHandle = null;
      this.dragOrigin = null;
      this.objectOrigin = null;
      return;
    }

    if (!this.start || !layer || layer.locked) {
      this.cancelPending();
      return;
    }

    const end = this.constrainPoint(this.start, point);

    if (Math.hypot(end.x - this.start.x, end.y - this.start.y) < 2) {
      this.cancelPending();
      return;
    }

    const start = layer.worldToLocal(this.start);
    const finish = layer.worldToLocal(end);
    this.pendingObject = createGradientObject(layer.id, this.context.getGradientSettings(), start, finish);
    this.start = null;
    this.activeHandle = null;
    this.drawObjectPreview();
  }

  onCancel() {
    this.cancelPending();
  }

  onDeactivate() {
    this.applyPending();
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.cancelPending();
  }

  private ensurePreview(width: number, height: number) {
    const previewScale = Math.min(1, MAX_PREVIEW_EDGE / Math.max(width, height));
    const previewWidth = Math.max(1, Math.round(width * previewScale));
    const previewHeight = Math.max(1, Math.round(height * previewScale));

    if (
      this.previewCanvas?.width === previewWidth
      && this.previewCanvas.height === previewHeight
      && this.previewSprite
    ) {
      this.previewScale = previewScale;
      return;
    }

    this.destroyPreview();
    this.previewScale = previewScale;
    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = previewWidth;
    this.previewCanvas.height = previewHeight;
    this.previewTexture = Texture.from(this.previewCanvas, true);
    this.previewSprite = new Sprite(this.previewTexture);
    this.previewSprite.eventMode = 'none';
    this.previewSprite.alpha = 0.68;
    this.context.overlay.addChildAt(this.previewSprite, 0);
  }

  private queuePreview(point: ToolPointer) {
    this.queuedPreviewPoint = point;
    this.schedulePreviewFrame();
  }

  private queueObjectPreview() {
    this.queuedObjectPreview = true;
    this.schedulePreviewFrame();
  }

  private schedulePreviewFrame() {
    if (this.previewFrame !== null) {
      return;
    }

    this.previewFrame = requestAnimationFrame(() => {
      this.previewFrame = null;
      const nextPoint = this.queuedPreviewPoint;
      const shouldDrawObject = this.queuedObjectPreview;

      this.queuedPreviewPoint = null;
      this.queuedObjectPreview = false;

      if (nextPoint) {
        this.drawPreview(nextPoint);
      } else if (shouldDrawObject) {
        this.drawObjectPreview();
      }
    });
  }

  private drawPreview(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!this.start || !layer || !this.previewCanvas || !this.previewTexture || !this.previewSprite) {
      return;
    }

    const end = this.constrainPoint(this.start, point);
    const ctx = this.previewCanvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.renderGradient(ctx, this.start, end, false, this.previewScale);
    this.previewTexture.source.update();
    this.previewSprite.position.set(layer.transform.x, layer.transform.y);
    this.previewSprite.scale.set(layer.transform.scaleX / this.previewScale, layer.transform.scaleY / this.previewScale);
    this.previewSprite.rotation = layer.transform.rotation;
    this.drawHandles(end);
  }

  private drawObjectPreview() {
    const object = this.pendingObject;
    const layer = object ? this.context.layers.getLayer(object.layerId) : null;

    if (!object || !layer) {
      return;
    }

    this.ensurePreview(layer.canvas.width, layer.canvas.height);

    if (!this.previewCanvas || !this.previewTexture || !this.previewSprite) {
      return;
    }

    const ctx = this.previewCanvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.renderer.render(ctx, this.scaleGradientObject(object, this.previewScale), false);
    this.previewTexture.source.update();
    this.previewSprite.position.set(layer.transform.x, layer.transform.y);
    this.previewSprite.scale.set(layer.transform.scaleX / this.previewScale, layer.transform.scaleY / this.previewScale);
    this.previewSprite.rotation = layer.transform.rotation;
    this.drawObjectHandles(object);
  }

  private renderGradient(
    ctx: CanvasRenderingContext2D,
    startWorld: ToolPointer,
    endWorld: ToolPointer,
    alphaLocked: boolean,
    scale = 1,
  ) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer) {
      return;
    }

    const start = layer.worldToLocal(startWorld);
    const end = layer.worldToLocal(endWorld);
    this.renderer.render(
      ctx,
      createGradientObject(
        layer.id,
        this.context.getGradientSettings(),
        { ...start, x: start.x * scale, y: start.y * scale },
        { ...end, x: end.x * scale, y: end.y * scale },
      ),
      alphaLocked,
    );
  }

  private scaleGradientObject(object: GradientObject, scale: number): GradientObject {
    return {
      ...object,
      startX: object.startX * scale,
      startY: object.startY * scale,
      endX: object.endX * scale,
      endY: object.endY * scale,
    };
  }

  private drawHandles(end: ToolPointer) {
    if (!this.start) {
      return;
    }

    const scale = this.context.viewport.getState().scale;
    this.handles.clear()
      .moveTo(this.start.x, this.start.y)
      .lineTo(end.x, end.y)
      .stroke({ color: 0xf5f7ff, alpha: 0.92, width: 1.5 / scale })
      .circle(this.start.x, this.start.y, 5 / scale)
      .fill({ color: 0xf5f7ff, alpha: 1 })
      .circle(end.x, end.y, 5 / scale)
      .fill({ color: 0x8f7cff, alpha: 1 });
  }

  private drawObjectHandles(object: GradientObject) {
    const layer = this.context.layers.getLayer(object.layerId);

    if (!layer) {
      return;
    }

    const start = this.localToWorld(layer.transform, { x: object.startX, y: object.startY });
    const end = this.localToWorld(layer.transform, { x: object.endX, y: object.endY });
    const center = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
    const scale = this.context.viewport.getState().scale;

    this.handles.clear()
      .moveTo(start.x, start.y)
      .lineTo(end.x, end.y)
      .stroke({ color: 0xf5f7ff, alpha: 0.94, width: 1.6 / scale })
      .circle(start.x, start.y, 6 / scale)
      .fill({ color: 0xf5f7ff, alpha: 1 })
      .circle(end.x, end.y, 6 / scale)
      .fill({ color: 0x8f7cff, alpha: 1 })
      .circle(center.x, center.y, 4 / scale)
      .fill({ color: 0x5ed7ff, alpha: 1 });
  }

  private hitTestPending(point: ToolPointer): GradientHandle | null {
    const object = this.pendingObject;
    const layer = object ? this.context.layers.getLayer(object.layerId) : null;

    if (!object || !layer) {
      return null;
    }

    const local = layer.worldToLocal(point);
    const radius = 14 / Math.max(0.1, this.context.viewport.getState().scale);
    const startDistance = Math.hypot(local.x - object.startX, local.y - object.startY);
    const endDistance = Math.hypot(local.x - object.endX, local.y - object.endY);

    if (startDistance <= radius) {
      return 'move-start';
    }

    if (endDistance <= radius) {
      return 'move-end';
    }

    const distanceToLine = this.distanceToSegment(local, { x: object.startX, y: object.startY }, { x: object.endX, y: object.endY });

    return distanceToLine <= radius ? 'move-body' : null;
  }

  private updatePendingTransform(point: ToolPointer) {
    if (!this.pendingObject || !this.dragOrigin || !this.objectOrigin || !this.activeHandle) {
      return;
    }

    const layer = this.context.layers.getLayer(this.pendingObject.layerId);

    if (!layer) {
      return;
    }

    const current = layer.worldToLocal(point);
    const origin = layer.worldToLocal(this.dragOrigin);
    const dx = current.x - origin.x;
    const dy = current.y - origin.y;
    const next = { ...this.objectOrigin };

    if (this.activeHandle === 'move-body') {
      next.startX += dx;
      next.startY += dy;
      next.endX += dx;
      next.endY += dy;
    }

    if (this.activeHandle === 'move-start') {
      next.startX = current.x;
      next.startY = current.y;
    }

    if (this.activeHandle === 'move-end') {
      next.endX = current.x;
      next.endY = current.y;
    }

    this.pendingObject = next;
    this.queueObjectPreview();
  }

  private applyPending() {
    const object = this.pendingObject;
    const layer = object ? this.context.layers.getLayer(object.layerId) : null;

    if (!object || !layer || layer.locked) {
      this.cancelPending();
      return;
    }

    this.context.history.capture();
    this.renderer.render(layer.context, object, layer.alphaLocked);
    layer.markDirty();
    this.context.requestLayerSync();
    this.clear();
  }

  private cancelPending() {
    this.clear();
  }

  private constrainPoint(start: ToolPointer, point: ToolPointer): ToolPointer {
    if (!point.shiftKey) {
      return point;
    }

    const dx = point.x - start.x;
    const dy = point.y - start.y;
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const length = Math.hypot(dx, dy);

    return {
      ...point,
      x: start.x + Math.cos(snapped) * length,
      y: start.y + Math.sin(snapped) * length,
    };
  }

  private clear() {
    this.start = null;
    this.pendingObject = null;
    this.activeHandle = null;
    this.dragOrigin = null;
    this.objectOrigin = null;
    this.handles.clear();
    this.destroyPreview();
    this.queuedPreviewPoint = null;
    this.queuedObjectPreview = false;
    if (this.previewFrame !== null) {
      cancelAnimationFrame(this.previewFrame);
      this.previewFrame = null;
    }
  }

  private destroyPreview() {
    this.previewSprite?.destroy();
    this.previewTexture?.destroy(true);
    this.previewSprite = null;
    this.previewTexture = null;
    this.previewCanvas = null;
    this.previewScale = 1;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.pendingObject) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyPending();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelPending();
    }
  };

  private distanceToSegment(point: Point, start: Point, end: Point) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
    const projected = {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };

    return Math.hypot(point.x - projected.x, point.y - projected.y);
  }

  private localToWorld(transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }, point: Point): Point {
    const x = point.x * transform.scaleX;
    const y = point.y * transform.scaleY;
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    return {
      x: transform.x + x * cos - y * sin,
      y: transform.y + x * sin + y * cos,
    };
  }
}
