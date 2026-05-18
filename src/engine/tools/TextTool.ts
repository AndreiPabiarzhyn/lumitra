import { Graphics } from 'pixi.js';
import { useProjectStore } from '../../app/projectStore';
import {
  clampCaret,
  deleteAfterCaret,
  deleteBeforeCaret,
  getLineEnd,
  getLineStart,
  insertTextAt,
  moveCaretVertical,
} from '../text/TextEditor';
import { TextEditOverlay } from '../text/TextEditOverlay';
import { TextObject } from '../text/TextObject';
import { applyTextProperties } from '../text/TextProperties';
import { resizeTextBox } from '../text/TextTransform';
import { Layer } from '../layers/Layer';
import { Tool, ToolContext, ToolPointer } from './Tool';

type TextMode = 'idle' | 'edit' | 'creating' | 'move' | 'resize-se' | 'resize-e' | 'resize-s' | 'rotate';
type TextHit = TextMode | 'inside' | 'none';

const MIN_TEXT_WIDTH = 72;
const MIN_TEXT_HEIGHT = 32;
const DEFAULT_TEXT_WIDTH = 240;

const rotatePoint = (x: number, y: number, object: TextObject) => {
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);

  return {
    x: object.x + x * object.scaleX * cos - y * object.scaleY * sin,
    y: object.y + x * object.scaleX * sin + y * object.scaleY * cos,
  };
};

export class TextTool implements Tool {
  readonly id = 'text';

  readonly cursor = 'text';

  private readonly overlay = new Graphics();

  private activeTextId: string | null = null;

  private mode: TextMode = 'idle';

  private dragStart: ToolPointer | null = null;

  private startObject: TextObject | null = null;

  private lastClickAt = 0;

  private pendingPoint: ToolPointer | null = null;

  private frameId: number | null = null;

  private editSnapshotCaptured = false;

  private caretIndex = 0;

  private readonly editOverlay = new TextEditOverlay();

  private isDomEditing = false;

  constructor(private readonly context: ToolContext) {
    this.overlay.eventMode = 'none';
    this.context.overlay.addChild(this.overlay);
  }

  onActivate() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('paste', this.onPaste);
    window.addEventListener('lumitra-active-layer-changed', this.onActiveLayerChanged);
    this.context.text.setActive(this.activeTextId);
    this.drawOverlay();
  }

  onDeactivate() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('paste', this.onPaste);
    window.removeEventListener('lumitra-active-layer-changed', this.onActiveLayerChanged);
    this.renderActive(false, true);
    this.mode = 'idle';
    this.editSnapshotCaptured = false;
    this.overlay.clear();
    this.stopDomEdit();
  }

  onPointerDown(point: ToolPointer) {
    const activeLayer = this.context.layers.getActiveLayer();

    if (!activeLayer || activeLayer.locked) {
      return;
    }

    const active = this.activeObject();
    const hitHandle = active ? this.hitTest(point, active) : 'none';

    if (active && hitHandle !== 'none') {
      const now = performance.now();
      this.mode = hitHandle === 'inside' && now - this.lastClickAt < 360 ? 'edit' : hitHandle === 'inside' ? 'move' : hitHandle;
      this.lastClickAt = now;
      this.dragStart = point;
      this.startObject = { ...active };
      if (this.mode === 'edit') {
        this.caretIndex = active.content.length;
        this.startDomEdit(active);
      } else {
        this.stopDomEdit(false);
      }
      this.renderActive(this.mode === 'edit');
      this.drawOverlay();
      return;
    }

    const local = activeLayer.worldToLocal(point);
    const hit = this.context.text.hitTest(activeLayer.id, local.x, local.y);
    const now = performance.now();

    if (hit) {
      this.select(hit);
      this.mode = now - this.lastClickAt < 360 ? 'edit' : 'move';
      this.caretIndex = hit.content.length;
      if (this.mode === 'edit') {
        this.startDomEdit(hit);
      } else {
        this.stopDomEdit(false);
      }
      this.dragStart = point;
      this.startObject = { ...hit };
      this.lastClickAt = now;
      this.renderActive(true);
      this.drawOverlay();
      return;
    }

    if (active) {
      this.mode = 'idle';
      this.editSnapshotCaptured = false;
      this.renderActive(false, true);
      this.stopDomEdit(false);
      this.drawOverlay();
      return;
    }

    if (this.context.text.hasTextInLayer(activeLayer.id)) {
      this.context.requestLayerSync();
      useProjectStore.getState().setStatus('Create a new layer before adding another text object');
      return;
    }

    this.context.history.capture();
    const layer = this.context.text.hasTextObjects() ? activeLayer : this.context.layers.createEmptyLayer();
    const textLocal = layer.worldToLocal(point);
    const object = this.context.text.create(layer, textLocal.x, textLocal.y, {
      ...this.context.getTextSettings(),
      color: this.context.getTextSettings().color,
    });

    object.content = '';
    object.width = DEFAULT_TEXT_WIDTH;
    object.height = Math.max(MIN_TEXT_HEIGHT, object.fontSize * object.lineHeight);
    this.select(object);
    this.caretIndex = 0;
    this.mode = 'creating';
    this.dragStart = point;
    this.startObject = { ...object };
    this.context.text.renderLayer(layer, object.id);
    this.context.requestLayerSync();
    this.drawOverlay();
  }

  onPointerMove(point: ToolPointer) {
    if (this.isTransforming()) {
      this.queueDrag(point);
      return;
    }

    this.updateCursor(point);
  }

  onPointerUp() {
    if (this.pendingPoint) {
      this.processDrag(this.pendingPoint);
      this.pendingPoint = null;
    }

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (this.mode === 'creating') {
      this.mode = 'edit';
      const object = this.activeObject();
      if (object) {
        this.startDomEdit(object);
      }
      this.renderActive(true, true);
    } else if (this.mode !== 'edit') {
      this.mode = 'idle';
      this.stopDomEdit(false);
      this.renderActive(false, true);
    }

    this.dragStart = null;
    this.startObject = null;
  }

  onCancel() {
    this.cancelFrame();
    this.commitActive();
  }

  private processDrag(point: ToolPointer) {
    const object = this.activeObject();

    if (!object || !this.dragStart || !this.startObject || this.mode === 'edit' || this.mode === 'idle') {
      this.updateCursor(point);
      return;
    }

    const layer = this.context.layers.getLayer(object.layerId);

    if (!layer) {
      return;
    }

    const current = layer.worldToLocal(point);
    const start = layer.worldToLocal(this.dragStart);
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    if (this.mode === 'move') {
      this.context.text.update(object.id, {
        x: this.startObject.x + dx,
        y: this.startObject.y + dy,
      });
    }

    if (this.mode === 'creating') {
      this.context.text.update(object.id, resizeTextBox(
        this.startObject,
        Math.max(MIN_TEXT_WIDTH, dx),
        Math.max(MIN_TEXT_HEIGHT, dy),
      ));
    }

    if (this.mode === 'resize-se' || this.mode === 'resize-e' || this.mode === 'resize-s') {
      this.context.text.update(object.id, resizeTextBox(
        this.startObject,
        this.mode === 'resize-s' ? this.startObject.width : this.startObject.width + dx,
        this.mode === 'resize-e' ? this.startObject.height : this.startObject.height + dy,
      ));
    }

    if (this.mode === 'rotate') {
      const center = {
        x: this.startObject.x + (this.startObject.width * this.startObject.scaleX) / 2,
        y: this.startObject.y + (this.startObject.height * this.startObject.scaleY) / 2,
      };
      this.context.text.update(object.id, {
        rotation: Math.atan2(current.y - center.y, current.x - center.x) + Math.PI / 2,
      });
    }

    this.context.text.renderLayer(layer, object.id, { commit: false });
    this.drawOverlay();
  }

  private isTransforming() {
    return Boolean(this.dragStart && this.startObject && this.mode !== 'idle' && this.mode !== 'edit');
  }

  private queueDrag(point: ToolPointer) {
    this.pendingPoint = point;

    if (this.frameId !== null) {
      return;
    }

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      const next = this.pendingPoint;
      this.pendingPoint = null;

      if (next) {
        this.processDrag(next);
      }
    });
  }

  private cancelFrame() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    this.pendingPoint = null;
  }

  private onPaste = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const object = this.activeObject();

    if (!object || this.mode !== 'edit' || !text) {
      return;
    }

    event.preventDefault();
    this.captureEditSnapshot();
    this.updateText(object, `${object.content}${text}`);
    this.caretIndex = object.content.length + text.length;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const object = this.activeObject();

    if (!object || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.mode !== 'edit') {
      event.preventDefault();
      this.deleteActiveText(object);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.commitActive();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.captureEditSnapshot();
      const next = insertTextAt(object.content, this.caretIndex, '\n');
      this.caretIndex = next.caret;
      this.updateText(object, next.content);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.captureEditSnapshot();
      const next = deleteBeforeCaret(object.content, this.caretIndex);
      this.caretIndex = next.caret;
      this.updateText(object, next.content);
      return;
    }

    if (event.key === 'Delete' && this.mode === 'edit') {
      event.preventDefault();
      this.captureEditSnapshot();
      const next = deleteAfterCaret(object.content, this.caretIndex);
      this.caretIndex = next.caret;
      this.updateText(object, next.content);
      return;
    }

    if (event.key === 'ArrowLeft' && this.mode === 'edit') {
      event.preventDefault();
      this.caretIndex = clampCaret(object.content, this.caretIndex - 1);
      this.renderActive(true);
      return;
    }

    if (event.key === 'ArrowRight' && this.mode === 'edit') {
      event.preventDefault();
      this.caretIndex = clampCaret(object.content, this.caretIndex + 1);
      this.renderActive(true);
      return;
    }

    if (event.key === 'ArrowUp' && this.mode === 'edit') {
      event.preventDefault();
      this.caretIndex = moveCaretVertical(object.content, this.caretIndex, -1);
      this.renderActive(true);
      return;
    }

    if (event.key === 'ArrowDown' && this.mode === 'edit') {
      event.preventDefault();
      this.caretIndex = moveCaretVertical(object.content, this.caretIndex, 1);
      this.renderActive(true);
      return;
    }

    if (event.key === 'Home' && this.mode === 'edit') {
      event.preventDefault();
      this.caretIndex = getLineStart(object.content, this.caretIndex);
      this.renderActive(true);
      return;
    }

    if (event.key === 'End' && this.mode === 'edit') {
      event.preventDefault();
      this.caretIndex = getLineEnd(object.content, this.caretIndex);
      this.renderActive(true);
      return;
    }

    if (event.key.length === 1 && this.mode === 'edit') {
      event.preventDefault();
      this.captureEditSnapshot();
      const next = insertTextAt(object.content, this.caretIndex, event.key);
      this.caretIndex = next.caret;
      this.updateText(object, next.content);
    }
  };

  private captureEditSnapshot() {
    if (this.editSnapshotCaptured) {
      return;
    }

    this.context.history.capture();
    this.editSnapshotCaptured = true;
  }

  private updateText(object: TextObject, content: string) {
    const layer = this.context.layers.getLayer(object.layerId);

    if (!layer) {
      return;
    }

    const settings = this.context.getTextSettings();
    this.context.text.update(object.id, { ...applyTextProperties(settings), content });
    this.context.text.renderLayer(layer, object.id, { commit: false, caretIndex: this.caretIndex });
    this.drawOverlay();
  }

  private deleteActiveText(object: TextObject) {
    const layer = this.context.layers.getLayer(object.layerId);

    if (!layer) {
      return;
    }

    this.context.history.capture();
    this.context.text.delete(object.id);
    this.activeTextId = null;
    this.context.text.setActive(null);
    this.editSnapshotCaptured = false;
    this.stopDomEdit();
    this.context.text.renderLayer(layer, null, { commit: true });
    this.context.requestLayerSync();
    this.overlay.clear();
  }

  private select(object: TextObject) {
    this.activeTextId = object.id;
    this.context.text.setActive(object.id);
    this.editSnapshotCaptured = false;
  }

  private commitActive() {
    const object = this.activeObject();

    if (object) {
      const layer = this.context.layers.getLayer(object.layerId);
      if (layer) {
        this.context.text.renderLayer(layer, null);
      }
    }

    this.activeTextId = null;
    this.context.text.setActive(null);
    this.editSnapshotCaptured = false;
    this.mode = 'idle';
    this.stopDomEdit();
    this.overlay.clear();
  }

  private renderActive(caret = false, commit = false) {
    const object = this.activeObject();
    const layer = object ? this.context.layers.getLayer(object.layerId) : null;

    if (object && layer) {
      this.context.text.renderLayer(layer, caret && !this.isDomEditing ? object.id : null, {
        commit,
        caretIndex: this.caretIndex,
        hiddenId: this.isDomEditing ? object.id : null,
      });
    }
  }

  private startDomEdit(object: TextObject) {
    const layer = this.context.layers.getLayer(object.layerId);

    if (!layer) {
      return;
    }

    this.setTextEditing(true);
    this.isDomEditing = true;
    this.context.text.renderLayer(layer, null, { commit: false, hiddenId: object.id });
    this.editOverlay.start(object, layer, this.context.viewport, this.context.app.canvas, {
      onInput: (content, caret) => {
        this.caretIndex = caret;
        this.context.text.update(object.id, { content });
      },
      onCommit: () => {
        this.stopDomEdit(true);
        this.mode = 'idle';
        this.renderActive(false, true);
        this.drawOverlay();
      },
    });
  }

  private stopDomEdit(stopKeyboard = true) {
    this.editOverlay.stop();
    this.isDomEditing = false;

    if (stopKeyboard) {
      this.setTextEditing(false);
    }
  }

  private setTextEditing(active: boolean) {
    window.dispatchEvent(new CustomEvent('lumitra-text-editing', { detail: active }));
  }

  destroy() {
    this.editOverlay.destroy();
  }

  private activeObject() {
    const object = this.activeTextId ? this.context.text.get(this.activeTextId) : null;
    const activeLayer = this.context.layers.getActiveLayer();

    return object && activeLayer?.id === object.layerId ? object : null;
  }

  private onActiveLayerChanged = () => {
    const object = this.activeTextId ? this.context.text.get(this.activeTextId) : null;
    const activeLayer = this.context.layers.getActiveLayer();

    if (object && activeLayer?.id !== object.layerId) {
      this.stopDomEdit();
      this.mode = 'idle';
      this.overlay.clear();
    }
  };

  private hitTest(point: ToolPointer, object: TextObject): TextHit {
    const scale = this.context.viewport.getState().scale;
    const hit = 11 / scale;
    const handles = this.handles(object);

    if (!handles) return 'none';

    if (Math.hypot(point.x - handles.rotate.x, point.y - handles.rotate.y) <= hit * 1.2) return 'rotate';
    if (Math.hypot(point.x - handles.se.x, point.y - handles.se.y) <= hit) return 'resize-se';
    if (Math.hypot(point.x - handles.e.x, point.y - handles.e.y) <= hit) return 'resize-e';
    if (Math.hypot(point.x - handles.s.x, point.y - handles.s.y) <= hit) return 'resize-s';

    const layer = this.context.layers.getLayer(object.layerId);
    if (!layer) return 'none';
    const local = layer.worldToLocal(point);

    return this.context.text.contains(object, local.x, local.y) ? 'inside' : 'none';
  }

  private handles(object: TextObject) {
    const layer = this.context.layers.getLayer(object.layerId);

    if (!layer) {
      return null;
    }

    const width = object.width;
    const height = object.height;
    const scale = this.context.viewport.getState().scale;

    return {
      nw: this.localToWorld(layer, rotatePoint(0, 0, object)),
      ne: this.localToWorld(layer, rotatePoint(width, 0, object)),
      se: this.localToWorld(layer, rotatePoint(width, height, object)),
      sw: this.localToWorld(layer, rotatePoint(0, height, object)),
      e: this.localToWorld(layer, rotatePoint(width, height / 2, object)),
      s: this.localToWorld(layer, rotatePoint(width / 2, height, object)),
      rotate: this.localToWorld(layer, rotatePoint(width / 2, -34 / scale, object)),
    };
  }

  private localToWorld(layer: Layer, point: { x: number; y: number }) {
    const cos = Math.cos(layer.transform.rotation);
    const sin = Math.sin(layer.transform.rotation);
    const scaledX = point.x * layer.transform.scaleX;
    const scaledY = point.y * layer.transform.scaleY;

    return {
      x: layer.transform.x + scaledX * cos - scaledY * sin,
      y: layer.transform.y + scaledX * sin + scaledY * cos,
    };
  }

  private drawOverlay() {
    this.overlay.clear();
    const object = this.activeObject();

    if (!object) {
      return;
    }

    const scale = this.context.viewport.getState().scale;
    const handle = 5.5 / scale;
    const h = this.handles(object);

    if (!h) {
      return;
    }

    this.overlay
      .moveTo(h.nw.x, h.nw.y)
      .lineTo(h.ne.x, h.ne.y)
      .lineTo(h.se.x, h.se.y)
      .lineTo(h.sw.x, h.sw.y)
      .lineTo(h.nw.x, h.nw.y)
      .stroke({ color: 0x5ed7ff, alpha: this.mode === 'edit' ? 1 : 0.86, width: 1.2 / scale })
      .moveTo((h.nw.x + h.ne.x) / 2, (h.nw.y + h.ne.y) / 2)
      .lineTo(h.rotate.x, h.rotate.y)
      .stroke({ color: 0x8f7cff, alpha: 0.8, width: 1 / scale });

    [h.nw, h.ne, h.se, h.sw, h.e, h.s].forEach((point) => {
      this.overlay
        .rect(point.x - handle, point.y - handle, handle * 2, handle * 2)
        .fill({ color: 0xf5f7ff, alpha: 1 })
        .stroke({ color: 0x10131d, alpha: 0.9, width: 1 / scale });
    });

    this.overlay
      .circle(h.rotate.x, h.rotate.y, handle)
      .fill({ color: 0x8f7cff, alpha: 1 })
      .stroke({ color: 0xffffff, alpha: 0.85, width: 1 / scale });
  }

  private updateCursor(point: ToolPointer) {
    const object = this.activeObject();
    const hit = object ? this.hitTest(point, object) : 'none';
    const canvas = this.context.app.canvas;

    canvas.style.cursor = hit === 'rotate'
      ? 'grab'
      : hit === 'resize-se'
        ? 'nwse-resize'
        : hit === 'resize-e'
          ? 'ew-resize'
          : hit === 'resize-s'
            ? 'ns-resize'
            : hit === 'inside'
              ? 'move'
              : 'text';
  }
}
