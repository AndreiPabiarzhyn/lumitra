import { BrushPoint } from './types';
import { clamp } from './BrushMath';

const MAX_BUFFER_SIZE = 14;

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

  add(point: BrushPoint, strength: number): BrushPoint {
    const normalizedStrength = clamp(strength, 0, 0.85);

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

    const follow = 0.28 + (1 - normalizedStrength) * 0.52;

    this.outputPoint = {
      x: this.outputPoint.x + (weighted.x - this.outputPoint.x) * follow,
      y: this.outputPoint.y + (weighted.y - this.outputPoint.y) * follow,
      pressure: weighted.pressure,
      time: weighted.time,
    };

    return this.outputPoint;
  }

  private getWeightedPoint(): BrushPoint {
    let x = 0;
    let y = 0;
    let pressure = 0;
    let time = 0;
    let totalWeight = 0;

    for (let index = 0; index < this.buffer.length; index += 1) {
      const point = this.buffer[index];
      const weight = (index + 1) ** 1.65;

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
