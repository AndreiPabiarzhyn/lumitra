import { Tool, ToolContext, ToolPointer } from './Tool';

const toHex = (value: number): string => value.toString(16).padStart(2, '0');

export class EyedropperTool implements Tool {
  readonly id = 'eyedropper';

  readonly cursor = 'copy';

  constructor(private readonly context: ToolContext) {}

  onPointerDown(point: ToolPointer) {
    const layers = [...this.context.layers.getLayers()].reverse();

    for (const layer of layers) {
      if (!layer.visible) {
        continue;
      }

      const localPoint = layer.worldToLocal(point);
      const x = Math.floor(localPoint.x);
      const y = Math.floor(localPoint.y);

      if (x < 0 || y < 0 || x >= layer.canvas.width || y >= layer.canvas.height) {
        continue;
      }

      const pixel = layer.context.getImageData(x, y, 1, 1).data;

      if (pixel[3] > 0) {
        this.context.setBrushColor(`#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`);
        return;
      }
    }
  }
}
