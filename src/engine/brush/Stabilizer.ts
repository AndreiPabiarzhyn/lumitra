import { BrushPoint } from './types';
import { clamp } from './BrushMath';

const MAX_BUFFER_SIZE = 36;

export class Stabilizer {
  private readonly buffer: BrushPoint[] = [];

  private outputPoint: BrushPoint | null = null;

  reset(point?: BrushPoint) {
    this.buffer.length = 0;
    this.outputPoint = point ?? null;

    if (point) {
      this.buffer.push(point);
    }
  }

  add(point: BrushPoint, strength: number, brushSize = 10): BrushPoint {
    const normalizedStrength = this.getEffectiveStrength(strength);

    if (normalizedStrength <= 0.01) {
      this.outputPoint = point;
      return point;
    }

    const bufferSize = Math.round(3 + normalizedStrength * (MAX_BUFFER_SIZE - 3));

    this.buffer.push(point);

    while (this.buffer.length > bufferSize) {
      this.buffer.shift();
    }

    const weighted = this.getWeightedPoint();

    if (!this.outputPoint) {
      this.outputPoint = weighted;
      return weighted;
    }

    const dx = weighted.x - this.outputPoint.x;
    const dy = weighted.y - this.outputPoint.y;
    const distance = Math.hypot(dx, dy);
    const radius = this.getLazyRadius(normalizedStrength, brushSize);

    if (distance <= 0.001) {
      return this.outputPoint;
    }

    const unitX = dx / distance;
    const unitY = dy / distance;
    const target = distance > radius
      ? {
          ...weighted,
          x: weighted.x - unitX * radius,
          y: weighted.y - unitY * radius,
        }
      : {
          ...weighted,
          x: this.outputPoint.x + dx * (0.018 + (1 - normalizedStrength) * 0.075),
          y: this.outputPoint.y + dy * (0.018 + (1 - normalizedStrength) * 0.075),
        };

    const follow = distance > radius
      ? clamp(0.74 - normalizedStrength * 0.6, 0.12, 0.74)
      : clamp(0.2 - normalizedStrength * 0.15, 0.035, 0.2);

    this.outputPoint = {
      x: this.outputPoint.x + (target.x - this.outputPoint.x) * follow,
      y: this.outputPoint.y + (target.y - this.outputPoint.y) * follow,
      pressure: target.pressure,
      time: target.time,
    };

    return this.outputPoint;
  }

  private getEffectiveStrength(strength: number) {
    const normalized = clamp(strength, 0, 1);

    return normalized <= 0.01 ? 0 : normalized ** 0.62;
  }

  private getLazyRadius(strength: number, brushSize: number) {
    const curved = strength ** 1.08;

    return curved * (18 + clamp(brushSize, 1, 160) * 0.82);
  }

  private getWeightedPoint(): BrushPoint {
    let x = 0;
    let y = 0;
    let pressure = 0;
    let time = 0;
    let totalWeight = 0;

    for (let index = 0; index < this.buffer.length; index += 1) {
      const point = this.buffer[index];
      const age = index / Math.max(1, this.buffer.length - 1);
      const weight = 0.2 + age ** (1.35 + this.buffer.length / MAX_BUFFER_SIZE) * 3.1;

      x += point.x * weight;
      y += point.y * weight;
      pressure += point.pressure * weight;
      time += point.time * weight;
      totalWeight += weight;
    }

    return {
      x: x / totalWeight,
      y: y / totalWeight,
      pressure: pressure / totalWeight,
      time: time / totalWeight,
    };
  }
}
