import { Tool, ToolContext, ToolPointer } from './Tool';

export class HandTool implements Tool {
  readonly id = 'hand';

  readonly cursor = 'grab';

  private last: ToolPointer | null = null;

  constructor(private readonly context: ToolContext) {}

  onPointerDown(point: ToolPointer) {
    this.last = point;
  }

  onPointerMove(point: ToolPointer) {
    if (!this.last) {
      return;
    }

    this.context.viewport.pan(point.screenX - this.last.screenX, point.screenY - this.last.screenY);
    this.last = point;
  }

  onPointerUp() {
    this.last = null;
  }

  onCancel() {
    this.last = null;
  }
}
