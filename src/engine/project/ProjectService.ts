import { BrushSettings } from '../brush/types';
import { LayerManager } from '../layers/LayerManager';
import { TextManager } from '../text/TextManager';
import { Viewport } from '../viewport/types';
import { GradientState } from '../../app/gradientStore';
import { LumitraProject } from './types';

const serializeBrush = (brush: BrushSettings): BrushSettings => ({
  color: brush.color,
  size: brush.size,
  opacity: brush.opacity,
  stabilizer: brush.stabilizer,
  spacing: brush.spacing,
  softness: brush.softness,
  flow: brush.flow,
  density: brush.density,
  buildup: brush.buildup,
  scatter: brush.scatter,
  nibAngle: brush.nibAngle,
  widthVariation: brush.widthVariation,
  taper: brush.taper,
  inkDensity: brush.inkDensity,
  presetId: brush.presetId,
});

export class ProjectService {
  constructor(private readonly layers: LayerManager, private readonly text: TextManager) {}

  createProject(
    activeLayerId: string,
    brush: BrushSettings,
    gradient: GradientState,
    viewport: Viewport,
  ): LumitraProject {
    const now = new Date().toISOString();
    const snapshots = this.layers.toSnapshots();
    const size = this.layers.getSize();

    return {
      format: 'lumitra-project',
      version: 1,
      metadata: {
        name: 'Untitled Lumitra Project',
        createdAt: now,
        updatedAt: now,
        width: size.width,
        height: size.height,
      },
      viewport,
      brush: serializeBrush(brush),
      gradient: {
        type: gradient.type,
        opacity: gradient.opacity,
        blendAmount: gradient.blendAmount,
        reverse: gradient.reverse,
        blendMode: gradient.blendMode,
        stops: gradient.stops.map((stop) => ({ ...stop })),
      },
      colors: {
        active: brush.color,
      },
      activeLayerId,
      layers: snapshots,
      textObjects: this.text.toJSON(),
    };
  }

  exportPngDataUrl(scale = 2): string | null {
    const canvas = this.createMergedCanvas(scale);

    return canvas?.toDataURL('image/png') ?? null;
  }

  async exportPngBlob(scale = 2): Promise<Blob | null> {
    const canvas = this.createMergedCanvas(scale);

    if (!canvas) {
      return null;
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  private createMergedCanvas(scale = 2): HTMLCanvasElement | null {
    const layers = this.layers.getLayers();
    const base = layers[0];

    if (!base) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = base.canvas.width * scale;
    canvas.height = base.canvas.height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    ctx.scale(scale, scale);

    for (const layer of layers) {
      if (!layer.visible) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(layer.transform.x, layer.transform.y);
      ctx.rotate(layer.transform.rotation);
      ctx.scale(layer.transform.scaleX, layer.transform.scaleY);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }

    return canvas;
  }
}
