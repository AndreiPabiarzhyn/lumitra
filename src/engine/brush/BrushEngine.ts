import { clamp, createBrushSample, distance, forEachInterpolatedSample, getBrushSpacing } from './BrushMath';
import { BrushRenderer } from './BrushRenderer';
import { BrushSettings } from './BrushSettings';
import { BrushPoint, BrushSample } from './types';

export class BrushEngine {
  private lastPoint: BrushPoint | null = null;
  private strokeDistance = 0;
  private strokeIndex = 0;
  private readonly inkBuffer: BrushSample[] = [];

  private readonly renderer = new BrushRenderer();

  begin(ctx: CanvasRenderingContext2D, point: BrushPoint, settings: BrushSettings, mode: GlobalCompositeOperation) {
    this.lastPoint = point;
    this.strokeDistance = 0;
    this.strokeIndex = 0;
    this.inkBuffer.length = 0;

    const sample = {
      ...createBrushSample(point, settings),
      strokeDistance: this.strokeDistance,
      strokeIndex: this.strokeIndex,
    };

    if (settings.presetId === 'ink') {
      this.queueInkSample(ctx, sample, settings, mode);
      return;
    }

    this.renderer.draw(ctx, sample, settings, mode);
  }

  move(ctx: CanvasRenderingContext2D, point: BrushPoint, settings: BrushSettings, mode: GlobalCompositeOperation) {
    if (!this.lastPoint) {
      this.begin(ctx, point, settings, mode);
      return;
    }

    if (distance(this.lastPoint, point) < getBrushSpacing(settings) * 0.45) {
      return;
    }

    const segmentDistance = distance(this.lastPoint, point);
    const angle = Math.atan2(point.y - this.lastPoint.y, point.x - this.lastPoint.x);

    forEachInterpolatedSample(this.lastPoint, point, settings, (sample) => {
      this.strokeIndex += 1;
      this.strokeDistance += segmentDistance / Math.max(1, Math.ceil(segmentDistance / getBrushSpacing(settings)));
      const strokeSample = {
        ...sample,
        angle,
        strokeDistance: this.strokeDistance,
        strokeIndex: this.strokeIndex,
      };

      if (settings.presetId === 'ink') {
        this.queueInkSample(ctx, strokeSample, settings, mode);
        return;
      }

      this.renderer.draw(ctx, strokeSample, settings, mode);
    });
    this.lastPoint = point;
  }

  end(ctx?: CanvasRenderingContext2D, settings?: BrushSettings, mode?: GlobalCompositeOperation) {
    if (ctx && settings && mode && settings.presetId === 'ink') {
      this.flushInkBuffer(ctx, settings, mode);
    } else {
      this.inkBuffer.length = 0;
    }

    this.lastPoint = null;
    this.strokeDistance = 0;
    this.strokeIndex = 0;
  }

  private queueInkSample(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    this.inkBuffer.push(sample);

    if (this.inkBuffer.length <= 5) {
      return;
    }

    const next = this.inkBuffer.shift();
    if (next) {
      this.renderer.draw(ctx, { ...next, endTaper: 1 }, settings, mode);
    }
  }

  private flushInkBuffer(ctx: CanvasRenderingContext2D, settings: BrushSettings, mode: GlobalCompositeOperation) {
    const total = this.inkBuffer.length;

    this.inkBuffer.forEach((sample, index) => {
      const remaining = total - index - 1;
      const endTaper = total <= 1 ? 0.72 : clamp(remaining / Math.max(1, total - 1), 0.2, 1);
      this.renderer.draw(ctx, { ...sample, endTaper }, settings, mode);
    });

    this.inkBuffer.length = 0;
  }
}
