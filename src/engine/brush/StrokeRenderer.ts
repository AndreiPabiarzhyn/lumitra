import { BLEND_MODES, Container, Graphics } from 'pixi.js';
import {
  createBrushSample,
  forEachInterpolatedSample,
  hexToNumber,
} from './BrushMath';
import { BrushPoint, BrushSample, BrushSettings } from './types';

export class StrokeRenderer {
  private stroke: Graphics | null = null;

  private lastPoint: BrushPoint | null = null;

  private color = 0xffffff;

  constructor(private target: Container, private blendMode: BLEND_MODES = 'normal') {}

  setTarget(target: Container) {
    this.target = target;
  }

  setBlendMode(blendMode: BLEND_MODES) {
    this.blendMode = blendMode;
  }

  begin(point: BrushPoint, settings: BrushSettings) {
    this.stroke = new Graphics();
    this.stroke.alpha = settings.opacity;
    this.stroke.blendMode = this.blendMode;
    this.color = hexToNumber(settings.color);
    this.target.addChild(this.stroke);
    this.lastPoint = point;
    this.drawDab(createBrushSample(point, { ...settings, opacity: 1 }));
  }

  render(point: BrushPoint, settings: BrushSettings) {
    if (!this.stroke || !this.lastPoint) {
      return;
    }

    this.stroke.alpha = settings.opacity;
    this.color = hexToNumber(settings.color);

    forEachInterpolatedSample(
      this.lastPoint,
      point,
      { ...settings, opacity: 1 },
      (sample) => this.drawDab(sample),
    );

    this.lastPoint = point;
  }

  renderStraightLine(from: BrushPoint, to: BrushPoint, settings: BrushSettings) {
    if (!this.stroke) {
      return;
    }

    this.stroke.clear();
    this.stroke.alpha = settings.opacity;
    this.color = hexToNumber(settings.color);
    this.drawDab(createBrushSample(from, { ...settings, opacity: 1 }));

    forEachInterpolatedSample(
      from,
      to,
      { ...settings, opacity: 1 },
      (sample) => this.drawDab(sample),
    );

    this.lastPoint = to;
  }

  end() {
    this.stroke = null;
    this.lastPoint = null;
  }

  private drawDab(sample: BrushSample) {
    if (!this.stroke) {
      return;
    }

    this.stroke
      .circle(sample.x, sample.y, sample.radius)
      .fill({
        color: this.color,
        alpha: sample.alpha,
      });
  }
}
