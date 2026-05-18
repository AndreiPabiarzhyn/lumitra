import { TextSettings } from '../../app/textStore';
import { Layer } from '../layers/Layer';
import { createTextObject, SerializedTextObject, TextObject } from './TextObject';
import { applyTextProperties } from './TextProperties';
import { TextRenderer } from './TextRenderer';

export class TextManager {
  private readonly objects = new Map<string, TextObject>();

  private readonly renderer = new TextRenderer();

  private activeId: string | null = null;

  create(layer: Layer, x: number, y: number, settings: TextSettings) {
    const object = createTextObject(layer.id, x, y, settings);
    this.objects.set(object.id, object);
    this.activeId = object.id;
    return object;
  }

  setActive(id: string | null) {
    this.activeId = id;
  }

  getActive() {
    return this.activeId ? this.get(this.activeId) : null;
  }

  get(id: string) {
    return this.objects.get(id) ?? null;
  }

  update(id: string, patch: Partial<TextObject>) {
    const object = this.objects.get(id);

    if (!object) {
      return null;
    }

    Object.assign(object, patch);
    return object;
  }

  delete(id: string) {
    const object = this.objects.get(id);

    if (!object) {
      return null;
    }

    this.objects.delete(id);

    if (this.activeId === id) {
      this.activeId = null;
    }

    return object;
  }

  hitTest(layerId: string, x: number, y: number) {
    const objects = [...this.objects.values()].filter((object) => object.layerId === layerId).reverse();

    return objects.find((object) => this.contains(object, x, y)) ?? null;
  }

  hitTestAny(layers: Layer[], x: number, y: number) {
    for (const layer of [...layers].reverse()) {
      if (!layer.visible || layer.locked) {
        continue;
      }

      const local = layer.worldToLocal({
        x,
        y,
        pressure: 1,
        time: performance.now(),
      });
      const object = this.hitTest(layer.id, local.x, local.y);

      if (object) {
        return { object, layer };
      }
    }

    return null;
  }

  contains(object: TextObject, x: number, y: number) {
    const cos = Math.cos(-object.rotation);
    const sin = Math.sin(-object.rotation);
    const dx = x - object.x;
    const dy = y - object.y;
    const localX = (dx * cos - dy * sin) / object.scaleX;
    const localY = (dx * sin + dy * cos) / object.scaleY;

    return localX >= 0 && localY >= 0 && localX <= object.width && localY <= object.height;
  }

  getWrappedLines(object: TextObject) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return ctx ? this.renderer.wrapLines(ctx, object) : object.content.split('\n');
  }

  renderLayer(layer: Layer, activeId: string | null = null, options: { commit?: boolean; caretIndex?: number; hiddenId?: string | null } = {}) {
    layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

    for (const object of this.objects.values()) {
      if (object.layerId === layer.id) {
        if (options.hiddenId === object.id) {
          continue;
        }

        this.renderer.render(layer.context, object, {
          caret: object.id === activeId,
          caretIndex: object.id === activeId ? options.caretIndex : undefined,
        });
      }
    }

    if (options.commit === false) {
      layer.markPreviewDirty();
    } else {
      layer.markDirtyNow();
    }
  }

  applySettingsToActive(settings: TextSettings, getLayer: (id: string) => Layer | undefined) {
    const object = this.getActive();

    if (!object) {
      return false;
    }

    Object.assign(object, applyTextProperties(settings));
    const layer = getLayer(object.layerId);

    if (layer) {
      this.renderLayer(layer, object.id, { commit: false });
      return true;
    }

    return false;
  }

  toJSON(): SerializedTextObject[] {
    return [...this.objects.values()].map((object) => ({ ...object }));
  }

  restore(objects: SerializedTextObject[] = []) {
    this.objects.clear();
    this.activeId = null;
    objects.forEach((object) => this.objects.set(object.id, { ...object }));
  }

  clearLayer(layerId: string) {
    [...this.objects.values()].forEach((object) => {
      if (object.layerId === layerId) {
        this.objects.delete(object.id);
        if (this.activeId === object.id) {
          this.activeId = null;
        }
      }
    });
  }

  hasTextObjects() {
    return this.objects.size > 0;
  }

  hasTextInLayer(layerId: string) {
    return [...this.objects.values()].some((object) => object.layerId === layerId);
  }
}
