import { Container, Graphics } from 'pixi.js';
import { Layer } from './Layer';

export class LayerRenderer {
  readonly viewport = new Container();

  readonly layersRoot = new Container();

  readonly overlay = new Container();

  private readonly canvasFrame = new Graphics();

  constructor(stage: Container) {
    stage.addChild(this.viewport);
    this.viewport.addChild(this.canvasFrame);
    this.viewport.addChild(this.layersRoot);
    this.viewport.addChild(this.overlay);
    this.setCanvasFrame(1920, 1080);
  }

  setCanvasFrame(width: number, height: number) {
    this.canvasFrame.clear()
      .rect(0, 0, width, height)
      .fill({ color: 0xffffff, alpha: 0.035 })
      .rect(0, 0, width, height)
      .stroke({ color: 0xf5f7ff, alpha: 0.34, width: 2 })
      .rect(-8, -8, width + 16, height + 16)
      .stroke({ color: 0x000000, alpha: 0.35, width: 8 });
  }

  sync(layers: Layer[]) {
    for (const layer of layers) {
      if (layer.sprite.parent !== this.layersRoot) {
        this.layersRoot.addChild(layer.sprite);
      }

      this.layersRoot.setChildIndex(layer.sprite, layers.indexOf(layer));
      layer.applyDisplayState();
    }
  }

  setViewport(x: number, y: number, scale: number, rotation: number) {
    this.viewport.position.set(x, y);
    this.viewport.scale.set(scale);
    this.viewport.rotation = rotation;
  }

  destroy() {
    this.viewport.destroy({ children: true });
  }
}
