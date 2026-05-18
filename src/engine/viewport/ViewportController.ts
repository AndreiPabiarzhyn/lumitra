import { Container } from 'pixi.js';
import { Viewport } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class ViewportController {
  private state: Viewport;

  constructor(
    private readonly target: Container,
    initial: Viewport,
    private readonly onChange: (state: Viewport) => void,
  ) {
    this.state = initial;
    this.apply();
  }

  getState(): Viewport {
    return { ...this.state };
  }

  setState(state: Viewport) {
    this.state = {
      ...state,
      scale: clamp(state.scale, 0.1, 8),
    };
    this.apply();
  }

  screenToWorld(x: number, y: number) {
    return {
      x: (x - this.state.x) / this.state.scale,
      y: (y - this.state.y) / this.state.scale,
    };
  }

  pan(dx: number, dy: number) {
    this.state.x += dx;
    this.state.y += dy;
    this.apply();
  }

  zoomAt(screenX: number, screenY: number, delta: number) {
    const before = this.screenToWorld(screenX, screenY);
    const nextScale = clamp(this.state.scale * (delta > 0 ? 0.9 : 1.1), 0.1, 8);

    this.state.scale = nextScale;
    this.state.x = screenX - before.x * nextScale;
    this.state.y = screenY - before.y * nextScale;
    this.apply();
  }

  private apply() {
    this.target.position.set(this.state.x, this.state.y);
    this.target.scale.set(this.state.scale);
    this.target.rotation = this.state.rotation;
    this.onChange(this.getState());
  }
}
