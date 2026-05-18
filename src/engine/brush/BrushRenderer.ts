import { clamp } from './BrushMath';
import { BrushSettings } from './BrushSettings';
import { grainAt, jitterPoint } from './BrushTextures';
import { BrushSample } from './types';

const withAlpha = (color: string, alphaHex: string) => `${color}${alphaHex}`;

export class BrushRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    if (settings.presetId === 'pixel') {
      this.drawPixel(ctx, sample, settings, mode);
      return;
    }

    if (settings.presetId === 'airbrush') {
      this.drawAirbrush(ctx, sample, settings, mode);
      return;
    }

    if (settings.presetId === 'pencil') {
      this.drawPencil(ctx, sample, settings, mode);
      return;
    }

    if (settings.presetId === 'sketchy') {
      this.drawSketchy(ctx, sample, settings, mode);
      return;
    }

    if (settings.presetId === 'marker') {
      this.drawMarker(ctx, sample, settings, mode);
      return;
    }

    if (settings.presetId === 'ink') {
      this.drawInk(ctx, sample, settings, mode);
      return;
    }

    if (settings.presetId === 'calligraphy') {
      this.drawCalligraphy(ctx, sample, settings, mode);
      return;
    }

    this.drawRound(ctx, sample, settings, mode, settings.softness, settings.opacity);
  }

  private drawRound(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
    softness: number,
    opacity: number,
  ) {
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = clamp(opacity * sample.alpha, 0.01, 1);

    if (softness > 0 && mode === 'source-over') {
      const gradient = ctx.createRadialGradient(sample.x, sample.y, 0, sample.x, sample.y, sample.radius);
      gradient.addColorStop(0, settings.color);
      gradient.addColorStop(Math.max(0.04, 1 - softness), settings.color);
      gradient.addColorStop(1, withAlpha(settings.color, '00'));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = settings.color;
    }

    ctx.beginPath();
    ctx.arc(sample.x, sample.y, sample.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPixel(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    const side = Math.max(1, Math.round(settings.size));
    const x = Math.round(sample.x - side / 2);
    const y = Math.round(sample.y - side / 2);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = settings.opacity;
    ctx.fillStyle = settings.color;
    ctx.fillRect(x, y, side, side);
    ctx.restore();
  }

  private drawPencil(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    const point = jitterPoint(sample, settings.size * 0.55, 4);
    const grain = grainAt(sample, 11);

    this.drawRound(ctx, {
      ...sample,
      x: point.x,
      y: point.y,
      radius: Math.max(0.45, sample.radius * (0.38 + grain * 0.58)),
      alpha: sample.alpha * (0.28 + grain * 0.72),
    }, settings, mode, 0, settings.opacity * 0.82);

    if (grain > 0.52) {
      const scratch = jitterPoint(sample, settings.size * 1.2, 14);
      this.drawRound(ctx, {
        ...sample,
        x: scratch.x,
        y: scratch.y,
        radius: Math.max(0.35, sample.radius * 0.26),
        alpha: sample.alpha * 0.42,
      }, settings, mode, 0, settings.opacity * 0.55);
    }
  }

  private drawMarker(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    this.drawRound(ctx, sample, settings, mode, 0.28, settings.opacity * 0.72);
    this.drawRound(ctx, {
      ...sample,
      radius: sample.radius * 0.74,
      alpha: sample.alpha * 0.56,
    }, settings, mode, 0.12, settings.opacity * 0.52);
  }

  private drawSketchy(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    const coreGrain = 0.72 + grainAt(sample, 41) * 0.22;

    this.drawRound(ctx, {
      ...sample,
      radius: sample.radius * coreGrain,
      alpha: sample.alpha * 0.82,
    }, settings, mode, 0.22, settings.opacity);

    const fringeDots = Math.max(10, Math.round(settings.size * 0.62));

    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = settings.color;

    for (let index = 0; index < fringeDots; index += 1) {
      const seedPoint = {
        ...sample,
        x: sample.x + index * 5.31,
        y: sample.y - index * 3.77,
      };
      const grain = grainAt(seedPoint, 57);

      if (grain < 0.34) {
        continue;
      }

      const angle = grainAt(seedPoint, 61) * Math.PI * 2;
      const distance = sample.radius * (0.72 + grainAt(seedPoint, 67) * 0.54);
      const dotRadius = Math.max(0.65, sample.radius * (0.06 + grainAt(seedPoint, 73) * 0.16));
      ctx.globalAlpha = clamp(settings.opacity * sample.alpha * (0.12 + grain * 0.2), 0.02, 0.26);
      ctx.beginPath();
      ctx.arc(sample.x + Math.cos(angle) * distance, sample.y + Math.sin(angle) * distance, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawAirbrush(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    const flow = clamp(settings.flow ?? 0.12, 0.01, 1);
    const density = clamp(settings.density ?? 0.78, 0.05, 1);
    const buildup = clamp(settings.buildup ?? 0.62, 0.05, 1);
    const radius = sample.radius * (1.45 + settings.softness * 0.35);
    const alpha = clamp(settings.opacity * sample.alpha * flow, 0.002, 0.18);

    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(sample.x, sample.y, 0, sample.x, sample.y, radius);
    gradient.addColorStop(0, withAlpha(settings.color, 'f2'));
    gradient.addColorStop(0.16, withAlpha(settings.color, 'a6'));
    gradient.addColorStop(0.36, withAlpha(settings.color, '52'));
    gradient.addColorStop(0.68, withAlpha(settings.color, '16'));
    gradient.addColorStop(1, withAlpha(settings.color, '00'));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sample.x, sample.y, radius, 0, Math.PI * 2);
    ctx.fill();

    const mistLayers = Math.max(3, Math.round(3 + density * 4));
    for (let index = 0; index < mistLayers; index += 1) {
      const seed = { ...sample, x: sample.x + index * 23.13, y: sample.y - index * 14.71 };
      const drift = (grainAt(seed, 32) - 0.5) * sample.radius * 0.1 * (settings.scatter ?? 0.08);
      const angle = grainAt(seed, 39) * Math.PI * 2;
      const layerRadius = radius * (0.48 + index * 0.09);
      const layerAlpha = alpha * buildup * (0.12 - index * 0.011);
      const layerGradient = ctx.createRadialGradient(
        sample.x + Math.cos(angle) * drift,
        sample.y + Math.sin(angle) * drift,
        0,
        sample.x + Math.cos(angle) * drift,
        sample.y + Math.sin(angle) * drift,
        layerRadius,
      );

      layerGradient.addColorStop(0, withAlpha(settings.color, '88'));
      layerGradient.addColorStop(0.5, withAlpha(settings.color, '22'));
      layerGradient.addColorStop(1, withAlpha(settings.color, '00'));
      ctx.globalAlpha = clamp(layerAlpha, 0.001, 0.04);
      ctx.fillStyle = layerGradient;
      ctx.beginPath();
      ctx.arc(sample.x + Math.cos(angle) * drift, sample.y + Math.sin(angle) * drift, layerRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawInk(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    const taper = this.inkTaper(sample);
    const pressure = clamp(sample.pressure || 1, 0.18, 1);
    const endTaper = sample.endTaper ?? 1;
    const radius = Math.max(0.32, sample.radius * taper * endTaper * (0.88 + pressure * 0.14));

    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = clamp(settings.opacity * sample.alpha, 0.04, 1);
    ctx.fillStyle = settings.color;

    ctx.beginPath();
    ctx.arc(sample.x, sample.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (sample.angle !== undefined && radius > 0.75) {
      const pull = radius * 0.56;
      ctx.beginPath();
      ctx.ellipse(
        sample.x - Math.cos(sample.angle) * pull * 0.32,
        sample.y - Math.sin(sample.angle) * pull * 0.32,
        radius * 1.04,
        radius * 0.9,
        sample.angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCalligraphy(
    ctx: CanvasRenderingContext2D,
    sample: BrushSample,
    settings: BrushSettings,
    mode: GlobalCompositeOperation,
  ) {
    const pressure = clamp(sample.pressure || 1, 0.16, 1);
    const nibAngle = ((settings.nibAngle ?? -38) * Math.PI) / 180;
    const movementAngle = sample.angle ?? Math.PI / 2;
    const widthVariation = clamp(settings.widthVariation ?? 0.82, 0, 1);
    const taper = clamp(settings.taper ?? 0.38, 0, 1);
    const inkDensity = clamp(settings.inkDensity ?? 0.96, 0.1, 1);
    const verticalWeight = Math.abs(Math.sin(movementAngle));
    const directionWidth = 0.28 + verticalWeight * widthVariation;
    const distanceIn = sample.strokeDistance ?? 0;
    const startTaper = 1 - taper + clamp(distanceIn / Math.max(8, settings.size * 0.58), 0, 1) * taper;
    const texture = 0.965 + grainAt(sample, 94) * 0.045;
    const nibWidth = Math.max(1.1, settings.size * (0.07 + directionWidth * 0.2) * pressure * startTaper);
    const nibHeight = Math.max(2.5, settings.size * (0.42 + directionWidth * 0.5) * pressure * startTaper);
    const rotationFollow = (movementAngle - nibAngle) * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = clamp(settings.opacity * sample.alpha * inkDensity * texture, 0.02, 1);
    ctx.fillStyle = settings.color;
    ctx.beginPath();
    ctx.ellipse(sample.x, sample.y, nibWidth, nibHeight, nibAngle + rotationFollow, 0, Math.PI * 2);
    ctx.fill();

    if (nibHeight > 4) {
      ctx.globalAlpha = clamp(settings.opacity * sample.alpha * 0.18, 0.02, 0.18);
      ctx.beginPath();
      ctx.ellipse(
        sample.x - Math.cos(nibAngle) * nibWidth * 0.2,
        sample.y - Math.sin(nibAngle) * nibWidth * 0.2,
        nibWidth * 0.72,
        nibHeight * 0.82,
        nibAngle + rotationFollow,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  private inkTaper(sample: BrushSample) {
    const distanceIn = sample.strokeDistance ?? 0;
    const startTaper = clamp(distanceIn / Math.max(6, sample.radius * 4.2), 0.22, 1);
    const pressureCurve = 0.72 + clamp(sample.pressure || 1, 0.05, 1) * 0.34;

    return clamp(startTaper * pressureCurve, 0.22, 1.04);
  }
}
