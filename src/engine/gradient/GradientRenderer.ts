import { GradientStop } from '../../app/gradientStore';
import { GradientObject } from './GradientTypes';

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const stopColor = (stop: GradientStop, opacity: number) => {
  const rgb = hexToRgb(stop.color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${stop.opacity * opacity})`;
};

export class GradientRenderer {
  render(ctx: CanvasRenderingContext2D, object: GradientObject, alphaLocked = false) {
    const gradient = this.createCanvasGradient(ctx, object);
    const stops = object.reverse
      ? object.stops.map((stop) => ({ ...stop, position: 1 - stop.position })).sort((a, b) => a.position - b.position)
      : object.stops.slice().sort((a, b) => a.position - b.position);

    stops.forEach((stop) => gradient.addColorStop(Math.max(0, Math.min(1, stop.position)), stopColor(stop, object.opacity)));

    ctx.save();
    ctx.globalAlpha = object.blendAmount;
    ctx.globalCompositeOperation = alphaLocked ? 'source-atop' : this.toComposite(object.blendMode);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  private createCanvasGradient(ctx: CanvasRenderingContext2D, object: GradientObject) {
    if (object.type === 'radial' || object.type === 'diamond') {
      const radius = Math.max(1, Math.hypot(object.endX - object.startX, object.endY - object.startY));
      return ctx.createRadialGradient(object.startX, object.startY, 0, object.startX, object.startY, radius);
    }

    if (object.type === 'angle') {
      return ctx.createConicGradient(Math.atan2(object.endY - object.startY, object.endX - object.startX), object.startX, object.startY);
    }

    if (object.type === 'reflected') {
      const dx = object.endX - object.startX;
      const dy = object.endY - object.startY;
      return ctx.createLinearGradient(object.startX - dx, object.startY - dy, object.endX, object.endY);
    }

    return ctx.createLinearGradient(object.startX, object.startY, object.endX, object.endY);
  }

  private toComposite(mode: string): GlobalCompositeOperation {
    if (mode === 'multiply' || mode === 'screen' || mode === 'overlay' || mode === 'soft-light') {
      return mode;
    }
    return 'source-over';
  }
}
