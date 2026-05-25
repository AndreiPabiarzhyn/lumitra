import { Layer } from '../layers/Layer';
import { Tool, ToolContext, ToolPointer } from './Tool';

type Rgba = [number, number, number, number];

const hexToRgba = (hex: string): Rgba => {
  const normalized = hex.replace('#', '');

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    255,
  ];
};

const readPixel = (data: Uint8ClampedArray, pixel: number): Rgba => {
  const index = pixel * 4;

  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
};

const premultipliedDistance = (data: Uint8ClampedArray, pixel: number, target: Rgba) => {
  const index = pixel * 4;
  const sourceAlpha = data[index + 3] / 255;
  const targetAlpha = target[3] / 255;
  const dr = data[index] * sourceAlpha - target[0] * targetAlpha;
  const dg = data[index + 1] * sourceAlpha - target[1] * targetAlpha;
  const db = data[index + 2] * sourceAlpha - target[2] * targetAlpha;
  const da = (data[index + 3] - target[3]) * 0.9;

  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
};

const writePixel = (data: Uint8ClampedArray, pixel: number, fill: Rgba, preserveAlpha = false) => {
  const index = pixel * 4;
  const alpha = preserveAlpha ? data[index + 3] : fill[3];

  data[index] = fill[0];
  data[index + 1] = fill[1];
  data[index + 2] = fill[2];
  data[index + 3] = alpha;
};

export class FillTool implements Tool {
  readonly id = 'fill';

  readonly cursor = 'cell';

  constructor(private readonly context: ToolContext) {}

  onPointerDown(point: ToolPointer) {
    const layer = this.context.layers.getActiveLayer();

    if (!layer || layer.locked) {
      return;
    }

    const localPoint = layer.worldToLocal(point);
    const x = Math.floor(localPoint.x);
    const y = Math.floor(localPoint.y);

    if (x < 0 || y < 0 || x >= layer.canvas.width || y >= layer.canvas.height) {
      return;
    }

    const settings = this.context.getFillSettings();
    const width = layer.canvas.width;
    const height = layer.canvas.height;
    const writeImage = layer.context.getImageData(0, 0, width, height);
    const writeData = writeImage.data;
    const writeOriginal = new Uint8ClampedArray(writeData);
    const sampleData = settings.sampleAllLayers ? this.createMergedSample(layer) : new Uint8ClampedArray(writeData);
    const seedPixel = y * width + x;
    const target = readPixel(sampleData, seedPixel);
    const fill = hexToRgba(this.context.getBrushSettings().color);

    if (premultipliedDistance(writeData, seedPixel, fill) < 1) {
      return;
    }

    this.context.history.capture();

    const mask = settings.contiguous
      ? this.createContiguousMask(sampleData, width, height, seedPixel, target, layer.alphaLocked)
      : this.createGlobalMask(sampleData, width, height, target, layer.alphaLocked);

    let changed = false;

    for (let pixel = 0; pixel < mask.length; pixel += 1) {
      if (!mask[pixel]) {
        continue;
      }

      if (layer.alphaLocked && writeOriginal[pixel * 4 + 3] === 0) {
        continue;
      }

      writePixel(writeData, pixel, fill, layer.alphaLocked);
      changed = true;
    }

    if (settings.antiAlias && !settings.pixelPerfect && settings.expandEdges > 0) {
      changed = this.expandAntiAliasedEdges(writeData, writeOriginal, sampleData, mask, width, height, target, fill, layer.alphaLocked) || changed;
    }

    if (!changed) {
      return;
    }

    layer.context.putImageData(writeImage, 0, 0);
    layer.markDirty();
  }

  private createContiguousMask(
    sampleData: Uint8ClampedArray,
    width: number,
    height: number,
    seedPixel: number,
    target: Rgba,
    alphaLocked: boolean,
  ) {
    const mask = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);
    const stack: number[] = [seedPixel];

    while (stack.length > 0) {
      const seed = stack.pop() ?? 0;
      const y = Math.floor(seed / width);
      let left = seed % width;
      let right = left;

      while (left >= 0 && this.canFlood(sampleData, y * width + left, target, visited, alphaLocked)) {
        left -= 1;
      }

      left += 1;

      while (right < width && this.canFlood(sampleData, y * width + right, target, visited, alphaLocked)) {
        right += 1;
      }

      right -= 1;

      for (let x = left; x <= right; x += 1) {
        const pixel = y * width + x;
        visited[pixel] = 1;
        mask[pixel] = 1;
      }

      this.queueNeighborSpans(stack, sampleData, visited, width, height, y - 1, left, right, target, alphaLocked);
      this.queueNeighborSpans(stack, sampleData, visited, width, height, y + 1, left, right, target, alphaLocked);
    }

    return mask;
  }

  private createGlobalMask(sampleData: Uint8ClampedArray, width: number, height: number, target: Rgba, alphaLocked: boolean) {
    const mask = new Uint8Array(width * height);
    const threshold = this.getThreshold();

    for (let pixel = 0; pixel < mask.length; pixel += 1) {
      if (alphaLocked && sampleData[pixel * 4 + 3] === 0) {
        continue;
      }

      if (premultipliedDistance(sampleData, pixel, target) <= threshold) {
        mask[pixel] = 1;
      }
    }

    return mask;
  }

  private queueNeighborSpans(
    stack: number[],
    sampleData: Uint8ClampedArray,
    visited: Uint8Array,
    width: number,
    height: number,
    y: number,
    left: number,
    right: number,
    target: Rgba,
    alphaLocked: boolean,
  ) {
    if (y < 0 || y >= height) {
      return;
    }

    let inSpan = false;

    for (let x = left; x <= right; x += 1) {
      const pixel = y * width + x;

      if (this.canFlood(sampleData, pixel, target, visited, alphaLocked)) {
        if (!inSpan) {
          stack.push(pixel);
          inSpan = true;
        }
      } else {
        inSpan = false;
      }
    }
  }

  private canFlood(sampleData: Uint8ClampedArray, pixel: number, target: Rgba, visited: Uint8Array, alphaLocked: boolean) {
    if (visited[pixel]) {
      return false;
    }

    if (alphaLocked && sampleData[pixel * 4 + 3] === 0) {
      return false;
    }

    return premultipliedDistance(sampleData, pixel, target) <= this.getThreshold();
  }

  private expandAntiAliasedEdges(
    writeData: Uint8ClampedArray,
    writeOriginal: Uint8ClampedArray,
    sampleData: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    target: Rgba,
    fill: Rgba,
    alphaLocked: boolean,
  ) {
    const settings = this.context.getFillSettings();
    const expansion = Math.max(0, Math.min(10, Math.round(settings.expandEdges)));
    const edgeThreshold = this.getThreshold() + settings.tolerance * 3.2 + 42;
    let changed = false;

    for (let pass = 0; pass < expansion; pass += 1) {
      const nextMask = new Uint8Array(mask);

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const pixel = y * width + x;

          if (mask[pixel]) {
            continue;
          }

          const filledNeighbors = this.countFilledNeighbors(mask, pixel, width);

          if (filledNeighbors === 0) {
            continue;
          }

          const index = pixel * 4;

          if (alphaLocked && writeOriginal[index + 3] === 0) {
            continue;
          }

          if (!this.shouldExpandIntoPixel(sampleData, pixel, target, edgeThreshold, filledNeighbors, pass)) {
            continue;
          }

          writePixel(writeData, pixel, fill, alphaLocked);
          nextMask[pixel] = 1;
          changed = true;
        }
      }

      mask.set(nextMask);
    }

    return changed;
  }

  private shouldExpandIntoPixel(
    sampleData: Uint8ClampedArray,
    pixel: number,
    target: Rgba,
    edgeThreshold: number,
    filledNeighbors: number,
    pass: number,
  ) {
    const index = pixel * 4;
    const alpha = sampleData[index + 3];

    if (alpha === 0) {
      return true;
    }

    const distance = premultipliedDistance(sampleData, pixel, target);

    if (distance <= edgeThreshold) {
      return true;
    }

    const antiAliasAlpha = alpha > 0 && alpha < 245;
    const surroundedResidue = filledNeighbors >= (pass < 2 ? 3 : 5);

    return antiAliasAlpha || surroundedResidue;
  }

  private countFilledNeighbors(mask: Uint8Array, pixel: number, width: number) {
    return (
      mask[pixel - 1]
      + mask[pixel + 1]
      + mask[pixel - width]
      + mask[pixel + width]
      + mask[pixel - width - 1]
      + mask[pixel - width + 1]
      + mask[pixel + width - 1]
      + mask[pixel + width + 1]
    );
  }

  private createMergedSample(activeLayer: Layer) {
    const canvas = document.createElement('canvas');
    canvas.width = activeLayer.canvas.width;
    canvas.height = activeLayer.canvas.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      return activeLayer.context.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height).data;
    }

    for (const layer of this.context.layers.getLayers()) {
      if (!layer.visible) {
        continue;
      }

      context.save();
      context.globalAlpha = layer.opacity;
      context.translate(layer.transform.x, layer.transform.y);
      context.rotate(layer.transform.rotation);
      context.scale(layer.transform.scaleX, layer.transform.scaleY);
      context.drawImage(layer.canvas, 0, 0);
      context.restore();
    }

    return context.getImageData(0, 0, canvas.width, canvas.height).data;
  }

  private getThreshold() {
    const settings = this.context.getFillSettings();

    if (settings.pixelPerfect) {
      return Math.max(0, settings.tolerance) * 1.2;
    }

    return 8 + Math.max(0, settings.tolerance) * 3.6;
  }
}
