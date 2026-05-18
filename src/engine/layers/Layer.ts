import { Sprite, Texture } from 'pixi.js';
import { BrushPoint } from '../brush/types';
import { LayerCreateOptions, LayerSnapshot, LayerTransform } from './types';

const defaultTransform = (): LayerTransform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
});

export class Layer {
  readonly id: string;

  name: string;

  visible: boolean;

  opacity: number;

  locked: boolean;

  alphaLocked: boolean;

  readonly canvas: HTMLCanvasElement;

  readonly context: CanvasRenderingContext2D;

  readonly texture: Texture;

  readonly sprite: Sprite;

  transform: LayerTransform;

  thumbnail = '';

  private updateQueued = false;

  private readonly thumbnailCanvas = document.createElement('canvas');

  private readonly thumbnailContext: CanvasRenderingContext2D;

  onChange: (() => void) | null = null;

  constructor(options: LayerCreateOptions) {
    this.id = options.id;
    this.name = options.name;
    this.visible = options.visible ?? true;
    this.opacity = options.opacity ?? 1;
    this.locked = options.locked ?? false;
    this.alphaLocked = options.alphaLocked ?? false;
    this.transform = options.transform ?? defaultTransform();
    this.canvas = document.createElement('canvas');
    this.canvas.width = options.width;
    this.canvas.height = options.height;

    const context = this.canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      throw new Error('Unable to create layer canvas context');
    }

    this.context = context;
    const thumbnailContext = this.thumbnailCanvas.getContext('2d');

    if (!thumbnailContext) {
      throw new Error('Unable to create layer thumbnail context');
    }

    this.thumbnailContext = thumbnailContext;
    this.texture = Texture.from(this.canvas, true);
    this.sprite = new Sprite(this.texture);
    this.applyDisplayState();
    this.updateThumbnail();
  }

  markDirty() {
    if (this.updateQueued) {
      return;
    }

    this.updateQueued = true;
    requestAnimationFrame(() => {
      this.texture.source.update();
      this.updateThumbnail();
      this.onChange?.();
      this.updateQueued = false;
    });
  }

  markDirtyNow() {
    this.texture.source.update();
    this.updateThumbnail();
    this.updateQueued = false;
    this.onChange?.();
  }

  markPreviewDirty() {
    this.texture.source.update();
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.markDirty();
  }

  hasPixels() {
    const data = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;

    for (let index = 3; index < data.length; index += 4) {
      if (data[index] !== 0) {
        return true;
      }
    }

    return false;
  }

  applyDisplayState() {
    this.sprite.visible = this.visible;
    this.sprite.alpha = this.opacity;
    this.sprite.position.set(this.transform.x, this.transform.y);
    this.sprite.scale.set(this.transform.scaleX, this.transform.scaleY);
    this.sprite.rotation = this.transform.rotation;
  }

  worldToLocal(point: BrushPoint): BrushPoint {
    const cos = Math.cos(-this.transform.rotation);
    const sin = Math.sin(-this.transform.rotation);
    const translatedX = point.x - this.transform.x;
    const translatedY = point.y - this.transform.y;

    return {
      ...point,
      x: (translatedX * cos - translatedY * sin) / this.transform.scaleX,
      y: (translatedX * sin + translatedY * cos) / this.transform.scaleY,
    };
  }

  toSnapshot(): LayerSnapshot {
    return {
      id: this.id,
      name: this.name,
      visible: this.visible,
      opacity: this.opacity,
      locked: this.locked,
      alphaLocked: this.alphaLocked,
      width: this.canvas.width,
      height: this.canvas.height,
      thumbnail: this.thumbnail,
      transform: { ...this.transform },
      dataUrl: this.canvas.toDataURL('image/png'),
    };
  }

  async restoreDataUrl(dataUrl: string) {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        this.clear();
        this.context.drawImage(image, 0, 0);
        this.markDirtyNow();
        resolve();
      };
      image.onerror = () => reject(new Error('Unable to restore layer image'));
      image.src = dataUrl;
    });
  }

  async drawImageFile(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    await new Promise<void>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        this.clear();
        const scale = Math.min(this.canvas.width / image.width, this.canvas.height / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;
        this.context.drawImage(
          image,
          (this.canvas.width - width) / 2,
          (this.canvas.height - height) / 2,
          width,
          height,
        );
        this.markDirtyNow();
        resolve();
      };
      image.onerror = () => reject(new Error('Unable to import image'));
      image.src = dataUrl;
    });
  }

  destroy() {
    this.sprite.destroy();
    this.texture.destroy(true);
  }

  private updateThumbnail() {
    const size = 72;
    this.thumbnailCanvas.width = size;
    this.thumbnailCanvas.height = size;
    this.thumbnailContext.clearRect(0, 0, size, size);

    const scale = Math.min(size / this.canvas.width, size / this.canvas.height);
    const width = this.canvas.width * scale;
    const height = this.canvas.height * scale;

    this.thumbnailContext.save();
    this.thumbnailContext.fillStyle = 'rgba(255,255,255,0.04)';
    this.thumbnailContext.fillRect(0, 0, size, size);
    this.thumbnailContext.drawImage(this.canvas, (size - width) / 2, (size - height) / 2, width, height);
    this.thumbnailContext.restore();
    this.thumbnail = this.thumbnailCanvas.toDataURL('image/png');
  }
}
