import { Graphics, Sprite, Texture } from 'pixi.js';
import { useProjectStore } from '../../app/projectStore';
import { Layer } from '../layers/Layer';
import { Tool, ToolContext, ToolPointer } from './Tool';

type Mode = 'idle' | 'selecting' | 'move' | 'scale' | 'rotate';
type Hit = 'inside' | 'scale' | 'rotate' | 'outside';
type Rect = { x: number; y: number; width: number; height: number };
type TransformState = { x: number; y: number; scaleX: number; scaleY: number; rotation: number };

const MIN_SELECTION = 4;

const rectFromPoints = (a: ToolPointer, b: ToolPointer): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

const normalizeRect = (rect: Rect, maxWidth: number, maxHeight: number): Rect => {
  const x = Math.max(0, Math.min(maxWidth, rect.x));
  const y = Math.max(0, Math.min(maxHeight, rect.y));
  const right = Math.max(0, Math.min(maxWidth, rect.x + rect.width));
  const bottom = Math.max(0, Math.min(maxHeight, rect.y + rect.height));

  return {
    x: Math.round(Math.min(x, right)),
    y: Math.round(Math.min(y, bottom)),
    width: Math.round(Math.abs(right - x)),
    height: Math.round(Math.abs(bottom - y)),
  };
};

const rotatePoint = (x: number, y: number, center: TransformState) => {
  const cos = Math.cos(center.rotation);
  const sin = Math.sin(center.rotation);
  const dx = x - center.x;
  const dy = y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

export class TransformTool implements Tool {
  readonly id = 'transform';

  readonly cursor = 'crosshair';

  private readonly overlay = new Graphics();

  private mode: Mode = 'idle';

  private start: ToolPointer | null = null;

  private dragStartTransform: TransformState | null = null;

  private selectionDraft: Rect | null = null;

  private sourceRect: Rect | null = null;

  private transform: TransformState | null = null;

  private originalPixels: ImageData | null = null;

  private previewCanvas: HTMLCanvasElement | null = null;

  private previewTexture: Texture | null = null;

  private previewSprite: Sprite | null = null;

  constructor(private readonly context: ToolContext) {
    this.overlay.eventMode = 'none';
    this.context.overlay.addChild(this.overlay);
  }

  onActivate() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('lumitra-transform-apply', this.onExternalApply);
    window.addEventListener('lumitra-transform-cancel', this.onExternalCancel);
    this.setCursor('crosshair');
    this.draw();
  }

  onDeactivate() {
    this.cancel();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('lumitra-transform-apply', this.onExternalApply);
    window.removeEventListener('lumitra-transform-cancel', this.onExternalCancel);
    this.setCursor('');
  }

  onPointerDown(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer || layer.locked) {
      return;
    }

    if (!this.previewSprite) {
      this.startSelection(point);
      return;
    }

    const hit = this.hitTest(point);

    if (hit === 'outside') {
      this.apply();
      return;
    }

    this.start = point;
    this.dragStartTransform = this.transform ? { ...this.transform } : null;
    this.mode = hit === 'inside' ? 'move' : hit;
  }

  onPointerMove(point: ToolPointer) {
    if (this.mode === 'idle') {
      this.setCursor(this.cursorForHit(this.hitTest(point)));
      return;
    }

    if (this.mode === 'selecting' && this.start) {
      this.selectionDraft = rectFromPoints(this.start, point);
      this.draw();
      return;
    }

    if (!this.start || !this.dragStartTransform || !this.transform || !this.sourceRect) {
      return;
    }

    const dx = point.x - this.start.x;
    const dy = point.y - this.start.y;

    if (this.mode === 'move') {
      this.transform.x = this.dragStartTransform.x + dx;
      this.transform.y = this.dragStartTransform.y + dy;
    }

    if (this.mode === 'scale') {
      const local = this.toSelectionSpace(point, this.dragStartTransform);
      const nextScaleX = Math.max(0.05, Math.abs(local.x) / (this.sourceRect.width / 2));
      const nextScaleY = Math.max(0.05, Math.abs(local.y) / (this.sourceRect.height / 2));
      const uniform = Math.max(nextScaleX, nextScaleY);
      this.transform.scaleX = point.shiftKey ? uniform : nextScaleX;
      this.transform.scaleY = point.shiftKey ? uniform : nextScaleY;
    }

    if (this.mode === 'rotate') {
      const startAngle = Math.atan2(this.start.y - this.dragStartTransform.y, this.start.x - this.dragStartTransform.x);
      const nextAngle = Math.atan2(point.y - this.dragStartTransform.y, point.x - this.dragStartTransform.x);
      this.transform.rotation = this.dragStartTransform.rotation + nextAngle - startAngle;
    }

    this.updatePreviewSprite();
    this.draw();
  }

  onPointerUp() {
    if (this.mode === 'selecting') {
      this.finishSelection();
    }

    this.mode = 'idle';
    this.start = null;
    this.dragStartTransform = null;
  }

  onCancel() {
    this.cancel();
  }

  private startSelection(point: ToolPointer) {
    this.start = point;
    this.selectionDraft = { x: point.x, y: point.y, width: 0, height: 0 };
    this.mode = 'selecting';
    this.draw();
  }

  private finishSelection() {
    const layer = this.context.layers.getActiveLayer();

    if (!layer || !this.selectionDraft) {
      this.selectionDraft = null;
      this.draw();
      return;
    }

    const localStart = layer.worldToLocal({
      x: this.selectionDraft.x,
      y: this.selectionDraft.y,
      pressure: 1,
      time: performance.now(),
    });
    const localEnd = layer.worldToLocal({
      x: this.selectionDraft.x + this.selectionDraft.width,
      y: this.selectionDraft.y + this.selectionDraft.height,
      pressure: 1,
      time: performance.now(),
    });
    const localRect = normalizeRect({
      x: Math.min(localStart.x, localEnd.x),
      y: Math.min(localStart.y, localEnd.y),
      width: Math.abs(localEnd.x - localStart.x),
      height: Math.abs(localEnd.y - localStart.y),
    }, layer.canvas.width, layer.canvas.height);

    this.selectionDraft = null;

    if (localRect.width < MIN_SELECTION || localRect.height < MIN_SELECTION) {
      this.draw();
      return;
    }

    this.context.history.capture();
    this.originalPixels = layer.context.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    this.sourceRect = localRect;
    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = localRect.width;
    this.previewCanvas.height = localRect.height;
    this.previewCanvas.getContext('2d')?.putImageData(
      layer.context.getImageData(localRect.x, localRect.y, localRect.width, localRect.height),
      0,
      0,
    );

    layer.context.clearRect(localRect.x, localRect.y, localRect.width, localRect.height);
    layer.markDirtyNow();

    const center = this.localToWorld(layer, localRect.x + localRect.width / 2, localRect.y + localRect.height / 2);
    this.transform = { x: center.x, y: center.y, scaleX: 1, scaleY: 1, rotation: layer.transform.rotation };
    this.createPreviewSprite();
    this.emitTransformState(true);
    this.draw();
  }

  private createPreviewSprite() {
    this.destroyPreview();

    if (!this.previewCanvas || !this.transform) {
      return;
    }

    this.previewTexture = Texture.from(this.previewCanvas, true);
    this.previewSprite = new Sprite(this.previewTexture);
    this.previewSprite.eventMode = 'none';
    this.previewSprite.anchor.set(0.5);
    this.context.overlay.addChildAt(this.previewSprite, 0);
    this.updatePreviewSprite();
  }

  private updatePreviewSprite() {
    if (!this.previewSprite || !this.transform) {
      return;
    }

    this.previewSprite.position.set(this.transform.x, this.transform.y);
    this.previewSprite.scale.set(this.transform.scaleX, this.transform.scaleY);
    this.previewSprite.rotation = this.transform.rotation;
    this.previewTexture?.source.update();
  }

  private apply() {
    const layer = this.context.layers.getActiveLayer();

    if (layer && this.previewCanvas && this.sourceRect && this.transform) {
      const center = layer.worldToLocal({
        x: this.transform.x,
        y: this.transform.y,
        pressure: 1,
        time: performance.now(),
      });

      layer.context.save();
      layer.context.translate(center.x, center.y);
      layer.context.rotate(this.transform.rotation - layer.transform.rotation);
      layer.context.scale(this.transform.scaleX, this.transform.scaleY);
      layer.context.drawImage(this.previewCanvas, -this.sourceRect.width / 2, -this.sourceRect.height / 2);
      layer.context.restore();
      layer.markDirtyNow();
      this.context.requestLayerSync();
      useProjectStore.getState().markDirty();
    }

    this.clearState();
  }

  private cancel() {
    const layer = this.context.layers.getActiveLayer();

    if (layer && this.originalPixels) {
      layer.context.putImageData(this.originalPixels, 0, 0);
      layer.markDirtyNow();
    }

    this.clearState();
  }

  private clearState() {
    this.mode = 'idle';
    this.start = null;
    this.dragStartTransform = null;
    this.selectionDraft = null;
    this.sourceRect = null;
    this.transform = null;
    this.originalPixels = null;
    this.previewCanvas = null;
    this.destroyPreview();
    this.emitTransformState(false);
    this.draw();
  }

  private destroyPreview() {
    if (this.previewSprite) {
      this.previewSprite.destroy();
      this.previewSprite = null;
    }

    if (this.previewTexture) {
      this.previewTexture.destroy(true);
      this.previewTexture = null;
    }
  }

  private hitTest(point: ToolPointer): Hit {
    if (!this.transform || !this.sourceRect) {
      return 'outside';
    }

    const scale = this.context.viewport.getState().scale;
    const hit = 13 / scale;
    const corners = this.corners();
    const rotate = this.rotateHandle();

    if (Math.hypot(point.x - rotate.x, point.y - rotate.y) <= hit * 1.25) {
      return 'rotate';
    }

    if (corners.some((corner) => Math.hypot(point.x - corner.x, point.y - corner.y) <= hit)) {
      return 'scale';
    }

    const local = this.toSelectionSpace(point, this.transform);
    const halfW = (this.sourceRect.width * this.transform.scaleX) / 2;
    const halfH = (this.sourceRect.height * this.transform.scaleY) / 2;

    if (Math.abs(local.x) <= halfW && Math.abs(local.y) <= halfH) {
      return 'inside';
    }

    return 'outside';
  }

  private toSelectionSpace(point: ToolPointer, transform: TransformState) {
    const cos = Math.cos(-transform.rotation);
    const sin = Math.sin(-transform.rotation);
    const dx = point.x - transform.x;
    const dy = point.y - transform.y;

    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  }

  private corners() {
    if (!this.transform || !this.sourceRect) {
      return [];
    }

    const halfW = (this.sourceRect.width * this.transform.scaleX) / 2;
    const halfH = (this.sourceRect.height * this.transform.scaleY) / 2;

    return [
      rotatePoint(this.transform.x - halfW, this.transform.y - halfH, this.transform),
      rotatePoint(this.transform.x + halfW, this.transform.y - halfH, this.transform),
      rotatePoint(this.transform.x + halfW, this.transform.y + halfH, this.transform),
      rotatePoint(this.transform.x - halfW, this.transform.y + halfH, this.transform),
    ];
  }

  private rotateHandle() {
    if (!this.transform || !this.sourceRect) {
      return { x: 0, y: 0 };
    }

    const scale = this.context.viewport.getState().scale;
    const halfH = (this.sourceRect.height * this.transform.scaleY) / 2;

    return rotatePoint(this.transform.x, this.transform.y - halfH - 34 / scale, this.transform);
  }

  private localToWorld(layer: Layer, x: number, y: number) {
    const cos = Math.cos(layer.transform.rotation);
    const sin = Math.sin(layer.transform.rotation);
    const scaledX = x * layer.transform.scaleX;
    const scaledY = y * layer.transform.scaleY;

    return {
      x: layer.transform.x + scaledX * cos - scaledY * sin,
      y: layer.transform.y + scaledX * sin + scaledY * cos,
    };
  }

  private draw() {
    this.overlay.clear();

    if (this.selectionDraft) {
      const rect = this.selectionDraft;
      const scale = this.context.viewport.getState().scale;
      this.overlay
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({ color: 0x8f7cff, alpha: 0.09 })
        .rect(rect.x, rect.y, rect.width, rect.height)
        .stroke({ color: 0xf5f7ff, alpha: 0.88, width: 1.2 / scale });
      return;
    }

    if (!this.transform || !this.sourceRect) {
      return;
    }

    const scale = this.context.viewport.getState().scale;
    const handle = 6.5 / scale;
    const corners = this.corners();
    const rotate = this.rotateHandle();

    this.overlay
      .moveTo(corners[0].x, corners[0].y)
      .lineTo(corners[1].x, corners[1].y)
      .lineTo(corners[2].x, corners[2].y)
      .lineTo(corners[3].x, corners[3].y)
      .lineTo(corners[0].x, corners[0].y)
      .stroke({ color: 0xffffff, alpha: 0.92, width: 1.4 / scale })
      .moveTo((corners[0].x + corners[1].x) / 2, (corners[0].y + corners[1].y) / 2)
      .lineTo(rotate.x, rotate.y)
      .stroke({ color: 0x8f7cff, alpha: 0.92, width: 1 / scale });

    corners.forEach((corner) => {
      this.overlay
        .circle(corner.x, corner.y, handle)
        .fill({ color: 0xf5f7ff, alpha: 1 })
        .stroke({ color: 0x111827, alpha: 0.9, width: 1 / scale });
    });

    this.overlay
      .circle(rotate.x, rotate.y, handle)
      .fill({ color: 0x5ed7ff, alpha: 1 })
      .stroke({ color: 0xffffff, alpha: 0.9, width: 1 / scale });
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.apply();
    }
  };

  private onExternalApply = () => {
    this.apply();
  };

  private onExternalCancel = () => {
    this.cancel();
  };

  private emitTransformState(active: boolean) {
    window.dispatchEvent(new CustomEvent('lumitra-transform-state', { detail: active }));
  }

  private cursorForHit(hit: Hit) {
    if (hit === 'inside') return 'move';
    if (hit === 'scale') return 'nwse-resize';
    if (hit === 'rotate') return 'grab';
    return 'crosshair';
  }

  private setCursor(cursor: string) {
    this.context.app.canvas.style.cursor = cursor;
  }
}
